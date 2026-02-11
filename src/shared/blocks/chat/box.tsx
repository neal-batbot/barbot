'use client';

import { useEffect, useMemo } from 'react';
import { UIMessage } from 'ai';

import { useChatContext } from '@/shared/contexts/chat';
import { useDifyChat, DifyMessage } from '@/shared/hooks/use-dify-chat';
import { Chat } from '@/shared/types/chat';

import { DifyFollowUp } from './dify-follow-up';
import { DifyMessages } from './dify-messages';
import { ChatHeader } from './header';

export function ChatBox({
  initialChat,
  initialMessages,
}: {
  initialChat?: Chat;
  initialMessages?: UIMessage[];
}) {
  const { chat, setChat } = useChatContext();

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

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-4 py-6 md:max-w-3xl">
          <DifyMessages difyChat={difyChat} />
        </div>
      </div>
      <div className="mx-auto w-full px-4 pb-4 md:max-w-3xl">
        <DifyFollowUp difyChat={difyChat} />
      </div>
    </div>
  );
}
