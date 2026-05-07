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

type LimitErrorInfo = {
  code?: string;
  message: string;
  retryAfter?: number;
  upgradeUrl?: string;
};

function parseLimitError(error: Error | null): LimitErrorInfo | null {
  if (!error) return null;
  const anyErr = error as any;
  const code = anyErr.code;
  if (
    code === 'RATE_LIMIT_EXCEEDED' ||
    code === 'DAILY_QUOTA_EXCEEDED' ||
    code === 'COST_GUARD_EXCEEDED'
  ) {
    return {
      code,
      message: error.message,
      retryAfter: Number(anyErr.retryAfter || 0) || undefined,
      upgradeUrl: anyErr.upgradeUrl,
    };
  }
  return null;
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
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number>(0);
  const autoSentRef = useRef(false);

  const formatDifyLabel = useCallback((title: string) => {
    const trimmed = title.replace(/^Vector\s*/i, '').trim();
    return `Vector-${trimmed || 'Assistant'}`;
  }, []);

  const limitError = useMemo(() => parseLimitError(error), [error]);

  useEffect(() => {
    if (!limitError) {
      setRetryAfterSeconds(0);
      return;
    }
    setRetryAfterSeconds(limitError.retryAfter || 0);
  }, [limitError]);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = setInterval(() => {
      setRetryAfterSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfterSeconds]);

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
      if (!data.message.trim() || isLoading || retryAfterSeconds > 0) return;
      await sendMessage(data.message, { rating });
    },
    [isLoading, sendMessage, rating, retryAfterSeconds]
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

  const disabledByLimit = retryAfterSeconds > 0;
  const countdownText = useMemo(() => {
    if (!disabledByLimit) return '';
    const minutes = Math.floor(retryAfterSeconds / 60);
    const seconds = retryAfterSeconds % 60;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, [disabledByLimit, retryAfterSeconds]);

  return (
    <div className="w-full">
      <AnimatedChatInput
        onSendMessage={handleSendMessage}
        models={uiModels}
        selectedModelId={model}
        onSelectModel={handleModelChange}
        placeholder={t('input_placeholder')}
        disabled={isLoading || disabledByLimit}
      />
      {limitError ? (
        <p className="mt-2 text-sm text-amber-600" role="alert">
          {limitError.message}
          {disabledByLimit ? ` ${t('limit.retry_in')} ${countdownText}` : ''}
          {limitError.upgradeUrl ? (
            <>
              {' '}
              <a className="underline" href={limitError.upgradeUrl}>
                {t('limit.upgrade')}
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {error && !limitError ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
