import { z } from 'zod';

import { findApikeyByKey } from '@/shared/models/apikey';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getRemainingCredits } from '@/shared/models/credit';
import { findPlanEntitlement, parseFeatures } from '@/shared/models/plan-entitlement';
import { respData } from '@/shared/lib/resp';

const querySchema = z.object({
  product: z.string().min(1),
});

const FREE_PLAN = 'free';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
    }

    const apiKeyValue = authHeader.slice(7);
    const apikeyRecord = await findApikeyByKey(apiKeyValue);
    if (!apikeyRecord) {
      return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({ product: searchParams.get('product') });
    if (!parsed.success) {
      return Response.json({ code: -1, message: 'product parameter is required' }, { status: 400 });
    }

    const { product } = parsed.data;
    const userId = apikeyRecord.userId;

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

    return respData({
      allowed,
      product,
      plan: planName,
      subscription_status: subscription?.status ?? null,
      quota: {
        tokens: effectiveEntitlement?.quotaTokens ?? null,
        requests: effectiveEntitlement?.quotaRequests ?? null,
        remaining_credits: remainingCredits,
      },
      features,
    });
  } catch (e) {
    console.error('[GET /api/v1/entitlement] error:', e);
    return Response.json({ code: -1, message: 'Failed to check entitlement' }, { status: 500 });
  }
}
