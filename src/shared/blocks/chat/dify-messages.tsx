'use client';

import { useEffect, useRef, memo } from 'react';
import { CheckCircle2Icon, CircleDotIcon, CopyIcon, Loader2Icon, XCircleIcon } from 'lucide-react';

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
import { UseDifyChatReturn, WorkflowNode } from '@/shared/hooks/use-dify-chat';

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

// 单条消息组件 - 使用 memo 避免不必要的重渲染
const MessageItem = memo(function MessageItem({
  message,
  isLastAssistant,
  isLoading,
}: {
  message: { id: string; role: 'user' | 'assistant'; content: string };
  isLastAssistant: boolean;
  isLoading: boolean;
}) {
  const isError = message.content.startsWith('Error:');

  return (
    <div>
      <Message from={message.role}>
        <MessageContent>
          <Response className={cn(isError && 'text-destructive')}>
            {message.content}
          </Response>
        </MessageContent>
      </Message>
      {isLastAssistant && !isLoading && message.content && (
        <Actions className="mt-2">
          <Action
            onClick={() => navigator.clipboard.writeText(message.content)}
            label="Copy"
          >
            <CopyIcon className="size-3" />
          </Action>
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
  const { messages, isLoading, workflowStatus } = difyChat;
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

