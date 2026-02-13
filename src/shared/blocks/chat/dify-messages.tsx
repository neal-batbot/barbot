'use client';

import { useEffect, useRef, memo, useState, useMemo } from 'react';
import { CheckCircle2Icon, CircleDotIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, PaperclipIcon, ThumbsDownIcon, ThumbsUpIcon, XCircleIcon } from 'lucide-react';

import { Action, Actions } from '@/shared/components/ai-elements/actions';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/shared/components/ai-elements/conversation';
import { Loader } from '@/shared/components/ai-elements/loader';
import {
  Message,
  MessageContent,
} from '@/shared/components/ai-elements/message';
import { Response } from '@/shared/components/ai-elements/response';
import { cn } from '@/shared/lib/utils';
import { UseDifyChatReturn, WorkflowNode, ToolEvent } from '@/shared/hooks/use-dify-chat';

// ---------------------------------------------------------------------------
// Utilities for file URL handling
// ---------------------------------------------------------------------------

/**
 * 将消息内容中的裸文件 URL（如 `image: URL` 或独立 URL 行）转为 Markdown 图片，
 * 这样 Streamdown 会渲染成 <img>，再由 Response 的 urlTransform 代理。
 */
function processContent(content: string): string {
  if (!content) return content;

  let processed = content;

  // 1. `image: URL` 或 `file: URL` 开头的行 → Markdown 图片
  processed = processed.replace(
    /^(?:image|file):\s*((?:https?:\/\/|\/api\/dify\/file)\S+)/gim,
    '\n![image]($1)\n',
  );

  // 2. 独立一行的 Dify 文件 URL → Markdown 图片
  processed = processed.replace(
    /^(https?:\/\/\S+(?:file-preview|image-preview))$/gm,
    '\n![]($1)\n',
  );

  // 3. 独立一行的代理 URL → Markdown 图片
  processed = processed.replace(
    /^(\/api\/dify\/file\S+)$/gm,
    '\n![]($1)\n',
  );

  // 清理多余空行
  processed = processed.replace(/\n{3,}/g, '\n\n');
  return processed.trim();
}

/** 从代理 URL 中还原原始外部 URL */
function getOriginalUrl(proxyUrl: string): string {
  if (!proxyUrl) return proxyUrl;
  const prefix = '/api/dify/file?url=';
  if (proxyUrl.startsWith(prefix)) {
    try {
      return decodeURIComponent(proxyUrl.slice(prefix.length));
    } catch {
      return proxyUrl;
    }
  }
  return proxyUrl;
}

/** 判断 URL 是否可能是图片类型 */
function isLikelyImage(url: string, type?: string): boolean {
  if (!url) return false;
  if (type === 'image' || type?.startsWith?.('image/')) return true;
  const raw = getOriginalUrl(url);
  return /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)$/i.test(raw) ||
    /(?:file-preview|image-preview)/i.test(raw);
}

// ---------------------------------------------------------------------------
// FileImageItem – 单个附件展示（含加载失败回退）
// ---------------------------------------------------------------------------

function FileImageItem({ file }: { file: { type?: string; url?: string } }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const url = file.url || '';
  const image = isLikelyImage(url, file.type);

  if (!url) return null;

  if (image && status !== 'error') {
    return (
      <div className="overflow-hidden rounded-lg border bg-background">
        <a href={url} target="_blank" rel="noreferrer noopener" className="block">
          <img
            src={url}
            alt="附件图片"
            className={cn(
              'max-h-64 w-full object-contain transition-opacity',
              status === 'loading' && 'min-h-[80px] animate-pulse bg-muted opacity-60',
            )}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
          />
        </a>
      </div>
    );
  }

  // 图片加载失败或非图片：展示下载链接
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm text-primary transition-colors hover:bg-muted/50"
    >
      {image ? (
        <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{image ? '查看图片（点击在新窗口打开）' : '下载文件'}</span>
    </a>
  );
}

// 工作流进度组件
const WorkflowProgress = memo(function WorkflowProgress({
  nodes,
  currentNode,
  isRunning,
}: {
  nodes: WorkflowNode[];
  currentNode?: string;
  isRunning: boolean;
}) {
  if (!isRunning && nodes.length === 0) return null;

  return (
    <div className="bg-muted/50 mb-3 rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        {isRunning ? (
          <>
            <Loader2Icon className="text-primary size-4 animate-spin" />
            <span>正在处理: {currentNode || '准备中...'}</span>
          </>
        ) : (
          <>
            <CheckCircle2Icon className="size-4 text-green-500" />
            <span>处理完成</span>
          </>
        )}
      </div>
      {nodes.length > 0 && (
        <div className="space-y-1">
          {nodes.map((node) => (
            <div
              key={node.nodeId}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              {node.status === 'running' ? (
                <CircleDotIcon className="text-primary size-3 animate-pulse" />
              ) : node.status === 'succeeded' ? (
                <CheckCircle2Icon className="size-3 text-green-500" />
              ) : node.status === 'failed' ? (
                <XCircleIcon className="size-3 text-red-500" />
              ) : (
                <CircleDotIcon className="size-3" />
              )}
              <span>{node.title}</span>
              {node.elapsedTime && (
                <span className="text-muted-foreground/60">
                  ({node.elapsedTime.toFixed(2)}s)
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const ToolProgress = memo(function ToolProgress({
  toolEvents,
}: {
  toolEvents: ToolEvent[];
}) {
  if (toolEvents.length === 0) return null;

  return (
    <div className="bg-muted/50 mb-3 rounded-lg border p-3 text-xs text-muted-foreground">
      <div className="mb-2 font-medium text-foreground">工具调用过程</div>
      <div className="space-y-2">
        {toolEvents.map((event) => (
          <div key={event.id} className="rounded-md border bg-background/50 p-2">
            {event.label && <div>阶段: {event.label}</div>}
            {event.status && <div>状态: {event.status}</div>}
            {event.tool && <div>工具: {event.tool}</div>}
            {event.thought && <div>思考: {event.thought}</div>}
            {event.error && (
              <div>错误: {typeof event.error === 'string' ? event.error : JSON.stringify(event.error)}</div>
            )}
            {event.tool_input && (
              <div>输入: {typeof event.tool_input === 'string' ? event.tool_input : JSON.stringify(event.tool_input)}</div>
            )}
            {event.observation && (
              <div>输出: {typeof event.observation === 'string' ? event.observation : JSON.stringify(event.observation)}</div>
            )}
            {event.data && (
              <div>详情: {typeof event.data === 'string' ? event.data : JSON.stringify(event.data)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

// 单条消息组件 - 使用 memo 避免不必要的重渲染
const MessageItem = memo(function MessageItem({
  message,
  isLastAssistant,
  isLoading,
  onFeedback,
}: {
  message: { id: string; role: 'user' | 'assistant'; content: string; references?: any[]; difyMessageId?: string; feedback?: 'like' | 'dislike' | null; files?: any[]; audioUrl?: string };
  isLastAssistant: boolean;
  isLoading: boolean;
  onFeedback: (messageId: string, rating: 'like' | 'dislike' | null) => void;
}) {
  const isError = message.content.startsWith('Error:');

  // 将消息内容中的文件 URL 文本转为 Markdown 图片
  const processedContent = useMemo(
    () => processContent(message.content),
    [message.content],
  );

  // 计算不在内容中的附件（避免重复展示）
  const remainingFiles = useMemo(() => {
    if (!message.files?.length) return [];
    return message.files.filter((file) => {
      if (!file.url) return false;
      // 用原始 URL 判断是否已在内容中渲染
      const originalUrl = getOriginalUrl(file.url);
      if (message.content.includes(originalUrl)) return false;
      if (originalUrl !== file.url && message.content.includes(file.url)) return false;
      return true;
    });
  }, [message.content, message.files]);

  const extractFirstUrl = (text?: string) => {
    if (!text) return null;
    const match = text.match(/https?:\/\/[^\s")\]]+/i);
    return match ? match[0] : null;
  };

  return (
    <div>
      <Message from={message.role}>
        <MessageContent>
          <Response className={cn(isError && 'text-destructive')}>
            {processedContent}
          </Response>
        </MessageContent>
      </Message>

      {/* 参考文档 */}
      {message.role === 'assistant' && message.references?.length ? (
        <details className="mt-2 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer text-foreground">参考文档</summary>
          <div className="mt-2 space-y-1">
            {message.references.map((ref, index) => (
              <div key={`${ref.document_name || 'ref'}-${index}`}>
                {ref.document_name || ref.dataset_name || '未命名文档'}
                {ref.dataset_name ? ` · ${ref.dataset_name}` : ''}
                {ref.score ? ` (score: ${ref.score})` : ''}
                {ref.content ? (
                  <div className="mt-1 line-clamp-3 text-muted-foreground/80">
                    {ref.content}
                  </div>
                ) : null}
                {ref.content ? (
                  (() => {
                    const url = extractFirstUrl(ref.content);
                    return url ? (
                      <a
                        className="mt-1 block text-primary underline"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看原文
                      </a>
                    ) : null;
                  })()
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {/* 附件图片 —— 内联展示，不再折叠 */}
      {message.role === 'assistant' && remainingFiles.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {remainingFiles.map((file, index) => (
            <FileImageItem key={`${file.url || 'file'}-${index}`} file={file} />
          ))}
        </div>
      )}

      {/* 音频 */}
      {message.role === 'assistant' && message.audioUrl ? (
        <div className="mt-2">
          <audio controls src={message.audioUrl} />
        </div>
      ) : null}

      {/* 操作按钮 */}
      {isLastAssistant && !isLoading && message.content && (
        <Actions className="mt-2">
          <Action
            onClick={() => navigator.clipboard.writeText(message.content)}
            label="Copy"
          >
            <CopyIcon className="size-3" />
          </Action>
          {message.difyMessageId ? (
            <>
              <Action
                onClick={() =>
                  onFeedback(
                    message.difyMessageId!,
                    message.feedback === 'like' ? null : 'like',
                  )
                }
                label="Like"
              >
                <ThumbsUpIcon
                  className={cn(
                    'size-3',
                    message.feedback === 'like' && 'text-green-500',
                  )}
                />
              </Action>
              <Action
                onClick={() =>
                  onFeedback(
                    message.difyMessageId!,
                    message.feedback === 'dislike' ? null : 'dislike',
                  )
                }
                label="Dislike"
              >
                <ThumbsDownIcon
                  className={cn(
                    'size-3',
                    message.feedback === 'dislike' && 'text-red-500',
                  )}
                />
              </Action>
            </>
          ) : null}
        </Actions>
      )}
    </div>
  );
});

export function DifyMessages({
  difyChat,
}: {
  difyChat: UseDifyChatReturn;
}) {
  const { messages, isLoading, workflowStatus, toolEvents, sendFeedback } = difyChat;
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  return (
    <Conversation className="h-full">
      <ConversationContent>
        {messages.map((message, index) => {
          const isLastAssistant =
            message.role === 'assistant' && index === messages.length - 1;

          return (
            <MessageItem
              key={message.id}
              message={message}
              isLastAssistant={isLastAssistant}
              isLoading={isLoading}
              onFeedback={sendFeedback}
            />
          );
        })}
        
        {/* 工作流进度 */}
        {isLoading && (
          <WorkflowProgress
            nodes={workflowStatus.nodes}
            currentNode={workflowStatus.currentNode}
            isRunning={workflowStatus.isRunning}
          />
        )}

        {/* 工具调用过程 - 已隐藏 */}
        
        {/* 只在没有消息输出时显示加载器 */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && !workflowStatus.nodes.length && (
          <Loader />
        )}
        
        <div ref={endOfMessagesRef} />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

