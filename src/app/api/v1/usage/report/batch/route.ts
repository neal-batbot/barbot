import { z } from 'zod';

import { createUsageLogs, NewUsageLog } from '@/shared/models/usage-log';
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

const recordSchema = z.object({
  app_id: z.string().min(1).optional(),
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
  timestamp: z.string().datetime().optional(),
});

const batchSchema = z.object({
  records: z.array(recordSchema).min(1).max(100),
});

export async function POST(req: Request) {
  try {
    const identity = await resolvePlatformAuth(req);
    if (!identity) return respErr('unauthorized');

    const body = await req.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'validation_error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = new Date();
    const records: NewUsageLog[] = parsed.data.records.map((r, idx) => {
      const createdAt = r.timestamp ? new Date(r.timestamp) : now;
      const usageCost = calculateUsageCost({
        model: r.model,
        tokens: r.tokens ?? 0,
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        cachedInputTokens: r.cached_input_tokens,
      });
      const metadata = JSON.stringify(withPricingMetadata(r.metadata, usageCost));
      return {
        userId: identity.userId,
        appId: r.app_id ?? 'api',
        product: r.product,
        model: r.model ?? null,
        provider: r.provider ?? null,
        type: r.type,
        tokens: usageCost.billableTokens,
        cost: usageCost.amount,
        source: BillingEventSource.CLIENT,
        requestId:
          r.request_id ||
          `${identity.userId}:${r.type}:${createdAt.getTime()}:${idx}`,
        status: 'success',
        metadata,
        createdAt,
      };
    });

    const inserted = await createUsageLogs(records);

    await Promise.all(
      records.map(async (record) => {
        await upsertBillingEvent({
          userId: record.userId,
          appId: record.appId || 'api',
          requestId: record.requestId!,
          source: BillingEventSource.CLIENT,
          product: record.product,
          model: record.model ?? null,
          provider: record.provider ?? null,
          billableTokens: record.tokens ?? 0,
          unitPrice:
            record.tokens && record.cost
              ? (Number(record.cost) / record.tokens).toFixed(12)
              : '0',
          amount: record.cost || '0',
          period: getBillingPeriodLabel(record.createdAt || now),
          status: BillingEventStatus.BILLABLE,
          metadata: record.metadata ?? null,
        });
      })
    );

    return respData({ success: true, count: inserted });
  } catch (e) {
    console.error('[POST /api/v1/usage/report/batch] error:', e);
    return respErr('Failed to record batch usage');
  }
}
