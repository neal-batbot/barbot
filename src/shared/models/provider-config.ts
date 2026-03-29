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
