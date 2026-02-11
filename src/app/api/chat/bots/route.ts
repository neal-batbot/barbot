import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';

export interface DifyBot {
  id: string;
  title: string;
  has_rating: boolean;
  ratings?: string[];
  default_rating?: string;
}

export interface DifyBotConfig extends DifyBot {
  api_key: string;
}

/**
 * GET /api/chat/bots
 * Returns the list of available Dify bots (without api_key for security)
 */
export async function GET() {
  try {
    const configs = await getAllConfigs();
    const botsConfig = configs.dify_bots;

    if (!botsConfig) {
      // Return default bot if no configuration exists
      return respData([
        {
          id: 'default',
          title: 'TI ChatBot Assistant',
          has_rating: true,
          ratings: ['Catalog工业', 'Automotive汽车'],
          default_rating: 'Catalog工业',
        },
      ]);
    }

    try {
      const botsArray: DifyBotConfig[] = JSON.parse(botsConfig);

      // Remove api_key from response for security
      const bots: DifyBot[] = botsArray.map((bot) => ({
        id: bot.id,
        title: bot.title,
        has_rating: bot.has_rating,
        ratings: bot.ratings || [],
        default_rating: bot.default_rating,
      }));

      if (!bots.length) {
        return respData([
          {
            id: 'default',
            title: 'TI ChatBot Assistant',
            has_rating: true,
            ratings: ['Catalog工业', 'Automotive汽车'],
            default_rating: 'Catalog工业',
          },
        ]);
      }

      return respData(bots);
    } catch (parseError) {
      console.error('Failed to parse dify_bots config:', parseError);
      return respErr('Invalid dify_bots configuration');
    }
  } catch (e: any) {
    console.log('get bots failed:', e);
    return respErr(`get bots failed: ${e.message}`);
  }
}


