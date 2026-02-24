import { generateId } from 'ai';

import { PERMISSIONS } from '@/core/rbac';
import { findChatById, updateChat } from '@/shared/models/chat';
import {
  ChatMessageStatus,
  createChatMessage,
  NewChatMessage,
} from '@/shared/models/chat_message';
import { createDifyOpenAIStream } from '@/extensions/ai/dify';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

// Force dynamic to ensure streaming works properly
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { chatId, query, rating } = await req.json();

    if (!chatId || !query) {
      return new Response('Missing chatId or query', { status: 400 });
    }

    // Check user auth
    const user = await getUserInfo();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const allowed = await hasPermission(user.id, PERMISSIONS.CHAT_MODEL_USE);
    if (!allowed) {
      return new Response('Forbidden', { status: 403 });
    }

    // Check chat exists and belongs to user
    const chat = await findChatById(chatId);
    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    if (chat.userId !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // Get Dify config
    const configs = await getAllConfigs();
    const difyApiUrl = configs.dify_api_url || process.env.DIFY_API_URL;

    if (!difyApiUrl) {
      return new Response('Dify API not configured', { status: 500 });
    }

    // Determine which bot's API key to use based on chat.model
    let difyApiKey = configs.dify_api_key; // Fallback to global key
    let botConfig = null;

    if (chat.model && chat.model.startsWith('dify/')) {
      const botId = chat.model.replace('dify/', '');

      try {
        const difyBotsConfig = configs.dify_bots;
        if (difyBotsConfig) {
          const bots = JSON.parse(difyBotsConfig);
          botConfig = bots.find((b: any) => b.id === botId);

          if (botConfig && botConfig.api_key) {
            difyApiKey = botConfig.api_key;
            console.log('[DEBUG POST /api/dify/chat] Using bot API key for:', botConfig.title);
          } else {
            console.log('[DEBUG POST /api/dify/chat] Bot not found or no API key, using fallback');
          }
        }
      } catch (e) {
        console.error('[DEBUG POST /api/dify/chat] Failed to parse dify_bots config:', e);
      }
    }

    if (!difyApiKey) {
      return new Response('Dify API key not configured', { status: 500 });
    }

    // Get conversation_id from chat metadata
    const chatMetadata = chat.metadata ? JSON.parse(chat.metadata) : {};
    const conversationId = chatMetadata.dify_conversation_id || '';

    // Debug logging
    console.log('[DEBUG POST /api/dify/chat] Chat ID:', chatId);
    console.log('[DEBUG POST /api/dify/chat] Chat Model:', chat.model);
    console.log('[DEBUG POST /api/dify/chat] Conversation ID:', conversationId || '(empty)');
    console.log('[DEBUG POST /api/dify/chat] Using bot:', botConfig?.title || 'default');
    console.log('[DEBUG POST /api/dify/chat] API Key:', difyApiKey.substring(0, 15) + '...');
    const normalizedDifyApiUrl = difyApiUrl.replace(/\/+$/, '');
    const difyApiBase = normalizedDifyApiUrl.endsWith('/v1')
      ? normalizedDifyApiUrl
      : `${normalizedDifyApiUrl}/v1`;

    console.log('[DEBUG POST /api/dify/chat] API URL:', difyApiBase);

    // Save user message to database
    const currentTime = new Date();
    const userMessage: NewChatMessage = {
      id: generateId().toLowerCase(),
      chatId,
      userId: user.id,
      status: ChatMessageStatus.CREATED,
      createdAt: currentTime,
      updatedAt: currentTime,
      role: 'user',
      parts: JSON.stringify([{ type: 'text', text: query }]),
      metadata: JSON.stringify({ rating }),
      model: 'dify/default',
      provider: 'dify',
    };
    await createChatMessage(userMessage);

    // Call Dify API
    // Determine if we should send rating based on bot config
    const inputs: Record<string, any> = {};
    if (rating) {
      inputs.rating = rating;
    } else if (botConfig && botConfig.has_rating && botConfig.ratings && botConfig.ratings.length > 0) {
      // Only use default rating if bot has rating feature
      inputs.rating = botConfig.default_rating || botConfig.ratings[0];
    }
    // If bot doesn't have rating feature, don't send rating at all

    // Build request body
    const requestBody: Record<string, any> = {
      inputs,
      query,
      response_mode: 'streaming',
      user: user.id,
      files: [],
    };

    // Only include conversation_id if it exists and is not empty
    if (conversationId && conversationId.trim()) {
      requestBody.conversation_id = conversationId;
      console.log('[DEBUG POST /api/dify/chat] Using existing conversation_id:', conversationId);
    } else {
      console.log('[DEBUG POST /api/dify/chat] Starting new conversation (no conversation_id)');
    }

    const difyResponse = await fetch(`${difyApiBase}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error('Dify API error:', errorText);

      // Special handling for 404 conversation not found error
      if (difyResponse.status === 404 && conversationId) {
        console.log('[DEBUG] Conversation not found, clearing invalid conversation_id from database...');

        try {
          // Clear the invalid conversation_id from database
          await updateChat(chatId, {
            metadata: JSON.stringify({
              ...chatMetadata,
              dify_conversation_id: undefined,
            }),
          });

          console.log('[DEBUG] Conversation_id cleared. User should retry the message.');
        } catch (e) {
          console.error('[DEBUG] Failed to clear conversation_id:', e);
        }

        // Return a clear error message to the client
        return new Response(
          JSON.stringify({
            error: 'conversation_not_found',
            message: 'The conversation has expired or been deleted. A new conversation will be created automatically when you send your message again.',
          }),
          { status: 404 }
        );
      }

      return new Response(`Dify API error: ${errorText}`, { status: difyResponse.status });
    }

    if (!difyResponse.body) {
      return new Response('No response body from Dify', { status: 500 });
    }

    const { stream: responseStream } = createDifyOpenAIStream(difyResponse.body, {
      model: chat.model || 'dify/default',
      showNodeEvents: true,
      onMessageEnd: async (state) => {
        const assistantMessage: NewChatMessage = {
          id: generateId().toLowerCase(),
          chatId,
          userId: user.id,
          status: ChatMessageStatus.CREATED,
          createdAt: currentTime,
          updatedAt: currentTime,
          role: 'assistant',
          parts: JSON.stringify([{ type: 'text', text: state.fullAnswer }]),
          metadata: JSON.stringify({
            conversation_id: state.conversationId,
            message_id: state.messageId,
            task_id: state.taskId,
            dify_metadata: state.metadata || null,
          }),
          model: 'dify/default',
          provider: 'dify',
        };
        await createChatMessage(assistantMessage);

        if (state.conversationId && state.conversationId !== conversationId) {
          await updateChat(chatId, {
            metadata: JSON.stringify({
              ...chatMetadata,
              dify_conversation_id: state.conversationId,
            }),
          });
        }
      },
    });

    // Return the transformed stream
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Dify chat error:', error);
    return new Response(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    );
  }
}



