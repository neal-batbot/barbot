'use client';

import { useState, useEffect, useMemo } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { BrainCircuitIcon, GlobeIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/shared/components/ai-elements/prompt-input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { useChatContext } from '@/shared/contexts/chat';
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

  // Static OpenRouter models
  const staticModels: ExtendedChatModel[] = [
    {
      title: 'Kimi K2 Thinking',
      name: 'moonshotai/kimi-k2-thinking',
      provider: 'openrouter',
    },
    {
      title: 'Deepseek R1',
      name: 'deepseek/deepseek-r1',
      provider: 'openrouter',
    },
    {
      title: 'GPT-5',
      name: 'openai/gpt-5',
      provider: 'openrouter',
    },
    {
      title: 'Claude 4.5 Sonnet',
      name: 'anthropic/claude-4.5-sonnet',
      provider: 'openrouter',
    },
  ];

  const [difyBots, setDifyBots] = useState<DifyBot[]>([]);
  const [model, setModel] = useState<string>('');
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [reasoning, setReasoning] = useState(false);
  const [rating, setRating] = useState<string>('');
  const [mounted, setMounted] = useState(false);

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
            title: 'TI ChatBot Assistant',
            has_rating: true,
            ratings: ['Catalog工业', 'Automotive汽车'],
            default_rating: 'Catalog工业',
          },
        ]);
        setModel('dify/default');
        setRating('Catalog工业');
      });
  }, []);

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

  const selectedModelLabel =
    models.find((item) => item.name === model)?.title ?? models[0]?.title ?? '';
  const selectedModel = models.find((m) => m.name === model);
  const isDifyModel = mounted && selectedModel?.provider === 'dify';
  const showRatingSelector =
    isDifyModel && selectedModel?.has_rating && selectedModel?.ratings?.length;

  return (
    <div className="w-full">
      <PromptInput
        onSubmit={async (message) => {
          try {
            const provider = selectedModel?.provider || 'openrouter';
            handleSubmit(message, { model, webSearch, reasoning, provider, rating });
            setInput('');
          } catch (err) {
            // Allow parent to control error display/state. Do not clear input.
          }
        }}
        className="mt-4"
        globalDrop
        multiple
      >
        {/* <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader> */}
        <PromptInputBody>
          <PromptInputTextarea
            className="overflow-hidden p-4 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder={t('input_placeholder')}
            onChange={(e) => {
              const value = e.target.value;
              setInput(value);
              onInputChange?.(value);
            }}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            {/* <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputButton
            variant={webSearch ? 'default' : 'ghost'}
            onClick={() => setWebSearch(!webSearch)}
          >
            <GlobeIcon size={16} />
            <span>Search</span>
          </PromptInputButton> */}
            <div className="flex items-center">
              <Switch
                id="prompt-reasoning-switch"
                checked={reasoning}
                onCheckedChange={setReasoning}
                // className="peer sr-only"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label
                    htmlFor="prompt-reasoning-switch"
                    className="text-muted-foreground hover:text-foreground peer-data-[state=checked]:text-primary inline-flex cursor-pointer items-center rounded-md p-2 transition-colors"
                  >
                    <BrainCircuitIcon size={16} />
                  </Label>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Reasoning</TooltipContent>
              </Tooltip>
            </div>
            <PromptInputSelect
              onValueChange={(value) => {
                setModel(value);
              }}
              value={model}
            >
              <PromptInputSelectTrigger>
                <PromptInputSelectValue>
                  {selectedModelLabel}
                </PromptInputSelectValue>
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {models.map((modelItem) => (
                  <PromptInputSelectItem key={modelItem.name} value={modelItem.name}>
                    {modelItem.title}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
            {showRatingSelector && selectedModel?.ratings && (
              <PromptInputSelect
                onValueChange={(value) => {
                  setRating(value);
                }}
                value={rating}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue>{rating}</PromptInputSelectValue>
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {selectedModel.ratings.map((ratingOption) => (
                    <PromptInputSelectItem key={ratingOption} value={ratingOption}>
                      {ratingOption}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            )}
          </PromptInputTools>
          <PromptInputSubmit
            disabled={!input || status === 'submitted'}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
