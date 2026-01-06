'use client';

import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';

import { useChatContext } from '@/shared/contexts/chat';
import { useDifyChat, DifyMessage } from '@/shared/hooks/use-dify-chat';
import { Chat } from '@/shared/types/chat';

import { DifyFollowUp } from './dify-follow-up';
import { DifyMessages } from './dify-messages';
import { FollowUp } from './follow-up';
import { ChatHeader } from './header';
import { ChatMessages } from './messages';

export function ChatBox({
  initialChat,
  initialMessages,
}: {
  initialChat?: Chat;
  initialMessages?: UIMessage[];
}) {
  const { chat, setChat } = useChatContext();
  const [selectedProvider, setSelectedProvider] = useState<string>('dify');

  // AI SDK chat instance (for OpenRouter, etc.)
  const aiSdkChat = useChat({
    id: initialChat?.id,
    messages: initialMessages,

    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ messages, id, body }) {
        const extraBody = body ?? {};
        return {
          body: {
            chatId: id,
            message: messages[messages.length - 1],
            ...extraBody,
          },
        };
      },
    }),
  });

  // Convert initial UIMessage[] to DifyMessage[]
  const initialDifyMessages = useMemo(() => {
    if (!initialMessages) return [];
    return initialMessages.map((msg): DifyMessage => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n') || '',
      createdAt: new Date(),
    }));
  }, [initialMessages]);

  // Dify chat instance
  const difyChat = useDifyChat({
    chatId: initialChat?.id || '',
    initialMessages: initialDifyMessages,
  });

  useEffect(() => {
    if (initialChat) {
      setChat(initialChat);
    }
  }, [initialChat, setChat]);

  const isDify = selectedProvider === 'dify';

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-4 py-6 md:max-w-3xl">
          {isDify ? (
            <DifyMessages difyChat={difyChat} />
          ) : (
            <ChatMessages chatInstance={aiSdkChat} />
          )}
        </div>
      </div>
      <div className="mx-auto w-full px-4 pb-4 md:max-w-3xl">
        {isDify ? (
          <DifyFollowUp
            difyChat={difyChat}
            onProviderChange={setSelectedProvider}
            selectedProvider={selectedProvider}
          />
        ) : (
          <FollowUp chatInstance={aiSdkChat} />
        )}
      </div>
    </div>
  );
}
