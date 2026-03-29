import { and, eq, gte, lte, sql, sum } from 'drizzle-orm';

import { db } from '@/core/db';
import { billingEvent } from '@/config/db/schema';

export type BillingEvent = typeof billingEvent.$inferSelect;
export type NewBillingEvent = typeof billingEvent.$inferInsert;

export enum BillingEventSource {
  SERVER = 'server',
  CLIENT = 'client',
}

export enum BillingEventStatus {
  BILLABLE = 'billable',
  NON_BILLABLE = 'non_billable',
  FAILED = 'failed',
}

export async function upsertBillingEvent(
  input: NewBillingEvent
): Promise<BillingEvent | undefined> {
  const [result] = await db()
    .insert(billingEvent)
    .values(input)
    .onConflictDoUpdate({
      target: [billingEvent.userId, billingEvent.requestId],
      set: {
        source: input.source ?? BillingEventSource.CLIENT,
        appId: input.appId ?? 'legacy',
        product: input.product ?? 'chat',
        model: input.model ?? null,
        provider: input.provider ?? null,
        billableTokens: input.billableTokens ?? 0,
        unitPrice: input.unitPrice ?? '0',
        amount: input.amount ?? '0',
        period: input.period,
        status: input.status ?? BillingEventStatus.BILLABLE,
        metadata: input.metadata ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

export async function getBillingUsageForPeriod({
  userId,
  startDate,
  endDate,
}: {
  userId: string;
  startDate: Date;
  endDate: Date;
}): Promise<{
  billableTokens: number;
  amount: string;
}> {
  const [row] = await db()
    .select({
      billableTokens: sum(billingEvent.billableTokens),
      amount: sum(sql`CAST(${billingEvent.amount} AS DECIMAL)`),
    })
    .from(billingEvent)
    .where(
      and(
        eq(billingEvent.userId, userId),
        eq(billingEvent.status, BillingEventStatus.BILLABLE),
        gte(billingEvent.createdAt, startDate),
        lte(billingEvent.createdAt, endDate)
      )
    );

  return {
    billableTokens: Number(row?.billableTokens ?? 0),
    amount: (Number(row?.amount ?? 0)).toFixed(8),
  };
}
