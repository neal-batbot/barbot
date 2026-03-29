import {
  and,
  count,
  desc,
  eq,
  gte,
  lte,
  sql,
  sum,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { usageLog } from '@/config/db/schema';

export type UsageLog = typeof usageLog.$inferSelect;
export type NewUsageLog = typeof usageLog.$inferInsert;

export async function createUsageLog(data: NewUsageLog): Promise<UsageLog> {
  const [result] = await db().insert(usageLog).values(data).returning();
  return result;
}

export async function createUsageLogIdempotent(
  data: NewUsageLog
): Promise<UsageLog | undefined> {
  if (!data.requestId) {
    return createUsageLog(data);
  }

  const [result] = await db()
    .insert(usageLog)
    .values(data)
    .onConflictDoNothing({
      target: [usageLog.userId, usageLog.requestId],
    })
    .returning();

  return result;
}

export async function createUsageLogs(data: NewUsageLog[]): Promise<number> {
  if (data.length === 0) return 0;
  const result = await db()
    .insert(usageLog)
    .values(data)
    .onConflictDoNothing({
      target: [usageLog.userId, usageLog.requestId],
    })
    .returning({ id: usageLog.id });
  return result.length;
}

export async function getUsageLogs({
  userId,
  appId,
  product,
  model,
  type,
  startDate,
  endDate,
  page = 1,
  limit = 20,
}: {
  userId: string;
  appId?: string;
  product?: string;
  model?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ data: UsageLog[]; total: number }> {
  const conditions = [
    eq(usageLog.userId, userId),
    appId ? eq(usageLog.appId, appId) : undefined,
    product ? eq(usageLog.product, product) : undefined,
    model ? eq(usageLog.model, model) : undefined,
    type ? eq(usageLog.type, type) : undefined,
    startDate ? gte(usageLog.createdAt, startDate) : undefined,
    endDate ? lte(usageLog.createdAt, endDate) : undefined,
  ].filter(Boolean);

  const whereClause = and(...(conditions as Parameters<typeof and>));

  const [{ total }] = await db()
    .select({ total: count() })
    .from(usageLog)
    .where(whereClause);

  const data = await db()
    .select()
    .from(usageLog)
    .where(whereClause)
    .orderBy(desc(usageLog.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return { data, total };
}

export interface UsageSummary {
  totalTokens: number;
  totalCost: string;
  totalRequests: number;
}

export interface UsageBreakdownItem {
  key: string;
  tokens: number;
  cost: string;
  requests: number;
}

export interface UsageDailyItem {
  date: string;
  tokens: number;
  cost: string;
  requests: number;
}

export async function getUsageSummary({
  userId,
  startDate,
  endDate,
  appId,
  groupBy = 'product',
}: {
  userId: string;
  startDate: Date;
  endDate: Date;
  appId?: string;
  groupBy?: 'product' | 'model' | 'type';
}): Promise<{
  summary: UsageSummary;
  breakdown: UsageBreakdownItem[];
  daily: UsageDailyItem[];
}> {
  const baseConditions = and(
    eq(usageLog.userId, userId),
    appId ? eq(usageLog.appId, appId) : undefined,
    gte(usageLog.createdAt, startDate),
    lte(usageLog.createdAt, endDate)
  );

  const [summaryRow] = await db()
    .select({
      totalTokens: sum(usageLog.tokens),
      totalCost: sum(sql`CAST(${usageLog.cost} AS DECIMAL)`),
      totalRequests: count(),
    })
    .from(usageLog)
    .where(baseConditions);

  const groupColumn =
    groupBy === 'model'
      ? usageLog.model
      : groupBy === 'type'
        ? usageLog.type
        : usageLog.product;

  const breakdownRows = await db()
    .select({
      key: groupColumn,
      tokens: sum(usageLog.tokens),
      cost: sum(sql`CAST(${usageLog.cost} AS DECIMAL)`),
      requests: count(),
    })
    .from(usageLog)
    .where(baseConditions)
    .groupBy(groupColumn)
    .orderBy(desc(count()));

  const dailyRows = await db()
    .select({
      date: sql<string>`DATE(${usageLog.createdAt})`,
      tokens: sum(usageLog.tokens),
      cost: sum(sql`CAST(${usageLog.cost} AS DECIMAL)`),
      requests: count(),
    })
    .from(usageLog)
    .where(baseConditions)
    .groupBy(sql`DATE(${usageLog.createdAt})`)
    .orderBy(sql`DATE(${usageLog.createdAt})`);

  return {
    summary: {
      totalTokens: Number(summaryRow?.totalTokens ?? 0),
      totalCost: (Number(summaryRow?.totalCost ?? 0)).toFixed(4),
      totalRequests: summaryRow?.totalRequests ?? 0,
    },
    breakdown: breakdownRows.map((row) => ({
      key: row.key ?? 'unknown',
      tokens: Number(row.tokens ?? 0),
      cost: (Number(row.cost ?? 0)).toFixed(4),
      requests: row.requests,
    })),
    daily: dailyRows.map((row) => ({
      date: row.date,
      tokens: Number(row.tokens ?? 0),
      cost: (Number(row.cost ?? 0)).toFixed(4),
      requests: row.requests,
    })),
  };
}
