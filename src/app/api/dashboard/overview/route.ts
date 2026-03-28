import { getUserInfo } from '@/shared/models/user';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getRemainingCredits } from '@/shared/models/credit';
import { respData, respErr } from '@/shared/lib/resp';

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const [subscription, remainingCredits] = await Promise.all([
      getCurrentSubscription(user.id),
      getRemainingCredits(user.id),
    ]);

    const credits = {
      balance: remainingCredits,
      used: 0,
      total: remainingCredits,
    };

    return respData({
      subscription: subscription ?? null,
      credits,
      recentUsage: [],
    });
  } catch (e) {
    console.error('[GET /api/dashboard/overview] error:', e);
    return respErr('Failed to fetch overview data');
  }
}
