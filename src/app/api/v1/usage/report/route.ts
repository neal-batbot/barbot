import { z } from 'zod';

import { findApikeyByKey } from '@/shared/models/apikey';
import { createUsageLog } from '@/shared/models/usage-log';
import {
  BillingEventSource,
  BillingEventStatus,
  upsertBillingEvent,
} from '@/shared/models/billing-event';
import { respData, respErr } from '@/shared/lib/resp';
import { getBillingPeriodLabel } from '@/shared/services/entitlement';

const reportSchema = z.object({
  product: z.string().min(1),
  model: z.string().optional(),
  provider: z.string().optional(),
  type: z.string().min(1),
  tokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  request_id: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return respErr('unauthorized');
    }

    const apiKeyValue = authHeader.slice(7);
    const apikeyRecord = await findApikeyByKey(apiKeyValue);
    if (!apikeyRecord) {
      return respErr('unauthorized');
    }

    const body = await req.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'validation_error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { product, model, provider, type, tokens, cost, metadata, request_id } =
      parsed.data;
    const now = new Date();
    const requestId =
      request_id || `${apikeyRecord.userId}:${type}:${now.getTime()}`;
    const tokenCount = tokens ?? 0;
    const costText = cost !== undefined ? cost.toFixed(8) : '0';

    const record = await createUsageLog({
      userId: apikeyRecord.userId,
      appId: 'api',
      product,
      model: model ?? null,
      provider: provider ?? null,
      type,
      tokens: tokenCount,
      cost: costText,
      source: BillingEventSource.CLIENT,
      requestId,
      status: 'success',
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    await upsertBillingEvent({
      userId: apikeyRecord.userId,
      appId: 'api',
      requestId,
      source: BillingEventSource.CLIENT,
      product,
      model: model ?? null,
      provider: provider ?? null,
      billableTokens: tokenCount,
      unitPrice: '0',
      amount: costText,
      period: getBillingPeriodLabel(now),
      status: BillingEventStatus.BILLABLE,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    return respData({ success: true, id: record.id });
  } catch (e) {
    console.error('[POST /api/v1/usage/report] error:', e);
    return respErr('Failed to record usage');
  }
}
