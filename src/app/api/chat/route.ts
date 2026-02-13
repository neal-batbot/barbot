import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  convertToModelMessages,
  createIdGenerator,
  generateId,
  streamText,
  UIMessage,
} from 'ai';

import { findChatById } from '@/shared/models/chat';

// Force dynamic to ensure streaming works properly
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow longer response time for AI
import {
  ChatMessageStatus,
  createChatMessage,
  getChatMessages,
  NewChatMessage,
} from '@/shared/models/chat_message';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const {
      chatId,
      message,
      model,
      webSearch,
      reasoning,
      provider: requestProvider,
      rating,
    }: {
      chatId: string;
      message: UIMessage;
      model: string;
      webSearch: boolean;
      reasoning?: boolean;
      provider?: string;
      rating?: string;
    } = await req.json();

    if (!chatId || !model) {
      throw new Error('invalid params');
    }

    if (!message || !message.parts || message.parts.length === 0) {
      throw new Error('invalid message');
    }

    // check user sign
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // check chat
    const chat = await findChatById(chatId);
    if (!chat) {
      throw new Error('chat not found');
    }

    if (chat.userId !== user?.id) {
      throw new Error('no permission to access this chat');
    }

    const configs = await getAllConfigs();
    const currentTime = new Date();
    
    // Determine provider from request or model name
    const provider = requestProvider || (model.startsWith('dify/') ? 'dify' : 'openrouter');

    const metadata = {
      model,
      webSearch,
      reasoning,
      provider,
    };

    // save user message to database
    const userMessage: NewChatMessage = {
      id: generateId().toLowerCase(),
      chatId,
      userId: user?.id,
      status: ChatMessageStatus.CREATED,
      createdAt: currentTime,
      updatedAt: currentTime,
      role: 'user',
      parts: JSON.stringify(message.parts),
      metadata: JSON.stringify(metadata),
      model: model,
      provider: provider,
    };
    await createChatMessage(userMessage);

    // Route to different providers
    if (provider === 'dify') {
      return handleDifyChat({
        chatId,
        chat,
        message,
        user,
        configs,
        currentTime,
        model,
        rating,
      });
    }

    if (provider === 'openai') {
      return handleOpenAIChat({
        chatId,
        message,
        user,
        configs,
        currentTime,
        model,
        reasoning,
      });
    }

    if (provider === 'anthropic') {
      return handleAnthropicChat({
        chatId,
        message,
        user,
        configs,
        currentTime,
        model,
        reasoning,
      });
    }

    if (provider === 'zhipu') {
      return handleZhipuChat({
        chatId,
        message,
        user,
        configs,
        currentTime,
        model,
        reasoning,
      });
    }

    // OpenRouter (default)
    return handleOpenRouterChat({
      chatId,
      message,
      user,
      configs,
      currentTime,
      model,
      reasoning,
    });
  } catch (e: any) {
    console.log('chat failed:', e);
    return new Response(e.message, { status: 500 });
  }
}

async function getValidatedMessages(chatId: string) {
  const previousMessages = await getChatMessages({
    chatId,
    status: ChatMessageStatus.CREATED,
    page: 1,
    limit: 10,
  });

  if (!previousMessages.length) {
    return [];
  }

  return previousMessages.reverse().map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts ? JSON.parse(message.parts) : [],
  })) as UIMessage[];
}

async function saveAssistantMessage({
  chatId,
  userId,
  currentTime,
  model,
  provider,
  parts,
}: {
  chatId: string;
  userId: string;
  currentTime: Date;
  model: string;
  provider: string;
  parts: any[];
}) {
  const assistantMessage: NewChatMessage = {
    id: generateId().toLowerCase(),
    chatId,
    userId,
    status: ChatMessageStatus.CREATED,
    createdAt: currentTime,
    updatedAt: currentTime,
    model: model,
    provider: provider,
    parts: JSON.stringify(parts),
    role: 'assistant',
  };
  await createChatMessage(assistantMessage);
}

const normalizeBaseUrl = (url?: string, suffix?: string) => {
  if (!url) return undefined;
  const trimmed = url.replace(/\/+$/, '');
  if (!suffix) {
    return trimmed;
  }
  return trimmed.endsWith(suffix) ? trimmed : `${trimmed}${suffix}`;
};

async function handleOpenRouterChat({
  chatId,
  message,
  user,
  configs,
  currentTime,
  model,
  reasoning,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
}) {
  const openrouterApiKey = configs.openrouter_api_key;
  if (!openrouterApiKey) {
    throw new Error('openrouter_api_key is not set');
  }

  const openrouterBaseUrl = configs.openrouter_base_url;

  const openrouter = createOpenRouter({
    apiKey: openrouterApiKey,
    baseURL: openrouterBaseUrl ? openrouterBaseUrl : undefined,
  });

  const validatedMessages = await getValidatedMessages(chatId);

  const modelMessages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: openrouter.chat(model as any),
    messages: modelMessages,
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: Boolean(reasoning),
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        await saveAssistantMessage({
          chatId,
          userId: user?.id,
          currentTime,
          model,
          provider: 'openrouter',
          parts: lastMessage.parts,
        });
      }
    },
  });
}

async function handleOpenAIChat({
  chatId,
  message,
  user,
  configs,
  currentTime,
  model,
  reasoning,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
}) {
  const openaiApiKey = configs.openai_api_key || process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('openai_api_key is not set');
  }

  const openaiBaseUrl = normalizeBaseUrl(
    configs.openai_base_url || process.env.OPENAI_BASE_URL,
    '/v1'
  );

  const openai = createOpenAI({
    apiKey: openaiApiKey,
    baseURL: openaiBaseUrl ? openaiBaseUrl : undefined,
  });

  const validatedMessages = await getValidatedMessages(chatId);

  const modelMessages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: openai.chat(model),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: Boolean(reasoning),
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        await saveAssistantMessage({
          chatId,
          userId: user?.id,
          currentTime,
          model,
          provider: 'openai',
          parts: lastMessage.parts,
        });
      }
    },
  });
}

async function handleAnthropicChat({
  chatId,
  message,
  user,
  configs,
  currentTime,
  model,
  reasoning,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
}) {
  const anthropicApiKey =
    configs.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new Error('anthropic_api_key is not set');
  }

  const anthropicBaseUrl = normalizeBaseUrl(
    configs.anthropic_base_url || process.env.ANTHROPIC_BASE_URL,
    '/v1'
  );
  const anthropicVersion =
    configs.anthropic_version || process.env.ANTHROPIC_VERSION || '2023-06-01';

  const anthropic = createAnthropic({
    apiKey: anthropicApiKey,
    baseURL: anthropicBaseUrl ? anthropicBaseUrl : undefined,
    headers: {
      'anthropic-version': anthropicVersion,
    },
  });

  const validatedMessages = await getValidatedMessages(chatId);

  const modelMessages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: anthropic.messages(model),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: Boolean(reasoning),
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        await saveAssistantMessage({
          chatId,
          userId: user?.id,
          currentTime,
          model,
          provider: 'anthropic',
          parts: lastMessage.parts,
        });
      }
    },
  });
}

async function handleZhipuChat({
  chatId,
  message,
  user,
  configs,
  currentTime,
  model,
  reasoning,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
}) {
  const zhipuApiKey = configs.zhipu_api_key || process.env.ZHIPU_API_KEY;
  if (!zhipuApiKey) {
    throw new Error('zhipu_api_key is not set');
  }

  const zhipuBaseUrl = normalizeBaseUrl(
    configs.zhipu_base_url ||
      process.env.ZHIPU_BASE_URL ||
      'https://open.bigmodel.cn/api/paas/v4',
    '/v4'
  );

  const zhipu = createOpenAI({
    apiKey: zhipuApiKey,
    baseURL: zhipuBaseUrl ? zhipuBaseUrl : undefined,
  });

  const validatedMessages = await getValidatedMessages(chatId);

  const modelMessages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: zhipu.chat(model),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: Boolean(reasoning),
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        await saveAssistantMessage({
          chatId,
          userId: user?.id,
          currentTime,
          model,
          provider: 'zhipu',
          parts: lastMessage.parts,
        });
      }
    },
  });
}

async function handleDifyChat({
  chatId,
  chat,
  message,
  user,
  configs,
  currentTime,
  model,
  rating,
}: {
  chatId: string;
  chat: any;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  rating?: string;
}) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/a4799810-f105-441c-94c0-b907c26d1e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:handleDifyChat:entry',message:'handleDifyChat called',data:{chatId,model,rating},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})}).catch(()=>{});
  // #endregion

  const { streamDifyChatMessages, createDifyOpenAIStream } = await import(
    '@/extensions/ai/dify'
  );

  // Extract botId from model name (e.g., "dify/ti-chatbot" -> "ti-chatbot")
  const botId = model.replace('dify/', '');

  // Get Dify config - try bot-specific config first, then fall back to global
  let difyApiKey: string | undefined;
  let difyApiUrl: string | undefined;
  let botConfig: any = null;

  // Try to get bot-specific API key from dify_bots config
  if (configs.dify_bots) {
    try {
      const botsConfig = JSON.parse(configs.dify_bots);
      const bot = botsConfig.find((b: any) => b.id === botId);
      if (bot && bot.api_key) {
        difyApiKey = bot.api_key;
        botConfig = bot; // Save complete bot configuration
      }
    } catch (e) {
      console.warn('Failed to parse dify_bots config:', e);
    }
  }

  // Fall back to global dify_api_key if not found in bots config
  if (!difyApiKey) {
    difyApiKey = configs.dify_api_key || process.env.DIFY_API_KEY;
  }

  // Get API URL from config or env
  difyApiUrl = configs.dify_api_url || process.env.DIFY_API_URL;

  if (!difyApiKey || !difyApiUrl) {
    throw new Error('Dify API not configured');
  }

  const difyConfig = { apiKey: difyApiKey, apiUrl: difyApiUrl };

  // Get conversation_id from chat metadata
  const chatMetadata = chat.metadata ? JSON.parse(chat.metadata) : {};
  let conversationId = chatMetadata.dify_conversation_id || '';

  // Extract text from message parts
  const textParts = message.parts.filter((part: any) => part.type === 'text');
  const query = textParts.map((part: any) => part.text).join('\n');

  // Build inputs object - only include rating if bot supports it
  const inputs: Record<string, any> = {};

  // Only pass rating if bot has has_rating: true
  if (botConfig && botConfig.has_rating) {
    if (rating) {
      inputs.rating = rating;
    } else if (botConfig.default_rating) {
      inputs.rating = botConfig.default_rating;
    } else if (botConfig.ratings && botConfig.ratings.length > 0) {
      inputs.rating = botConfig.ratings[0];
    }
  }
  // If bot's has_rating is false, don't pass rating parameter at all

  // Call Dify API with dynamically built inputs
  // Handle case where conversation_id might not exist in Dify (404 error)
  let difyStream: ReadableStream;
  try {
    const requestBody: any = {
      inputs,
      query,
      response_mode: 'streaming',
      user: user.id,
      files: [],
    };
    
    // Only include conversation_id if it's not empty
    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }

    difyStream = await streamDifyChatMessages(difyConfig, requestBody);
  } catch (err: any) {
    // If we get a 404 error about conversation not existing, retry without conversation_id
    const is404Error = err.status === 404 || (err.message && err.message.includes('404'));
    const errorMessage = err.message || '';
    const errorData = err.data || {};
    
    // Check if error is about conversation not existing
    const isConversationNotFound = 
      errorData.code === 'not_found' ||
      (errorData.message && errorData.message.includes('Conversation Not Exists')) ||
      errorMessage.includes('Conversation Not Exists') ||
      (errorMessage.includes('conversation') && errorMessage.includes('Not Exists'));
    
    if (is404Error && isConversationNotFound && conversationId) {
      console.warn(`[Dify] Conversation ${conversationId} not found, retrying without conversation_id`);
      conversationId = ''; // Clear invalid conversation_id
      
      // Update chat metadata to remove invalid conversation_id
      const { updateChat } = await import('@/shared/models/chat');
      await updateChat(chatId, {
        metadata: JSON.stringify({
          ...chatMetadata,
          dify_conversation_id: '',
        }),
      });

      // Retry without conversation_id
      const requestBody: any = {
        inputs,
        query,
        response_mode: 'streaming',
        user: user.id,
        files: [],
      };
      difyStream = await streamDifyChatMessages(difyConfig, requestBody);
    } else {
      throw err;
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/a4799810-f105-441c-94c0-b907c26d1e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:handleDifyChat:difyStreamReady',message:'Dify stream ready',timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})}).catch(()=>{});
  // #endregion

  // Create OpenAI SSE formatted stream
  const { stream: readable } = createDifyOpenAIStream(difyStream, {
    showNodeEvents: true,
    onMessageEnd: async (state) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/a4799810-f105-441c-94c0-b907c26d1e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:stream:messageEnd',message:'Dify message_end, saving to DB',data:{fullAnswerLength:state.fullAnswer.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})}).catch(()=>{});
      // #endregion

      // Save assistant message to database
      try {
        const assistantMessage: NewChatMessage = {
          id: generateId().toLowerCase(),
          chatId,
          userId: user?.id,
          status: ChatMessageStatus.CREATED,
          createdAt: currentTime,
          updatedAt: currentTime,
          model: model,
          provider: 'dify',
          parts: JSON.stringify([{ type: 'text', text: state.fullAnswer }]),
          role: 'assistant',
          metadata: JSON.stringify({
            conversation_id: state.conversationId,
            message_id: state.messageId,
            task_id: state.taskId,
            dify_metadata: state.metadata || null,
          }),
        };
        await createChatMessage(assistantMessage);

        // Update chat metadata with conversation_id
        if (state.conversationId && state.conversationId !== conversationId) {
          const { updateChat } = await import('@/shared/models/chat');
          await updateChat(chatId, {
            metadata: JSON.stringify({
              ...chatMetadata,
              dify_conversation_id: state.conversationId,
            }),
          });
        }

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/a4799810-f105-441c-94c0-b907c26d1e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:stream:dbSaved',message:'Message saved to DB successfully',data:{messageId:assistantMessage.id,fullAnswerLength:state.fullAnswer.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})}).catch(()=>{});
        // #endregion
      } catch (dbErr: any) {
        console.error('[Dify] DB save error:', dbErr);
      }
    },
    onError: (err) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/a4799810-f105-441c-94c0-b907c26d1e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:stream:error',message:'Stream error',data:{error:(err as any)?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})}).catch(()=>{});
      // #endregion
      console.error('[Dify] Stream error:', err);
    },
  });

  // Return Response with SSE headers to prevent buffering
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
