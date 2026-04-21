import { getUserInfo } from '@/shared/models/user';
import { getEnterpriseBySlug, getEnterpriseMembership } from '@/shared/models/enterprise';
import { getAllConfigs } from '@/shared/models/config';
import { respData, respErr } from '@/shared/lib/resp';

export interface EnterpriseDifyBot {
  id: string;
  title: string;
  has_rating: boolean;
  ratings?: string[];
  default_rating?: string;
}

/**
 * GET /api/enterprise/[slug]/bots
 * Returns the list of bots available to an enterprise's members.
 * Requires the caller to be an active member of the enterprise.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const user = await getUserInfo();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const enterprise = await getEnterpriseBySlug(slug);
    if (!enterprise) {
      return new Response('Enterprise not found', { status: 404 });
    }

    const membership = await getEnterpriseMembership(user.id, enterprise.id);
    if (!membership) {
      return new Response('Forbidden', { status: 403 });
    }

    let enterpriseBotIds: string[] = [];
    try {
      enterpriseBotIds = JSON.parse(enterprise.botIds);
    } catch {
      // ignore malformed json
    }

    const configs = await getAllConfigs();
    let allBots: Array<{ id: string; title: string; api_key?: string; has_rating: boolean; ratings?: string[]; default_rating?: string }> = [];
    try {
      allBots = JSON.parse(configs.dify_bots || '[]');
    } catch {
      // ignore
    }

    const enterpriseBots: EnterpriseDifyBot[] = allBots
      .filter((bot) => enterpriseBotIds.includes(bot.id))
      .map((bot) => ({
        id: bot.id,
        title: bot.title,
        has_rating: bot.has_rating,
        ratings: bot.ratings,
        default_rating: bot.default_rating,
      }));

    return respData({
      enterprise: {
        id: enterprise.id,
        slug: enterprise.slug,
        name: enterprise.name,
        logoUrl: enterprise.logoUrl,
      },
      bots: enterpriseBots,
    });
  } catch (e: any) {
    return respErr(`Failed to load enterprise bots: ${e.message}`);
  }
}
