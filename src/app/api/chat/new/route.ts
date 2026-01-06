import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import { ChatStatus, createChat, NewChat } from '@/shared/models/chat';
import { getUserInfo } from '@/shared/models/user';
import { getAllConfigs } from '@/shared/models/config';

export async function POST(req: Request) {
  try {
    const { message, body } = await req.json();
    if (!message || !message.text) {
      throw new Error('message is required');
    }
    if (!body || !body.model) {
      throw new Error('please select a model');
    }

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // todo: check user credits

    // Determine provider from model
    let provider = 'openrouter';
    let title = message.text.substring(0, 100);

    if (body.model.startsWith('dify/')) {
      provider = 'dify';

      // Get Dify bots config to use bot title
      try {
        const configs = await getAllConfigs();
        const difyBotsConfig = configs.dify_bots;

        if (difyBotsConfig) {
          const bots = JSON.parse(difyBotsConfig);
          const botId = body.model.replace('dify/', '');
          const bot = bots.find((b: any) => b.id === botId);

          if (bot) {
            title = bot.title;
          }
        }
      } catch (e) {
        console.error('Failed to get bot title:', e);
        // Fallback to message text
        title = message.text.substring(0, 100);
      }
    }

    const chatId = generateId().toLowerCase();
    const currentTime = new Date();

    const parts = [
      {
        type: 'text',
        text: message.text,
      },
    ];

    const chat: NewChat = {
      id: chatId,
      userId: user.id,
      status: ChatStatus.CREATED,
      createdAt: currentTime,
      updatedAt: currentTime,
      model: body.model,
      provider: provider,
      title: title,
      parts: '',
      // parts: JSON.stringify(parts),
      metadata: JSON.stringify(body),
      content: JSON.stringify(message),
    };

    await createChat(chat);

    return respData(chat);
  } catch (e: any) {
    console.log('new chat failed:', e);
    return respErr(`new chat failed: ${e.message}`);
  }
}
