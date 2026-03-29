import { getUserInfo } from '@/shared/models/user';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getOrders, OrderStatus } from '@/shared/models/order';
import { resolveEntitlement } from '@/shared/services/entitlement';
import { respData, respErr } from '@/shared/lib/resp';

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const [subscription, orders, entitlement] = await Promise.all([
      getCurrentSubscription(user.id),
      getOrders({ userId: user.id, status: OrderStatus.PAID, page: 1, limit: 10 }),
      resolveEntitlement(user.id),
    ]);

    const plan = subscription
      ? {
          name: subscription.planName ?? 'Unknown Plan',
          price: subscription.amount ?? 0,
          interval: subscription.interval ?? 'month',
          status: subscription.status,
          renewAt: subscription.currentPeriodEnd ?? null,
        }
      : null;

    const invoices = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      date: o.paidAt ?? o.createdAt,
      amount: o.paymentAmount ?? o.amount,
      currency: o.paymentCurrency ?? o.currency,
      status: 'paid',
      pdfUrl: null,
    }));

    return respData({
      plan,
      payment: {
        provider: subscription?.paymentProvider ?? 'stripe',
        manageUrl: '/settings/billing',
      },
      includedUsage: {
        period: {
          start: entitlement.periodStart ?? subscription?.currentPeriodStart ?? null,
          end: entitlement.periodEnd ?? subscription?.currentPeriodEnd ?? null,
        },
        items: [
          {
            name: 'chat',
            included_quota: entitlement.quotaTokens,
            used_tokens: entitlement.usedTokens,
            remaining_tokens: entitlement.remainingTokens,
          },
        ],
      },
      included_quota: entitlement.quotaTokens,
      used_tokens: entitlement.usedTokens,
      overage_tokens: entitlement.overageTokens,
      overage_amount: Number(entitlement.overageAmount.toFixed(8)),
      upgrade_url: '/pricing',
      invoices,
    });
  } catch (e) {
    console.error('[GET /api/dashboard/billing] error:', e);
    return respErr('Failed to fetch billing data');
  }
}
