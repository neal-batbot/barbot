'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { AnimatedChatInput } from '../../../../components/ui/animated-ai-input';
import {
  AttachedFile,
  ModelOption,
  PastedContent,
} from '../../../../components/ui/claude-style-chat-input';
import { useChatContext } from '@/shared/contexts/chat';
import { UseDifyChatReturn } from '@/shared/hooks/use-dify-chat';
import { ChatModel } from '@/shared/types/chat';

interface DifyBot {
  id: string;
  title: string;
  has_rating: boolean;
  ratings?: string[];
  default_rating?: string;
}

interface ExtendedChatModel extends ChatModel {
  has_rating?: boolean;
  ratings?: string[];
  default_rating?: string;
}

interface DifyFollowUpProps {
  difyChat: UseDifyChatReturn;
}

export function DifyFollowUp({
  difyChat,
}: DifyFollowUpProps) {
  const t = useTranslations('ai.chat.generator');
  const params = useParams();
  const { chat } = useChatContext();
  const { messages, sendMessage, isLoading, error } = difyChat;

  const [difyBots, setDifyBots] = useState<DifyBot[]>([]);
  const [model, setModel] = useState<string>('');
  const [rating, setRating] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const autoSentRef = useRef(false);

  const formatDifyLabel = useCallback((title: string) => {
    const trimmed = title.replace(/^Vector\s*/i, '').trim();
    return `Vector-${trimmed || 'Assistant'}`;
  }, []);

  // Fetch Dify bots from API
  useEffect(() => {
    setMounted(true);
    fetch('/api/chat/bots')
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 && data.data) {
          setDifyBots(data.data);
        }
      })
      .catch((err) => {
        console.error('[DEBUG DifyFollowUp] Failed to fetch bots:', err);
        // Fallback to default bot
        setDifyBots([
          {
            id: 'default',
            title: 'Vector ChatBot Assistant',
            has_rating: true,
            ratings: ['Catalog工业', 'Automotive汽车'],
            default_rating: 'Catalog工业',
          },
        ]);
      });
  }, []);

  // Initialize model from chat.model
  useEffect(() => {
    if (chat?.model) {
      console.log('[DEBUG DifyFollowUp] Initializing model from chat.model:', chat.model);
      setModel(chat.model);
      return;
    }

    if (!model && difyBots.length > 0) {
      setModel(`dify/${difyBots[0].id}`);
    }
  }, [chat?.model, difyBots, model]);

  // Combine Dify bots
  const models: ExtendedChatModel[] = useMemo(() => {
    const difyModels: ExtendedChatModel[] = difyBots.map((bot) => ({
      title: bot.title,
      name: `dify/${bot.id}`,
      provider: 'dify',
      has_rating: bot.has_rating,
      ratings: bot.ratings,
      default_rating: bot.default_rating,
    }));
    return difyModels;
  }, [difyBots]);

  // Update rating when model changes
  useEffect(() => {
    if (!model) return;
    const selectedModel = models.find((m) => m.name === model);
    if (selectedModel?.provider === 'dify') {
      if (selectedModel.default_rating) {
        setRating(selectedModel.default_rating);
      } else if (selectedModel.ratings && selectedModel.ratings.length > 0) {
        setRating(selectedModel.ratings[0]);
      }
    }
  }, [model, models]);

  const selectedModel = models.find((m) => m.name === model);
  const isDifyModel = mounted && selectedModel?.provider === 'dify';

  // Handle model change
  const handleModelChange = useCallback(
    (value: string) => {
      setModel(value);
    },
    []
  );

  // Auto send message for new chat
  useEffect(() => {
    if (
      chat?.id &&
      chat.id === params.id &&
      chat.content &&
      chat.createdAt &&
      messages.length === 0 &&
      !autoSentRef.current
    ) {
      autoSentRef.current = true;
      // Auto send initial message
      const content =
        typeof chat.content === 'string'
          ? chat.content
          : chat.content?.text || '';
      const metadata = chat.metadata
        ? typeof chat.metadata === 'string'
          ? JSON.parse(chat.metadata)
          : chat.metadata
        : {};
      sendMessage(content, { rating: metadata.rating || rating });
    }
  }, [params.id, chat, messages.length, sendMessage, rating]);

  const handleSendMessage = useCallback(
    async (data: {
      message: string;
      files: AttachedFile[];
      pastedContent: PastedContent[];
      model: string;
      isThinkingEnabled: boolean;
    }) => {
      if (!data.message.trim() || isLoading) return;
      await sendMessage(data.message, { rating });
    },
    [isLoading, sendMessage, rating]
  );

  if (!chat) {
    return null;
  }

  const uiModels = useMemo<ModelOption[]>(
    () =>
      models.map((m) => ({
        id: m.name,
        name: formatDifyLabel(m.title),
        description: m.ratings?.length
          ? 'Supports rating selection'
          : 'Standard chat',
      })),
    [models, formatDifyLabel]
  );

  return (
    <div className="w-full">
      <AnimatedChatInput
        onSendMessage={handleSendMessage}
        models={uiModels}
        selectedModelId={model}
        onSelectModel={handleModelChange}
        placeholder={t('input_placeholder')}
        disabled={isLoading}
      />
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

