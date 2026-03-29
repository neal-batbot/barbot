import { z } from 'zod';

import {
  AppTokenStatus,
  findActiveAppTokenByRawToken,
  touchAppTokenUsedAt,
} from '@/shared/models/app-token';
import {
  BillingEventSource,
  BillingEventStatus,
  upsertBillingEvent,
} from '@/shared/models/billing-event';
import { createUsageLogIdempotent } from '@/shared/models/usage-log';
import { respData, respErr } from '@/shared/lib/resp';
import { getBillingPeriodLabel } from '@/shared/services/entitlement';

const ingestSchema = z.object({
  app_id: z.string().min(1),
  user_id: z.string().min(1).optional(),
  product: z.string().min(1).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  type: z.string().min(1),
  tokens: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  request_id: z.string().min(1).optional(),
  source: z.enum(['server', 'client']).optional(),
  status: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

function isIntegrationAuthorized(req: Request): boolean {
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

async function resolveAuth(req: Request): Promise<
  | {
      authorized: true;
      mode: 'integration' | 'app_token';
      userId?: string;
      appTokenId?: string;
    }
  | {
      authorized: false;
    }
> {
  if (isIntegrationAuthorized(req)) {
    return { authorized: true, mode: 'integration' };
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { authorized: false };
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken.startsWith('icat_')) {
    return { authorized: false };
  }

  const tokenRecord = await findActiveAppTokenByRawToken(rawToken);
  if (!tokenRecord || tokenRecord.status !== AppTokenStatus.ACTIVE) {
    return { authorized: false };
  }

  return {
    authorized: true,
    mode: 'app_token',
    userId: tokenRecord.userId,
    appTokenId: tokenRecord.id,
  };
}

export async function POST(req: Request) {
  try {
    const auth = await resolveAuth(req);
    if (!auth.authorized) {
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
    const finalUserId =
      auth.mode === 'app_token' ? auth.userId : payload.user_id;
    if (!finalUserId) {
      return Response.json(
        { error: 'validation_error', details: [{ message: 'user_id is required' }] },
        { status: 400 }
      );
    }

    const createdAt = payload.timestamp ? new Date(payload.timestamp) : new Date();
    const requestId =
      payload.request_id ||
      `${payload.app_id}:${payload.type}:${finalUserId}:${createdAt.getTime()}`;
    const source = payload.source || BillingEventSource.CLIENT;
    const product = payload.product ?? payload.app_id;
    const provider = payload.provider ?? null;

    const record = await createUsageLogIdempotent({
      userId: finalUserId,
      appId: payload.app_id,
      product,
      model: payload.model ?? null,
      provider,
      type: payload.type,
      tokens: payload.tokens,
      cost: payload.cost.toFixed(8),
      source,
      requestId,
      status: payload.status ?? 'success',
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      createdAt,
    });

    await upsertBillingEvent({
      userId: finalUserId,
      appId: payload.app_id,
      requestId,
      source,
      product,
      model: payload.model ?? null,
      provider,
      billableTokens: payload.tokens,
      unitPrice: '0',
      amount: payload.cost.toFixed(8),
      period: getBillingPeriodLabel(createdAt),
      status:
        payload.status === 'failed'
          ? BillingEventStatus.FAILED
          : BillingEventStatus.BILLABLE,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
    });

    if (auth.mode === 'app_token' && auth.appTokenId) {
      await touchAppTokenUsedAt(auth.appTokenId);
    }

    return respData({ success: true, id: record?.id || null, request_id: requestId });
  } catch (error) {
    console.error('[POST /api/v2/ingest/usage] error:', error);
    return respErr('Failed to ingest usage');
  }
}
