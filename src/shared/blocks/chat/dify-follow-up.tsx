'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

interface DifyFollowUpProps {
  difyChat: UseDifyChatReturn;
  onProviderChange: (provider: string) => void;
  selectedProvider: string;
}

export function DifyFollowUp({
  difyChat,
  onProviderChange,
  selectedProvider,
}: DifyFollowUpProps) {
  const t = useTranslations('ai.chat.generator');
  const params = useParams();
  const { chat } = useChatContext();
  const { messages, sendMessage, isLoading, error } = difyChat;

  const models: ChatModel[] = [
    {
      title: 'Dify Assistant',
      name: 'dify/default',
      provider: 'dify',
    },
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

  const [model, setModel] = useState<string>(models[0].name);
  const [input, setInput] = useState('');
  const [reasoning, setReasoning] = useState(false);
  const [rating, setRating] = useState<string>('Catalog工业');
  const [mounted, setMounted] = useState(false);
  const autoSentRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedModel = models.find((m) => m.name === model);
  const selectedModelLabel = selectedModel?.title ?? models[0]?.title ?? '';
  const isDifyModel = mounted && selectedModel?.provider === 'dify';

  // Handle model change - notify parent about provider change
  const handleModelChange = useCallback(
    (value: string) => {
      setModel(value);
      const newModel = models.find((m) => m.name === value);
      if (newModel?.provider) {
        onProviderChange(newModel.provider);
      }
    },
    [models, onProviderChange]
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
            {isDifyModel && (
              <PromptInputSelect onValueChange={setRating} value={rating}>
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue>{rating}</PromptInputSelectValue>
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  <PromptInputSelectItem value="Catalog工业">
                    Catalog工业
                  </PromptInputSelectItem>
                  <PromptInputSelectItem value="Automotive汽车">
                    Automotive汽车
                  </PromptInputSelectItem>
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

