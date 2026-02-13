import { findChatById } from '@/shared/models/chat';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const { chatId, messageId, rating, content } = await req.json();

    if (!chatId || !messageId) {
      return new Response('Missing chatId or messageId', { status: 400 });
    }

    // Check user auth
    const user = await getUserInfo();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const chat = await findChatById(chatId);
    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    if (chat.userId !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    const configs = await getAllConfigs();
    const difyApiUrl = configs.dify_api_url || process.env.DIFY_API_URL;

    if (!difyApiUrl) {
      return new Response('Dify API not configured', { status: 500 });
    }

    let difyApiKey = configs.dify_api_key;
    if (chat.model && chat.model.startsWith('dify/')) {
      const botId = chat.model.replace('dify/', '');
      try {
        const difyBotsConfig = configs.dify_bots;
        if (difyBotsConfig) {
          const bots = JSON.parse(difyBotsConfig);
          const botConfig = bots.find((b: any) => b.id === botId);
          if (botConfig?.api_key) {
            difyApiKey = botConfig.api_key;
          }
        }
      } catch {
        // ignore parsing errors and fall back to global key
      }
    }

    if (!difyApiKey) {
      return new Response('Dify API key not configured', { status: 500 });
    }

    const normalizedDifyApiUrl = difyApiUrl.replace(/\/+$/, '');
    const difyApiBase = normalizedDifyApiUrl.endsWith('/v1')
      ? normalizedDifyApiUrl
      : `${normalizedDifyApiUrl}/v1`;

    const difyResponse = await fetch(
      `${difyApiBase}/messages/${messageId}/feedbacks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: rating ?? null,
          content: content ?? '',
          user: user.id,
        }),
      }
    );

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      return new Response(`Dify API error: ${errorText}`, {
        status: difyResponse.status,
      });
    }

    const data = await difyResponse.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dify feedback error:', error);
    return new Response(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    );
  }
}
