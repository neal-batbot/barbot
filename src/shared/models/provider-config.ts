import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { providerConfig } from '@/config/db/schema';

export async function getProviderConfig(planName: string, productCode: string) {
  const [config] = await db()
    .select({
      providerName: providerConfig.providerName,
      baseUrl: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
      modelName: providerConfig.modelName,
      priority: providerConfig.priority,
      weight: providerConfig.weight,
      healthStatus: providerConfig.healthStatus,
      cooldownUntil: providerConfig.cooldownUntil,
      fallbackGroup: providerConfig.fallbackGroup,
      costPer1kInput: providerConfig.costPer1kInput,
      costPer1kOutput: providerConfig.costPer1kOutput,
      supportsStreaming: providerConfig.supportsStreaming,
      isDefaultAuto: providerConfig.isDefaultAuto,
    })
    .from(providerConfig)
    .where(
      and(
        eq(providerConfig.planName, planName),
        eq(providerConfig.productCode, productCode),
        eq(providerConfig.isActive, true)
      )
    )
    .limit(1);

  return config ?? null;
}

export async function getProviderConfigs(
  planName: string,
  productCode: string
) {
  return db()
    .select({
      channelId: providerConfig.id,
      providerName: providerConfig.providerName,
      baseUrl: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
      modelName: providerConfig.modelName,
      priority: providerConfig.priority,
      weight: providerConfig.weight,
      healthStatus: providerConfig.healthStatus,
      cooldownUntil: providerConfig.cooldownUntil,
      fallbackGroup: providerConfig.fallbackGroup,
      costPer1kInput: providerConfig.costPer1kInput,
      costPer1kOutput: providerConfig.costPer1kOutput,
      supportsStreaming: providerConfig.supportsStreaming,
      isDefaultAuto: providerConfig.isDefaultAuto,
    })
    .from(providerConfig)
    .where(
      and(
        eq(providerConfig.planName, planName),
        eq(providerConfig.productCode, productCode),
        eq(providerConfig.isActive, true)
      )
    )
    .orderBy(providerConfig.priority, providerConfig.createdAt);
}
