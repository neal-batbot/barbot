import { z } from 'zod';

import { createUsageLog } from '@/shared/models/usage-log';
import { respData, respErr } from '@/shared/lib/resp';

const ingestSchema = z.object({
  app_id: z.string().min(1),
  user_id: z.string().min(1),
  product: z.string().min(1).optional(),
  model: z.string().optional(),
  type: z.string().min(1),
  tokens: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  status: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

function isAuthorized(req: Request): boolean {
  const expectedKey = process.env.INTEGRATION_INGEST_API_KEY;
  if (!expectedKey) {
    return false;
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const bearerKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  const headerKey = req.headers.get('x-ingest-key');

  return bearerKey === expectedKey || headerKey === expectedKey;
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'validation_error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const record = await createUsageLog({
      userId: payload.user_id,
      appId: payload.app_id,
      product: payload.product ?? payload.app_id,
      model: payload.model ?? null,
      type: payload.type,
      tokens: payload.tokens,
      cost: payload.cost.toFixed(8),
      status: payload.status ?? 'success',
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      createdAt: payload.timestamp ? new Date(payload.timestamp) : undefined,
    });

    return respData({ success: true, id: record.id });
  } catch (error) {
    console.error('[POST /api/v2/ingest/usage] error:', error);
    return respErr('Failed to ingest usage');
  }
}
