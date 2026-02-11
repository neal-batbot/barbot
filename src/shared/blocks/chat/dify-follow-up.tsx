'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { BrainCircuitIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/shared/components/ai-elements/prompt-input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
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
  const [input, setInput] = useState('');
  const [reasoning, setReasoning] = useState(false);
  const [rating, setRating] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const autoSentRef = useRef(false);

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
            title: 'TI ChatBot Assistant',
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
  const selectedModelLabel = selectedModel?.title ?? models[0]?.title ?? '';
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

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const text = input;
    setInput('');

    await sendMessage(text, { rating });
  }, [input, isLoading, sendMessage, rating]);

  if (!chat) {
    return null;
  }

  // Map status for PromptInputSubmit
  const status = isLoading ? 'submitted' : 'ready';

  return (
    <div className="w-full">
      <PromptInput
        onSubmit={handleSubmit}
        className="mt-4"
        globalDrop
        multiple
      >
        <PromptInputBody>
          <PromptInputTextarea
            className="overflow-hidden p-4 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder={t('input_placeholder')}
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <div className="flex items-center">
              <Switch
                id="prompt-reasoning-switch"
                checked={reasoning}
                onCheckedChange={setReasoning}
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
            <PromptInputSelect onValueChange={handleModelChange} value={model}>
              <PromptInputSelectTrigger>
                <PromptInputSelectValue>
                  {selectedModelLabel}
                </PromptInputSelectValue>
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {models.map((m) => (
                  <PromptInputSelectItem key={m.name} value={m.name}>
                    {m.title}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
            {isDifyModel && selectedModel?.ratings && selectedModel.ratings.length > 0 && (
              <PromptInputSelect onValueChange={setRating} value={rating}>
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue>{rating}</PromptInputSelectValue>
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {selectedModel.ratings.map((r) => (
                    <PromptInputSelectItem key={r} value={r}>
                      {r}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            )}
          </PromptInputTools>
          <PromptInputSubmit disabled={!input || isLoading} status={status} />
        </PromptInputFooter>
      </PromptInput>
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

