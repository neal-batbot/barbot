import { z } from 'zod';

import { findPlanEntitlement, parseFeatures } from '@/shared/models/plan-entitlement';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { countActiveDevices, upsertDevice } from '@/shared/models/device';
import { respData } from '@/shared/lib/resp';
import { resolvePlatformAuth, unauthorizedResponse } from '@/shared/lib/platform-auth';

const DEFAULT_DEVICE_LIMIT = 3;

const registerSchema = z.object({
  device_id: z.string().min(1),
  platform: z.string().optional(),
  product_code: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const identity = await resolvePlatformAuth(req);
    if (!identity) return unauthorizedResponse();

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { code: -1, message: 'validation_error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { device_id, platform, product_code } = parsed.data;
    const userId = identity.userId;

    // Check existing device (re-activation is always allowed)
    const subscription = await getCurrentSubscription(userId);
    const planName = subscription?.planName ?? 'free';
    const entitlement = await findPlanEntitlement(planName, product_code);
    const features = parseFeatures(entitlement?.features ?? null);
    const deviceLimit = (features.device_limit as number) ?? DEFAULT_DEVICE_LIMIT;

    const activeCount = await countActiveDevices(userId, product_code);

    // If already over limit AND this is a new device, reject
    if (activeCount >= deviceLimit) {
      // Check if this exact device already exists (re-activation case)
      const { findDevice } = await import('@/shared/models/device');
      const existing = await findDevice(userId, product_code, device_id);
      if (!existing) {
        return Response.json({
          code: -1,
          message: 'device_limit_exceeded',
          activated: false,
          limit: deviceLimit,
          current: activeCount,
        }, { status: 403 });
      }
    }

    await upsertDevice({ userId, productCode: product_code, deviceId: device_id, platform });

    return respData({ activated: true, device_id, limit: deviceLimit });
  } catch (e) {
    console.error('[POST /api/v1/device/register] error:', e);
    return Response.json({ code: -1, message: 'Failed to register device' }, { status: 500 });
  }
}
