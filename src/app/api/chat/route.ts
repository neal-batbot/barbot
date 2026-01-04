import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  createIdGenerator,
  generateId,
  stepCountIs,
  streamText,
  TextUIPart,
  tool,
  UIMessage,
  validateUIMessages,
} from 'ai';
import { z } from 'zod';

import { findChatById } from '@/shared/models/chat';
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
    }: {
      chatId: string;
      message: UIMessage;
      model: string;
      webSearch: boolean;
      reasoning?: boolean;
      provider?: string;
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
      });
    } else {
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
    }
  } catch (e: any) {
    console.log('chat failed:', e);
    return new Response(e.message, { status: 500 });
  }
}

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

  // load previous messages from database
  const previousMessages = await getChatMessages({
    chatId,
    status: ChatMessageStatus.CREATED,
    page: 1,
    limit: 10,
  });

  let validatedMessages: UIMessage[] = [];
  if (previousMessages.length > 0) {
    validatedMessages = previousMessages.reverse().map((message) => ({
      id: message.id,
      role: message.role,
      parts: message.parts ? JSON.parse(message.parts) : [],
    })) as UIMessage[];
  }

  const result = streamText({
    model: openrouter.chat(model),
    messages: convertToModelMessages(validatedMessages),
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
        const assistantMessage: NewChatMessage = {
          id: generateId().toLowerCase(),
          chatId,
          userId: user?.id,
          status: ChatMessageStatus.CREATED,
          createdAt: currentTime,
          updatedAt: currentTime,
          model: model,
          provider: 'openrouter',
          parts: JSON.stringify(lastMessage.parts),
          role: 'assistant',
        };
        await createChatMessage(assistantMessage);
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
}: {
  chatId: string;
  chat: any;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
}) {
  const { getDifyConfig, streamDifyChatMessages, parseDifyStream } = await import(
    '@/extensions/ai/dify'
  );

  const difyConfig = await getDifyConfig();
  if (!difyConfig) {
    throw new Error('Dify API not configured');
  }

  // Get conversation_id from chat metadata
  const chatMetadata = chat.metadata ? JSON.parse(chat.metadata) : {};
  const conversationId = chatMetadata.dify_conversation_id || '';

  // Extract text from message parts
  const textParts = message.parts.filter((part: any) => part.type === 'text');
  const query = textParts.map((part: any) => part.text).join('\n');

  // Call Dify API
  const stream = await streamDifyChatMessages(difyConfig, {
    query,
    response_mode: 'streaming',
    conversation_id: conversationId,
    user: user.id,
    files: [],
  });

  // Create response stream
  const encoder = new TextEncoder();
  let newConversationId = conversationId;
  let fullAnswer = '';

  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of parseDifyStream(stream)) {
          // Save conversation_id from first event
          if (event.conversation_id && !newConversationId) {
            newConversationId = event.conversation_id;
          }

          // Stream answer chunks
          if (event.event === 'agent_message' || event.event === 'message') {
            if (event.answer) {
              fullAnswer += event.answer;
              
              // Format as AI SDK stream format
              const chunk = {
                type: 'text-delta',
                textDelta: event.answer,
              };
              controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
            }
          }

          // Handle message_end event
          if (event.event === 'message_end') {
            // Save assistant message to database
            const assistantMessage: NewChatMessage = {
              id: generateId().toLowerCase(),
              chatId,
              userId: user?.id,
              status: ChatMessageStatus.CREATED,
              createdAt: currentTime,
              updatedAt: currentTime,
              model: model,
              provider: 'dify',
              parts: JSON.stringify([{ type: 'text', text: fullAnswer }]),
              role: 'assistant',
              metadata: JSON.stringify({
                conversation_id: newConversationId,
                message_id: event.message_id,
              }),
            };
            await createChatMessage(assistantMessage);

            // Update chat metadata with conversation_id
            if (newConversationId && newConversationId !== conversationId) {
              const { updateChat } = await import('@/shared/models/chat');
              await updateChat(chatId, {
                metadata: JSON.stringify({
                  ...chatMetadata,
                  dify_conversation_id: newConversationId,
                }),
              });
            }

            // Send finish event
            const finishChunk = {
              type: 'finish',
              finishReason: 'stop',
            };
            controller.enqueue(encoder.encode(`0:${JSON.stringify(finishChunk)}\n`));
          }
        }

        controller.close();
      } catch (error) {
        console.error('Dify stream error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  });
}
