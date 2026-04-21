import { validateDesktopToken } from '@/shared/models/desktop-auth';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getPlanEntitlements } from '@/shared/models/plan-entitlement';
import { resolveEntitlement } from '@/shared/services/entitlement';

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function resolvePlan(subscription: Awaited<ReturnType<typeof getCurrentSubscription>>): string {
  const value = (subscription?.planName || subscription?.productId || '').toLowerCase();
  if (value.includes('team')) return 'team';
  if (value.includes('pro') || value.includes('premium')) return 'pro';
  return 'free';
}

export async function GET(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return Response.json({ error: 'Authorization header required' }, { status: 401 });
  }

  const session = await validateDesktopToken(token);
  if (!session) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { userId } = session;

  const [subscription, entitlement] = await Promise.all([
    getCurrentSubscription(userId),
    resolveEntitlement(userId),
  ]);

  const plan = resolvePlan(subscription);
  const planEntitlements = await getPlanEntitlements(plan);

  const enabledProducts = planEntitlements
    .filter((e) => e.isEnabled)
    .map((e) => e.productCode);

  return Response.json({
    userId,
    plan,
    products: enabledProducts,
    quota: {
      tokens: entitlement.quotaTokens,
      used: entitlement.usedTokens,
      remaining: entitlement.remainingTokens,
      credits: entitlement.remainingCredits,
    },
    periodStart: entitlement.periodStart,
    periodEnd: entitlement.periodEnd,
  });
}
