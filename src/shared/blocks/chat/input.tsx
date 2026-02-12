'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { useTranslations } from 'next-intl';

import { AnimatedChatInput } from '../../../../components/ui/animated-ai-input';
import {
  AttachedFile,
  ModelOption,
  PastedContent,
} from '../../../../components/ui/claude-style-chat-input';
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

  // Static non-Dify models
  const zhipuModels: ExtendedChatModel[] = [
    {
      title: 'GLM-5',
      name: 'glm-5',
      provider: 'zhipu',
    },
  ];

  const [difyBots, setDifyBots] = useState<DifyBot[]>([]);
  const [model, setModel] = useState<string>('');
  const [webSearch, setWebSearch] = useState(false);
  const [reasoning, setReasoning] = useState(false);
  const [rating, setRating] = useState<string>('');
  const [mounted, setMounted] = useState(false);

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
    return [...difyModels, ...zhipuModels];
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

  const uiModels = useMemo<ModelOption[]>(
    () =>
      models.map((m) => ({
        id: m.name,
        name: m.provider === 'dify' ? formatDifyLabel(m.title) : m.title,
        description:
          m.provider === 'dify'
            ? m.ratings?.length
              ? 'Supports rating selection'
              : 'Standard chat'
            : `${m.provider} model`,
      })),
    [models, formatDifyLabel]
  );

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
      if ((!data.message.trim() && data.files.length === 0) || status === 'submitted') return;

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
    [handleSubmit, status, selectedModel, model, webSearch, reasoning, rating]
  );

  return (
    <div className="w-full">
      <AnimatedChatInput
        onSendMessage={handleSendMessage}
        models={uiModels}
        selectedModelId={model}
        onSelectModel={handleModelChange}
        placeholder={t('input_placeholder')}
        disabled={status === 'submitted'}
      />
      
      {error ? (
        <p className="text-destructive mt-2 text-sm text-center" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
