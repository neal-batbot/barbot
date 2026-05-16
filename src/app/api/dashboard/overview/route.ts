import { getUserInfo } from '@/shared/models/user';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUsageLogs, getUsageSummary } from '@/shared/models/usage-log';
import { respData, respErr } from '@/shared/lib/resp';

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const [subscription, remainingCredits, usage, recentUsage] = await Promise.all([
      getCurrentSubscription(user.id),
      getRemainingCredits(user.id),
      getUsageSummary({
        userId: user.id,
        startDate,
        endDate,
        groupBy: 'product',
      }),
      getUsageLogs({
        userId: user.id,
        startDate,
        endDate,
        page: 1,
        limit: 8,
      }),
    ]);

    const credits = {
      balance: remainingCredits,
      used: usage.summary.totalTokens,
      total: remainingCredits + usage.summary.totalTokens,
    };

    return respData({
      subscription: subscription ?? null,
      credits,
      usage: usage.summary,
      recentUsage: recentUsage.data,
    });
  } catch (e) {
    console.error('[GET /api/dashboard/overview] error:', e);
    return respErr('Failed to fetch overview data');
  }
}
