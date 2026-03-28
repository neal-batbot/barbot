import { z } from 'zod';

import { findApikeyByKey } from '@/shared/models/apikey';
import { createUsageLog } from '@/shared/models/usage-log';
import { respData, respErr } from '@/shared/lib/resp';

const reportSchema = z.object({
  product: z.string().min(1),
  model: z.string().optional(),
  type: z.string().min(1),
  tokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
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

    const { product, model, type, tokens, cost, metadata } = parsed.data;

    const record = await createUsageLog({
      userId: apikeyRecord.userId,
      product,
      model: model ?? null,
      type,
      tokens: tokens ?? 0,
      cost: cost !== undefined ? cost.toFixed(8) : '0',
      status: 'success',
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    return respData({ success: true, id: record.id });
  } catch (e) {
    console.error('[POST /api/v1/usage/report] error:', e);
    return respErr('Failed to record usage');
  }
}
