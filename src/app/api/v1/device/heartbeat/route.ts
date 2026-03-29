import { z } from 'zod';

import { findApikeyByKey } from '@/shared/models/apikey';
import { updateDeviceHeartbeat } from '@/shared/models/device';
import { respData } from '@/shared/lib/resp';

const heartbeatSchema = z.object({
  device_id: z.string().min(1),
  product_code: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
    }

    const apiKeyValue = authHeader.slice(7);
    const apikeyRecord = await findApikeyByKey(apiKeyValue);
    if (!apikeyRecord) {
      return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = heartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { code: -1, message: 'validation_error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { device_id, product_code } = parsed.data;
    await updateDeviceHeartbeat(apikeyRecord.userId, product_code, device_id);

    return respData({ ok: true });
  } catch (e) {
    console.error('[POST /api/v1/device/heartbeat] error:', e);
    return Response.json({ code: -1, message: 'Failed to update heartbeat' }, { status: 500 });
  }
}
