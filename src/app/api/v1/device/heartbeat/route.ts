import { z } from 'zod';

import { updateDeviceHeartbeat } from '@/shared/models/device';
import { respData } from '@/shared/lib/resp';
import { resolvePlatformAuth, unauthorizedResponse } from '@/shared/lib/platform-auth';

const heartbeatSchema = z.object({
  device_id: z.string().min(1),
  product_code: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const identity = await resolvePlatformAuth(req);
    if (!identity) return unauthorizedResponse();

    const body = await req.json();
    const parsed = heartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { code: -1, message: 'validation_error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { device_id, product_code } = parsed.data;
    await updateDeviceHeartbeat(identity.userId, product_code, device_id);

    return respData({ ok: true });
  } catch (e) {
    console.error('[POST /api/v1/device/heartbeat] error:', e);
    return Response.json({ code: -1, message: 'Failed to update heartbeat' }, { status: 500 });
  }
}
