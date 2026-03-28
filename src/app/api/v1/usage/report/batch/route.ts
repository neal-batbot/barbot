import { z } from 'zod';

import { findApikeyByKey } from '@/shared/models/apikey';
import { createUsageLogs, NewUsageLog } from '@/shared/models/usage-log';
import { respData, respErr } from '@/shared/lib/resp';

const recordSchema = z.object({
  product: z.string().min(1),
  model: z.string().optional(),
  type: z.string().min(1),
  tokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
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

    const records: NewUsageLog[] = parsed.data.records.map((r) => ({
      userId: apikeyRecord.userId,
      product: r.product,
      model: r.model ?? null,
      type: r.type,
      tokens: r.tokens ?? 0,
      cost: r.cost !== undefined ? r.cost.toFixed(8) : '0',
      status: 'success',
      metadata: r.metadata ? JSON.stringify(r.metadata) : null,
      createdAt: r.timestamp ? new Date(r.timestamp) : undefined,
    }));

    const inserted = await createUsageLogs(records);

    return respData({ success: true, count: inserted });
  } catch (e) {
    console.error('[POST /api/v1/usage/report/batch] error:', e);
    return respErr('Failed to record batch usage');
  }
}
