'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AnimatedChatInput } from '../../../../components/ui/animated-ai-input';
import {
  AttachedFile,
  ModelOption,
  PastedContent,
} from '../../../../components/ui/claude-style-chat-input';
import { STATIC_CHAT_MODELS } from '@/config/chat-providers';
import { PromptInputMessage } from '@/shared/components/ai-elements/prompt-input';
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

type LimitErrorInfo = {
  code?: string;
  message: string;
  retryAfter?: number;
  upgradeUrl?: string;
};

function parseLimitError(raw?: string | null): LimitErrorInfo | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const candidates = [trimmed];
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match?.[0] && match[0] !== trimmed) candidates.push(match[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as any;
      if (parsed && typeof parsed === 'object') {
        const code = parsed.code;
        if (
          code === 'RATE_LIMIT_EXCEEDED' ||
          code === 'DAILY_QUOTA_EXCEEDED' ||
          code === 'COST_GUARD_EXCEEDED'
        ) {
          return {
            code,
            message: parsed.message || trimmed,
            retryAfter: Number(parsed.retryAfter || 0) || undefined,
            upgradeUrl: parsed.upgradeUrl || parsed.upgrade_url,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function ChatInput({
  handleSubmit,
  status,
  error,
  onInputChange,
}: {
  handleSubmit: (
    message: PromptInputMessage,
    body: Record<string, any>
  ) => void | Promise<void>;
  status?: UseChatHelpers<UIMessage>['status'];
  error?: string | null;
  onInputChange?: (value: string) => void;
}) {
  const t = useTranslations('ai.chat.generator');

  const staticModels: ExtendedChatModel[] = STATIC_CHAT_MODELS as ExtendedChatModel[];

  const [difyBots, setDifyBots] = useState<DifyBot[]>([]);
  const [model, setModel] = useState<string>('');
  const [webSearch, setWebSearch] = useState(false);
  const [reasoning, setReasoning] = useState(false);
  const [rating, setRating] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number>(0);
  const [limitError, setLimitError] = useState<LimitErrorInfo | null>(null);
  const [userPlan, setUserPlan] = useState<{ plan: string; allowedModels: string[] }>({
    plan: 'free',
    allowedModels: ['kimi-*', 'glm-*'],
  });

  const formatDifyLabel = useCallback((title: string) => {
    const trimmed = title.replace(/^Vector\s*/i, '').trim();
    return `Vector-${trimmed || 'Assistant'}`;
  }, []);

  // Fetch user plan for model access control
  useEffect(() => {
    fetch('/api/chat/plan')
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 && data.data) {
          setUserPlan(data.data);
        }
      })
      .catch(() => {
        // keep default free plan on error
      });
  }, []);

  // Fetch Dify bots from API
  useEffect(() => {
    setMounted(true);
    fetch('/api/chat/bots')
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 && data.data) {
          setDifyBots(data.data);
          // Set default model to first Dify bot if available
          if (data.data.length > 0) {
            const firstBot = data.data[0];
            setModel(`dify/${firstBot.id}`);
            if (firstBot.default_rating) {
              setRating(firstBot.default_rating);
            } else if (firstBot.ratings && firstBot.ratings.length > 0) {
              setRating(firstBot.ratings[0]);
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch bots:', err);
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
        setModel('dify/default');
        setRating('Catalog工业');
      });
  }, []);

  useEffect(() => {
    const parsed = parseLimitError(error);
    if (!parsed) {
      setLimitError(null);
      setRetryAfterSeconds(0);
      return;
    }
    setLimitError(parsed);
    setRetryAfterSeconds(parsed.retryAfter || 0);
  }, [error]);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = setInterval(() => {
      setRetryAfterSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfterSeconds]);

  // Combine Dify bots with static models
  const models: ExtendedChatModel[] = useMemo(() => {
    const difyModels: ExtendedChatModel[] = difyBots.map((bot) => ({
      title: bot.title,
      name: `dify/${bot.id}`,
      provider: 'dify',
      has_rating: bot.has_rating,
      ratings: bot.ratings,
      default_rating: bot.default_rating,
    }));
    return [...difyModels, ...staticModels];
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
      } else {
        setRating('');
      }
    }
  }, [model, models]);
  
  const selectedModel = models.find((m) => m.name === model);
  const isDifyModel = mounted && selectedModel?.provider === 'dify';

  const uiModels = useMemo<ModelOption[]>(() => {
    const isModelAccessible = (modelName: string): boolean => {
      if (userPlan.plan === 'team') return true;
      return userPlan.allowedModels.some((rule) => {
        if (rule === '*') return true;
        if (rule.endsWith('*')) return modelName.startsWith(rule.slice(0, -1));
        return modelName === rule;
      });
    };

    const difyModelItems: ModelOption[] = difyBots.map((bot) => {
      const botModel = models.find((m) => m.name === `dify/${bot.id}`);
      return {
        id: `dify/${bot.id}`,
        name: formatDifyLabel(bot.title),
        description: bot.ratings?.length ? 'Supports rating selection' : 'Standard chat',
        badge: (botModel as ExtendedChatModel)?.trialOnly ? 'Trial' : 'Custom',
        group: 'Assistants',
      };
    });

    const freeModelItems: ModelOption[] = staticModels
      .filter((m) => m.tier === 'free')
      .map((m) => ({
        id: m.name,
        name: m.title,
        description: `${m.provider} model`,
        group: 'Basic Models',
      }));

    const proModelItems: ModelOption[] = staticModels
      .filter((m) => m.tier === 'pro')
      .map((m) => {
        const accessible = isModelAccessible(m.name);
        return {
          id: m.name,
          name: m.title,
          description: `${m.provider} model`,
          badge: 'Pro',
          group: 'Advanced Models',
          locked: !accessible,
          lockedReason: !accessible ? 'Upgrade to Pro to unlock' : undefined,
        };
      });

    return [...difyModelItems, ...freeModelItems, ...proModelItems];
  }, [models, difyBots, staticModels, userPlan, formatDifyLabel]);

  const handleModelChange = useCallback(
    (value: string) => {
      setModel(value);
    },
    []
  );

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = useCallback(
    async (data: {
      message: string;
      files: AttachedFile[];
      pastedContent: PastedContent[];
      model: string;
      isThinkingEnabled: boolean;
    }) => {
      if (
        (!data.message.trim() && data.files.length === 0) ||
        status === 'submitted' ||
        retryAfterSeconds > 0
      ) {
        return;
      }

      // Check if selected model is locked
      const currentUiModel = uiModels.find((m) => m.id === model);
      if (currentUiModel?.locked) {
        toast.error(currentUiModel.lockedReason || 'Upgrade your plan to use this model.', {
          action: { label: 'Upgrade', onClick: () => window.location.href = '/pricing' },
        });
        return;
      }

      try {
        const provider = selectedModel?.provider || 'openrouter';
        
        // Convert files to FileUIPart[] format expected by handleSubmit
        const convertedFiles = await Promise.all(
          data.files.map(async (attachedFile) => {
            const dataUrl = await fileToDataUrl(attachedFile.file);
            return {
              type: attachedFile.file.type.startsWith('image/') ? 'image' : 'file',
              mediaType: attachedFile.file.type,
              url: dataUrl,
              filename: attachedFile.file.name,
            };
          })
        );

        // Also handle pasted content as text attachment or append to message
        // For now, we'll append pasted content to the message text
        let finalMessage = data.message;
        if (data.pastedContent.length > 0) {
          finalMessage += '\n\n' + data.pastedContent.map(pc => pc.content).join('\n\n');
        }

        handleSubmit(
          { 
            text: finalMessage, 
            files: convertedFiles as any // Type assertion to match PromptInputMessage expectation
          }, 
          { 
            model, 
            webSearch, 
            reasoning: data.isThinkingEnabled || reasoning, 
            provider, 
            rating 
          }
        );
      } catch (err) {
        console.error('Error submitting message:', err);
      }
    },
    [
      handleSubmit,
      status,
      selectedModel,
      model,
      webSearch,
      reasoning,
      rating,
      uiModels,
      retryAfterSeconds,
    ]
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
        disabled={status === 'submitted' || disabledByLimit}
      />
      
      {limitError ? (
        <p className="mt-2 text-center text-sm text-amber-600" role="alert">
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
        <p className="text-destructive mt-2 text-sm text-center" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
