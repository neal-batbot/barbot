import { generateId } from 'ai';

import { findChatById, updateChat } from '@/shared/models/chat';
import {
  ChatMessageStatus,
  createChatMessage,
  NewChatMessage,
} from '@/shared/models/chat_message';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';

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
    const difyApiKey = configs.dify_api_key;
    const difyApiUrl = configs.dify_api_url;

    if (!difyApiKey || !difyApiUrl) {
      return new Response('Dify API not configured', { status: 500 });
    }

    // Get conversation_id from chat metadata
    const chatMetadata = chat.metadata ? JSON.parse(chat.metadata) : {};
    const conversationId = chatMetadata.dify_conversation_id || '';

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
    const difyResponse = await fetch(`${difyApiUrl}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: { rating: rating || 'Catalog工业' },
        query,
        response_mode: 'streaming',
        conversation_id: conversationId,
        user: user.id,
        files: [],
      }),
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error('Dify API error:', errorText);
      return new Response(`Dify API error: ${errorText}`, { status: difyResponse.status });
    }

    if (!difyResponse.body) {
      return new Response('No response body from Dify', { status: 500 });
    }

    // Create a transform stream to intercept the response for saving to DB
    let fullAnswer = '';
    let newConversationId = conversationId;
    let difyMessageId = '';

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        // Pass through the chunk
        controller.enqueue(chunk);

        // Also parse it to extract data
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Capture conversation_id
              if (data.conversation_id && !newConversationId) {
                newConversationId = data.conversation_id;
              }

              // Capture message_id
              if (data.message_id && !difyMessageId) {
                difyMessageId = data.message_id;
              }

              // Accumulate answer
              if (data.event === 'message' || data.event === 'agent_message') {
                if (data.answer) {
                  fullAnswer += data.answer;
                }
              }

              // On message_end, save to database
              if (data.event === 'message_end') {
                // Save assistant message
                const assistantMessage: NewChatMessage = {
                  id: generateId().toLowerCase(),
                  chatId,
                  userId: user.id,
                  status: ChatMessageStatus.CREATED,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  role: 'assistant',
                  parts: JSON.stringify([{ type: 'text', text: fullAnswer }]),
                  metadata: JSON.stringify({
                    conversation_id: newConversationId,
                    message_id: difyMessageId,
                  }),
                  model: 'dify/default',
                  provider: 'dify',
                };
                await createChatMessage(assistantMessage);

                // Update chat metadata with conversation_id
                if (newConversationId && newConversationId !== conversationId) {
                  await updateChat(chatId, {
                    metadata: JSON.stringify({
                      ...chatMetadata,
                      dify_conversation_id: newConversationId,
                    }),
                  });
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      },
    });

    // Pipe Dify response through our transform stream
    const responseStream = difyResponse.body.pipeThrough(transformStream);

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



