'use client';

import { useState, useCallback, useRef } from 'react';

export interface DifyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  references?: ReferenceItem[];
  files?: MessageFile[];
  audioUrl?: string;
  difyMessageId?: string;
  feedback?: 'like' | 'dislike' | null;
}

export interface ReferenceItem {
  document_name?: string;
  dataset_name?: string;
  score?: number;
  content?: string;
}

export interface MessageFile {
  type?: string;
  url?: string;
}

// 工作流节点状态
export interface WorkflowNode {
  id: string;
  nodeId: string;
  nodeType: string;
  title: string;
  status: 'running' | 'succeeded' | 'failed' | 'stopped';
  elapsedTime?: number;
}

// 工作流状态
export interface WorkflowStatus {
  isRunning: boolean;
  currentNode?: string;
  nodes: WorkflowNode[];
  startedAt?: Date;
}

export interface ToolEvent {
  id: string;
  tool?: string;
  thought?: string;
  tool_input?: any;
  observation?: any;
  label?: string;
  status?: string;
  error?: any;
  data?: any;
  createdAt?: Date;
}

function extractFileUrlsFromToolResponse(text: string): MessageFile[] {
  if (!text) return [];
  const urls = new Set<string>();
  // Match Dify file URLs including any query parameters (?timestamp=...&nonce=...&sign=...)
  // Patterns: file-preview, image-preview, and general /files/ paths
  const pattern =
    /https?:\/\/[^\s"'<>\\)}\]]+(?:file-preview|image-preview|\/files\/[^\s"'<>\\)}\]]*)(?:\?[^\s"'<>\\)}\]]+)?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match[0]) urls.add(match[0]);
  }
  return Array.from(urls).map((url) => ({ type: 'image', url }));
}

function proxyFileUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/api/dify/file')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/dify/file?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function rewriteFileUrlsInText(text: string): string {
  if (!text) return text;
  // Match Dify file URLs: file-preview, image-preview, and general /files/ paths
  return text.replace(
    /https?:\/\/[^\s"'\\)]+(?:file-preview|image-preview|\/files\/[^\s"'\\)]*)/gi,
    (match) => proxyFileUrl(match) || match
  );
}

function extractReferencesFromToolResponse(text: string): ReferenceItem[] {
  if (!text) return [];
  const refs: ReferenceItem[] = [];
  const docPattern = /document_name['"]\s*:\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = docPattern.exec(text)) !== null) {
    const document_name = match[1];
    const slice = text.slice(match.index, match.index + 300);
    const datasetMatch = /dataset_name['"]\s*:\s*['"]([^'"]+)['"]/.exec(slice);
    const scoreMatch = /score['"]?\s*:\s*([0-9.]+)/.exec(slice);
    const contentMatch = /content['"]\s*:\s*['"]([^'"]+)['"]/.exec(slice);
    refs.push({
      document_name,
      dataset_name: datasetMatch?.[1],
      score: scoreMatch ? Number(scoreMatch[1]) : undefined,
      content: contentMatch?.[1] ? rewriteFileUrlsInText(contentMatch[1]) : undefined,
    });
  }

  const unique = new Map<string, ReferenceItem>();
  for (const ref of refs) {
    const key = ref.document_name || ref.dataset_name || JSON.stringify(ref);
    if (!unique.has(key)) unique.set(key, ref);
  }

  return Array.from(unique.values());
}

export interface UseDifyChatOptions {
  chatId: string;
  initialMessages?: DifyMessage[];
  onError?: (error: Error) => void;
}

export interface UseDifyChatReturn {
  messages: DifyMessage[];
  setMessages: React.Dispatch<React.SetStateAction<DifyMessage[]>>;
  sendMessage: (text: string, options?: { rating?: string }) => Promise<void>;
  sendFeedback: (messageId: string, rating: 'like' | 'dislike' | null) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  stop: () => void;
  workflowStatus: WorkflowStatus;
  toolEvents: ToolEvent[];
}

export function useDifyChat({
  chatId,
  initialMessages = [],
  onError,
}: UseDifyChatOptions): UseDifyChatReturn {
  const [messages, setMessages] = useState<DifyMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    isRunning: false,
    nodes: [],
  });
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 用于批量更新的缓冲区
  const contentBufferRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);
  const assistantIdRef = useRef<string>('');
  const referencesRef = useRef<ReferenceItem[]>([]);
  const filesRef = useRef<MessageFile[]>([]);
  const ttsAudioRef = useRef<string>('');
  const difyMessageIdRef = useRef<string>('');
  const ignoreNextDeltaRef = useRef<boolean>(false);

  // <think> 标签流式解析状态
  const isThinkingRef = useRef<boolean>(false);
  const thinkingChunkRef = useRef<string>('');   // 当前正在流式接收的思考内容
  const partialTagRef = useRef<string>('');       // 跨 chunk 的不完整标签缓冲
  const thinkingEventsRef = useRef<ToolEvent[]>([]); // 已完成的思考片段

  // 流式解析 <think>...</think> 标签，分离思考内容和正式回答
  const processAnswerChunk = useCallback((chunk: string) => {
    let remaining = partialTagRef.current + chunk;
    partialTagRef.current = '';

    while (remaining.length > 0) {
      if (isThinkingRef.current) {
        const closeIdx = remaining.indexOf('</think>');
        if (closeIdx === -1) {
          let partialLen = 0;
          const closeTag = '</think>';
          for (let i = closeTag.length - 1; i >= 1; i--) {
            if (remaining.endsWith(closeTag.slice(0, i))) { partialLen = i; break; }
          }
          if (partialLen > 0) {
            thinkingChunkRef.current += remaining.slice(0, remaining.length - partialLen);
            partialTagRef.current = remaining.slice(remaining.length - partialLen);
          } else {
            thinkingChunkRef.current += remaining;
          }
          const liveThought = thinkingChunkRef.current.trim();
          if (liveThought) {
            const events = thinkingEventsRef.current;
            const updated: ToolEvent[] = events.length > 0 && events[events.length - 1].id === 'live-thought'
              ? [...events.slice(0, -1), { ...events[events.length - 1], thought: liveThought }]
              : [...events, { id: 'live-thought', thought: liveThought, createdAt: new Date() }];
            thinkingEventsRef.current = updated;
            setToolEvents([...updated]);
          }
          remaining = '';
        } else {
          thinkingChunkRef.current += remaining.slice(0, closeIdx);
          const thought = thinkingChunkRef.current.trim();
          if (thought) {
            const completedEvent: ToolEvent = { id: `think-${Date.now()}`, thought, createdAt: new Date() };
            thinkingEventsRef.current = [...thinkingEventsRef.current.filter(e => e.id !== 'live-thought'), completedEvent];
            setToolEvents([...thinkingEventsRef.current]);
          }
          thinkingChunkRef.current = '';
          isThinkingRef.current = false;
          remaining = remaining.slice(closeIdx + 8);
        }
      } else {
        const openIdx = remaining.indexOf('<think>');
        if (openIdx === -1) {
          let partialLen = 0;
          const openTag = '<think>';
          for (let i = openTag.length - 1; i >= 1; i--) {
            if (remaining.endsWith(openTag.slice(0, i))) { partialLen = i; break; }
          }
          if (partialLen > 0) {
            contentBufferRef.current += remaining.slice(0, remaining.length - partialLen);
            partialTagRef.current = remaining.slice(remaining.length - partialLen);
          } else {
            contentBufferRef.current += remaining;
          }
          remaining = '';
        } else {
          contentBufferRef.current += remaining.slice(0, openIdx);
          isThinkingRef.current = true;
          remaining = remaining.slice(openIdx + 7);
        }
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setIsLoading(false);
    setWorkflowStatus({ isRunning: false, nodes: [] });
    setToolEvents([]);
  }, []);

  // 批量更新消息内容，使用 requestAnimationFrame 减少跳动
  const flushContent = useCallback(() => {
    const content = contentBufferRef.current;
    const assistantId = assistantIdRef.current;
    
    if (content && assistantId) {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        // NOTE: 不再对 content 做 URL 重写，保持原始绝对 URL。
        // 相对代理 URL 会被 Streamdown 的 rehype-harden 插件阻止。
        // 图片 URL 的代理由 Response 组件的 urlTransform 在渲染阶段处理。
        const normalizedContent = content;
        if (lastMessage?.id === assistantId) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: normalizedContent,
              references: referencesRef.current,
              files: filesRef.current,
              audioUrl: ttsAudioRef.current || lastMessage.audioUrl,
              difyMessageId: difyMessageIdRef.current || lastMessage.difyMessageId,
            },
          ];
        } else {
          return [
            ...prev,
            {
              id: assistantId,
              role: 'assistant' as const,
              content: normalizedContent,
              references: referencesRef.current,
              files: filesRef.current,
              audioUrl: ttsAudioRef.current || undefined,
              difyMessageId: difyMessageIdRef.current || undefined,
              createdAt: new Date(),
            },
          ];
        }
      });
    }
    rafIdRef.current = null;
  }, []);

  // 调度下一次更新
  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushContent);
    }
  }, [flushContent]);

  const sendMessage = useCallback(
    async (text: string, options?: { rating?: string }) => {
      if (!text.trim()) return;

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Reset state
      contentBufferRef.current = '';
      referencesRef.current = [];
      filesRef.current = [];
      ttsAudioRef.current = '';
      difyMessageIdRef.current = '';
      // Reset think tag parsing state
      isThinkingRef.current = false;
      thinkingChunkRef.current = '';
      partialTagRef.current = '';
      thinkingEventsRef.current = [];
      const assistantId = `assistant-${Date.now()}`;
      assistantIdRef.current = assistantId;

      // 1. Add user message immediately
      const userMessage: DifyMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setWorkflowStatus({ isRunning: true, nodes: [], startedAt: new Date() });
      setToolEvents([]);

      try {
        // 2. Call API
        const response = await fetch('/api/dify/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            query: text,
            rating: options?.rating || 'Catalog工业',
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let pendingEventName: string | null = null;

        // 3. Stream read and update UI
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE: data: {...}\n\n
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              pendingEventName = line.slice(7).trim();
              continue;
            }

            if (!line.startsWith('data: ')) {
              continue;
            }

            const dataStr = line.slice(6).trim();
            if (!dataStr) {
              continue;
            }

            if (dataStr === '[DONE]') {
              if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
              }
              flushContent();
              break;
            }

            try {
              const data = JSON.parse(dataStr);

              if (pendingEventName) {
                if (pendingEventName === 'workflow') {
                  if (data.status === 'started') {
                    setWorkflowStatus((prev) => ({
                      ...prev,
                      isRunning: true,
                      startedAt: new Date(),
                    }));
                  }
                  if (data.status === 'finished') {
                    setWorkflowStatus((prev) => ({
                      ...prev,
                      isRunning: false,
                      currentNode: undefined,
                    }));
                  }
                }

                if (pendingEventName === 'node') {
                  if (data.status === 'started') {
                    const node: WorkflowNode = {
                      id: data.node_id || '',
                      nodeId: data.node_id || '',
                      nodeType: data.node_type || '',
                      title: data.title || '',
                      status: 'running',
                    };
                    setWorkflowStatus((prev) => ({
                      ...prev,
                      currentNode: node.title,
                      nodes: [...prev.nodes.filter(n => n.nodeId !== node.nodeId), node],
                    }));
                  }

                  if (data.status === 'finished') {
                    const nodeId = data.node_id || '';
                    const status = data.status || 'succeeded';
                    const elapsedTime = data.elapsed_ms ?? data.elapsed_time;
                    setWorkflowStatus((prev) => ({
                      ...prev,
                      nodes: prev.nodes.map(n =>
                        n.nodeId === nodeId
                          ? { ...n, status, elapsedTime }
                          : n
                      ),
                    }));
                  }
                }

                if (pendingEventName === 'file') {
                  if (data.url) {
                    filesRef.current = [
                      ...filesRef.current,
                      { type: data.type || undefined, url: proxyFileUrl(data.url) },
                    ];
                  }
                }

                if (pendingEventName === 'tts') {
                  if (typeof data.audio === 'string') {
                    ttsAudioRef.current += data.audio;
                  }
                }

                if (pendingEventName === 'tts_end') {
                  if (ttsAudioRef.current) {
                    const audioUrl = `data:audio/mp3;base64,${ttsAudioRef.current}`;
                    ttsAudioRef.current = audioUrl;
                  }
                }

                if (pendingEventName === 'replace') {
                  if (typeof data.content === 'string') {
                    contentBufferRef.current = data.content;
                    ignoreNextDeltaRef.current = true;
                    scheduleUpdate();
                  }
                }

                if (pendingEventName === 'tool') {
                  if (typeof data?.data?.output?.tool_response === 'string') {
                    const toolResponse = data.data.output.tool_response;
                    const refs = extractReferencesFromToolResponse(toolResponse);
                    const files = extractFileUrlsFromToolResponse(toolResponse).map((file) => ({
                      ...file,
                      url: proxyFileUrl(file.url),
                    }));
                    if (refs.length) {
                      referencesRef.current = [
                        ...referencesRef.current,
                        ...refs.filter(
                          (ref) =>
                            !referencesRef.current.some(
                              (existing) => existing.document_name === ref.document_name
                            )
                        ),
                      ];
                    }
                    if (files.length) {
                      filesRef.current = [
                        ...filesRef.current,
                        ...files.filter(
                          (file) =>
                            !filesRef.current.some((existing) => existing.url === file.url)
                        ),
                      ];
                    }
                  }
                  setToolEvents((prev) => [
                    ...prev,
                    {
                      id: `tool-${Date.now()}`,
                      label: data.label || undefined,
                      status: data.status || undefined,
                      error: data.error,
                      data: data.data,
                      tool: data.tool || undefined,
                      thought: data.thought || undefined,
                      tool_input: data.tool_input,
                      observation: data.observation,
                      createdAt: new Date(),
                    },
                  ]);
                }

                pendingEventName = null;
                continue;
              }

              // OpenAI SSE chunk format
              if (data.choices && data.choices[0]?.delta) {
                const delta = data.choices[0].delta;
                if (typeof delta.content === 'string') {
                  if (ignoreNextDeltaRef.current) {
                    contentBufferRef.current = '';
                    ignoreNextDeltaRef.current = false;
                    processAnswerChunk(delta.content);
                  } else {
                    processAnswerChunk(delta.content);
                  }
                  scheduleUpdate();
                }
                if (data.choices[0]?.finish_reason === 'stop') {
                  if (data._dify?.message_id) {
                    difyMessageIdRef.current = data._dify.message_id;
                  }
                  if (data._dify?.retriever_resources) {
                    referencesRef.current = data._dify.retriever_resources;
                  }
                  if (Array.isArray(data._dify?.message_files)) {
                    const files = data._dify.message_files
                      .filter((file: any) => file?.url)
                      .map((file: any) => ({
                        type: file.type || undefined,
                        url: proxyFileUrl(file.url),
                      }));
                    if (files.length) {
                      filesRef.current = [...filesRef.current, ...files];
                    }
                  }
                  if (rafIdRef.current) {
                    cancelAnimationFrame(rafIdRef.current);
                  }
                  flushContent();
                }
                continue;
              }

              // Handle workflow events (Dify SSE)
              if (data.event === 'workflow_started') {
                setWorkflowStatus((prev) => ({
                  ...prev,
                  isRunning: true,
                  startedAt: new Date(),
                }));
              }

              if (data.event === 'node_started') {
                const node: WorkflowNode = {
                  id: data.data?.id || '',
                  nodeId: data.data?.node_id || '',
                  nodeType: data.data?.node_type || '',
                  title: data.data?.title || '',
                  status: 'running',
                };
                setWorkflowStatus((prev) => ({
                  ...prev,
                  currentNode: node.title,
                  nodes: [...prev.nodes.filter(n => n.nodeId !== node.nodeId), node],
                }));
              }

              if (data.event === 'node_finished') {
                const nodeId = data.data?.node_id || '';
                const status = data.data?.status || 'succeeded';
                const elapsedTime = data.data?.elapsed_time;
                setWorkflowStatus((prev) => ({
                  ...prev,
                  nodes: prev.nodes.map(n =>
                    n.nodeId === nodeId
                      ? { ...n, status, elapsedTime }
                      : n
                  ),
                }));
              }

              if (data.event === 'workflow_finished') {
                setWorkflowStatus((prev) => ({
                  ...prev,
                  isRunning: false,
                  currentNode: undefined,
                }));
              }

              // Handle message events - 使用批量更新
              if (data.event === 'message' || data.event === 'agent_message') {
                if (data.answer) {
                  processAnswerChunk(data.answer);
                  scheduleUpdate();
                }
              }

              // Handle message_end event
              if (data.event === 'message_end') {
                if (data.message_id) {
                  difyMessageIdRef.current = data.message_id;
                }
                if (data.metadata?.retriever_resources) {
                  referencesRef.current = data.metadata.retriever_resources;
                }
                if (Array.isArray(data.metadata?.message_files)) {
                  const files = data.metadata.message_files
                    .filter((file: any) => file?.url)
                    .map((file: any) => ({
                      type: file.type || undefined,
                        url: proxyFileUrl(file.url),
                    }));
                  if (files.length) {
                    filesRef.current = [...filesRef.current, ...files];
                  }
                }
                // 确保最后一次更新被执行
                if (rafIdRef.current) {
                  cancelAnimationFrame(rafIdRef.current);
                }
                flushContent();
                break;
              }

              if (data.event === 'message_file') {
                if (data.url) {
                  filesRef.current = [
                    ...filesRef.current,
                    { type: data.type || undefined, url: proxyFileUrl(data.url) },
                  ];
                }
              }

              if (data.event === 'tts_message') {
                if (typeof data.audio === 'string') {
                  ttsAudioRef.current += data.audio;
                }
              }

              if (data.event === 'tts_message_end') {
                if (ttsAudioRef.current) {
                  const audioUrl = `data:audio/mp3;base64,${ttsAudioRef.current}`;
                  ttsAudioRef.current = audioUrl;
                }
              }

              if (data.event === 'message_replace') {
                if (typeof data.answer === 'string') {
                  contentBufferRef.current = data.answer;
                  ignoreNextDeltaRef.current = true;
                  scheduleUpdate();
                }
              }

              if (data.event === 'agent_log') {
                const toolResponse = data.data?.data?.output?.tool_response;
                if (typeof toolResponse === 'string') {
                  const refs = extractReferencesFromToolResponse(toolResponse);
                  const files = extractFileUrlsFromToolResponse(toolResponse).map((file) => ({
                    ...file,
                    url: proxyFileUrl(file.url),
                  }));
                  if (refs.length) {
                    referencesRef.current = [
                      ...referencesRef.current,
                      ...refs.filter(
                        (ref) =>
                          !referencesRef.current.some(
                            (existing) => existing.document_name === ref.document_name
                          )
                      ),
                    ];
                  }
                  if (files.length) {
                    filesRef.current = [
                      ...filesRef.current,
                      ...files.filter(
                        (file) =>
                          !filesRef.current.some((existing) => existing.url === file.url)
                      ),
                    ];
                  }
                }
                setToolEvents((prev) => [
                  ...prev,
                  {
                    id: `tool-${Date.now()}`,
                    label: data.data?.label || undefined,
                    status: data.data?.status || undefined,
                    error: data.data?.error,
                    data: data.data?.data,
                    createdAt: new Date(),
                  },
                ]);
              }

              if (data.event === 'agent_thought') {
                setToolEvents((prev) => [
                  ...prev,
                  {
                    id: `tool-${Date.now()}`,
                    tool: data.tool || undefined,
                    thought: data.thought || undefined,
                    tool_input: data.tool_input,
                    observation: data.observation,
                    createdAt: new Date(),
                  },
                ]);
              }

              // Handle error event
              if (data.event === 'error') {
                throw new Error(data.message || 'Dify API error');
              }
            } catch (parseError) {
              // Ignore JSON parse errors for incomplete data
              if (!(parseError instanceof SyntaxError)) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, not an error
          return;
        }

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);

        // Add error message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${error.message}`,
            createdAt: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setWorkflowStatus((prev) => ({ ...prev, isRunning: false }));
        abortControllerRef.current = null;
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      }
    },
    [chatId, onError, scheduleUpdate, flushContent]
  );

  const sendFeedback = useCallback(
    async (messageId: string, rating: 'like' | 'dislike' | null) => {
      if (!messageId) return;
      await fetch('/api/dify/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, messageId, rating }),
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.difyMessageId === messageId
            ? { ...msg, feedback: rating }
            : msg
        )
      );
    },
    [chatId]
  );

  return {
    messages,
    setMessages,
    sendMessage,
    sendFeedback,
    isLoading,
    error,
    stop,
    workflowStatus,
    toolEvents,
  };
}

