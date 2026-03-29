import { z } from 'zod';

import { findApikeyByKey } from '@/shared/models/apikey';
import { createUsageLogs, NewUsageLog } from '@/shared/models/usage-log';
import {
  BillingEventSource,
  BillingEventStatus,
  upsertBillingEvent,
} from '@/shared/models/billing-event';
import { respData, respErr } from '@/shared/lib/resp';
import { getBillingPeriodLabel } from '@/shared/services/entitlement';

const recordSchema = z.object({
  product: z.string().min(1),
  model: z.string().optional(),
  provider: z.string().optional(),
  type: z.string().min(1),
  tokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  request_id: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

const batchSchema = z.object({
  records: z.array(recordSchema).min(1).max(100),
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
      return {
        userId: apikeyRecord.userId,
        appId: 'api',
        product: r.product,
        model: r.model ?? null,
        provider: r.provider ?? null,
        type: r.type,
        tokens: r.tokens ?? 0,
        cost: r.cost !== undefined ? r.cost.toFixed(8) : '0',
        source: BillingEventSource.CLIENT,
        requestId:
          r.request_id ||
          `${apikeyRecord.userId}:${r.type}:${createdAt.getTime()}:${idx}`,
        status: 'success',
        metadata: r.metadata ? JSON.stringify(r.metadata) : null,
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
          unitPrice: '0',
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
