'use client';

import { useState, useCallback, useRef } from 'react';

export interface DifyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
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

export interface UseDifyChatOptions {
  chatId: string;
  initialMessages?: DifyMessage[];
  onError?: (error: Error) => void;
}

export interface UseDifyChatReturn {
  messages: DifyMessage[];
  setMessages: React.Dispatch<React.SetStateAction<DifyMessage[]>>;
  sendMessage: (text: string, options?: { rating?: string }) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  stop: () => void;
  workflowStatus: WorkflowStatus;
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
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 用于批量更新的缓冲区
  const contentBufferRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);
  const assistantIdRef = useRef<string>('');

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
  }, []);

  // 批量更新消息内容，使用 requestAnimationFrame 减少跳动
  const flushContent = useCallback(() => {
    const content = contentBufferRef.current;
    const assistantId = assistantIdRef.current;
    
    if (content && assistantId) {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.id === assistantId) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content },
          ];
        } else {
          return [
            ...prev,
            {
              id: assistantId,
              role: 'assistant' as const,
              content,
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

                pendingEventName = null;
                continue;
              }

              // OpenAI SSE chunk format
              if (data.choices && data.choices[0]?.delta) {
                const delta = data.choices[0].delta;
                if (typeof delta.content === 'string') {
                  contentBufferRef.current += delta.content;
                  scheduleUpdate();
                }
                if (data.choices[0]?.finish_reason === 'stop') {
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
                  contentBufferRef.current += data.answer;
                  scheduleUpdate();
                }
              }

              // Handle message_end event
              if (data.event === 'message_end') {
                // 确保最后一次更新被执行
                if (rafIdRef.current) {
                  cancelAnimationFrame(rafIdRef.current);
                }
                flushContent();
                break;
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

  return {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    error,
    stop,
    workflowStatus,
  };
}

