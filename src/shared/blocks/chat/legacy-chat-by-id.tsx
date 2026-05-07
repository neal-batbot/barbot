'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UIMessage } from 'ai';

import { ChatBox } from '@/shared/blocks/chat/box';
import { Loader } from '@/shared/components/ai-elements/loader';
import { Chat } from '@/shared/types/chat';

export function LegacyChatById() {
  const params = useParams();

  const [initialChat, setInitialChat] = useState<Chat | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null
  );

  const loadChatData = async (chatId: string) => {
    try {
      const [chatResp, messagesResp] = await Promise.all([
        fetch('/api/chat/info', {
          method: 'POST',
          body: JSON.stringify({ chatId }),
        }),
        fetch('/api/chat/messages', {
          method: 'POST',
          body: JSON.stringify({ chatId, page: 1, limit: 100 }),
        }),
      ]);

      if (!chatResp.ok) {
        throw new Error(`fetch chat failed with status: ${chatResp.status}`);
      }
      const chatResult = await chatResp.json();
      if (chatResult.code !== 0) {
        throw new Error(chatResult.message);
      }

      const data = chatResult.data;
      setInitialChat({
        id: data.id,
        title: data.title,
        createdAt: data.createdAt,
        model: data.model,
        provider: data.provider,
        parts: data.parts ? JSON.parse(data.parts) : [],
        metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
        content: data.content ? JSON.parse(data.content) : undefined,
      } as Chat);

      if (!messagesResp.ok) {
        throw new Error(
          `fetch messages failed with status: ${messagesResp.status}`
        );
      }
      const messagesResult = await messagesResp.json();
      if (messagesResult.code !== 0) {
        throw new Error(messagesResult.message);
      }

      const { list } = messagesResult.data;
      setInitialMessages(
        list.map((item: any) => ({
          id: item.id,
          role: item.role,
          parts: item.parts ? JSON.parse(item.parts) : [],
          metadata: item.metadata ? JSON.parse(item.metadata) : undefined,
        })) as UIMessage[]
      );
    } catch (e: any) {
      console.log('load chat data failed:', e);
    }
  };

  useEffect(() => {
    loadChatData(params.id as string);
  }, [params.id]);

  return initialChat && initialMessages ? (
    <ChatBox initialChat={initialChat} initialMessages={initialMessages} />
  ) : (
    <div className="flex h-screen items-center justify-center p-8">
      <Loader />
    </div>
  );
}

