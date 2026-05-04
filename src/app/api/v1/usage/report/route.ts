import { z } from 'zod';

import { createUsageLogIdempotent } from '@/shared/models/usage-log';
import {
  BillingEventSource,
  BillingEventStatus,
  upsertBillingEvent,
} from '@/shared/models/billing-event';
import { respData, respErr } from '@/shared/lib/resp';
import { getBillingPeriodLabel } from '@/shared/services/entitlement';
import { resolvePlatformAuth } from '@/shared/lib/platform-auth';
import {
  calculateUsageCost,
  withPricingMetadata,
} from '@/shared/services/model-pricing';

const reportSchema = z.object({
  product: z.string().min(1),
  model: z.string().optional(),
  provider: z.string().optional(),
  type: z.string().min(1),
  tokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  input_tokens: z.number().int().nonnegative().optional(),
  output_tokens: z.number().int().nonnegative().optional(),
  cached_input_tokens: z.number().int().nonnegative().optional(),
  request_id: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const identity = await resolvePlatformAuth(req);
    if (!identity) return respErr('unauthorized');

    const body = await req.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'validation_error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      product,
      model,
      provider,
      type,
      tokens,
      input_tokens,
      output_tokens,
      cached_input_tokens,
      metadata,
      request_id,
    } = parsed.data;
    const now = new Date();
    const requestId =
      request_id || `${identity.userId}:${type}:${now.getTime()}`;
    const tokenCount = tokens ?? 0;
    const usageCost = calculateUsageCost({
      model,
      tokens: tokenCount,
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      cachedInputTokens: cached_input_tokens,
    });
    const enrichedMetadata = withPricingMetadata(metadata, usageCost);
    const metadataText = JSON.stringify(enrichedMetadata);

    const record = await createUsageLogIdempotent({
      userId: identity.userId,
      appId: 'api',
      product,
      model: model ?? null,
      provider: provider ?? null,
      type,
      tokens: usageCost.billableTokens,
      cost: usageCost.amount,
      source: BillingEventSource.CLIENT,
      requestId,
      status: 'success',
      metadata: metadataText,
    });

    await upsertBillingEvent({
      userId: identity.userId,
      appId: 'api',
      requestId,
      source: BillingEventSource.CLIENT,
      product,
      model: model ?? null,
      provider: provider ?? null,
      billableTokens: usageCost.billableTokens,
      unitPrice: usageCost.unitPrice,
      amount: usageCost.amount,
      period: getBillingPeriodLabel(now),
      status: BillingEventStatus.BILLABLE,
      metadata: metadataText,
    });

    return respData({ success: true, id: record?.id, cost: usageCost.amount });
  } catch (e) {
    console.error('[POST /api/v1/usage/report] error:', e);
    return respErr('Failed to record usage');
  }
}
