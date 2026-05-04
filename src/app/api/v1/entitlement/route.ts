import { z } from 'zod';

import { getCurrentSubscription } from '@/shared/models/subscription';
import { getRemainingCredits } from '@/shared/models/credit';
import { findPlanEntitlement, parseFeatures } from '@/shared/models/plan-entitlement';
import { respData } from '@/shared/lib/resp';
import { getBillingUsageForPeriod } from '@/shared/models/billing-event';
import { resolvePlatformAuth, unauthorizedResponse } from '@/shared/lib/platform-auth';

const querySchema = z.object({
  product: z.string().min(1),
});

const FREE_PLAN = 'free';

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

function getCurrentPeriod(subscription: any): { start: Date; end: Date } {
  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    return {
      start: new Date(subscription.currentPeriodStart),
      end: new Date(subscription.currentPeriodEnd),
    };
  }
  const start = startOfCurrentMonth();
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(req: Request) {
  try {
    const identity = await resolvePlatformAuth(req);
    if (!identity) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({ product: searchParams.get('product') });
    if (!parsed.success) {
      return Response.json({ code: -1, message: 'product parameter is required' }, { status: 400 });
    }

    const { product } = parsed.data;
    const userId = identity.userId;

    const [subscription, remainingCredits] = await Promise.all([
      getCurrentSubscription(userId),
      getRemainingCredits(userId),
    ]);

    const planName = subscription?.planName ?? FREE_PLAN;
    const entitlement = await findPlanEntitlement(planName, product);

    // Fall back to free plan if no entitlement found for current plan
    const effectiveEntitlement =
      entitlement ?? (planName !== FREE_PLAN ? await findPlanEntitlement(FREE_PLAN, product) : null);

    const allowed = effectiveEntitlement?.isEnabled ?? false;
    const features = parseFeatures(effectiveEntitlement?.features ?? null);
    const period = getCurrentPeriod(subscription);
    const usage = await getBillingUsageForPeriod({
      userId,
      startDate: period.start,
      endDate: period.end,
    });
    const quotaTokens = effectiveEntitlement?.quotaTokens ?? 0;
    const usedTokens = usage.billableTokens;
    const remainingTokens = quotaTokens > 0 ? Math.max(quotaTokens - usedTokens, 0) : 0;

    return respData({
      allowed,
      product,
      plan: planName,
      subscription_status: subscription?.status ?? null,
      quota: {
        tokens: quotaTokens,
        used_tokens: usedTokens,
        remaining_tokens: remainingTokens,
        requests: effectiveEntitlement?.quotaRequests ?? null,
        remaining_credits: remainingCredits,
      },
      features,
      period_start: period.start.toISOString(),
      period_end: period.end.toISOString(),
    });
  } catch (e) {
    console.error('[GET /api/v1/entitlement] error:', e);
    return Response.json({ code: -1, message: 'Failed to check entitlement' }, { status: 500 });
  }
}
