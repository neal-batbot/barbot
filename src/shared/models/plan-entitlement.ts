import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { planEntitlement } from '@/config/db/schema';

export type PlanEntitlement = typeof planEntitlement.$inferSelect;
export type NewPlanEntitlement = typeof planEntitlement.$inferInsert;

export interface EntitlementFeatures {
  device_limit?: number;
  advanced_model?: boolean;
  [key: string]: unknown;
}

export async function getPlanEntitlements(planName?: string): Promise<PlanEntitlement[]> {
  return db()
    .select()
    .from(planEntitlement)
    .where(planName ? eq(planEntitlement.planName, planName) : undefined)
    .orderBy(planEntitlement.planName, planEntitlement.productCode);
}

export async function findPlanEntitlement(
  planName: string,
  productCode: string
): Promise<PlanEntitlement | undefined> {
  const [result] = await db()
    .select()
    .from(planEntitlement)
    .where(
      and(
        eq(planEntitlement.planName, planName),
        eq(planEntitlement.productCode, productCode)
      )
    );
  return result;
}

export function parseFeatures(featuresJson: string | null | undefined): EntitlementFeatures {
  if (!featuresJson) return {};
  try {
    return JSON.parse(featuresJson) as EntitlementFeatures;
  } catch {
    return {};
  }
}

export async function upsertPlanEntitlement(data: NewPlanEntitlement): Promise<PlanEntitlement> {
  const [result] = await db()
    .insert(planEntitlement)
    .values(data)
    .onConflictDoUpdate({
      target: [planEntitlement.planName, planEntitlement.productCode],
      set: {
        isEnabled: data.isEnabled,
        quotaTokens: data.quotaTokens,
        quotaRequests: data.quotaRequests,
        features: data.features,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

export async function deletePlanEntitlement(id: string): Promise<void> {
  await db().delete(planEntitlement).where(eq(planEntitlement.id, id));
}
