import { z } from 'zod';
import { exchangeDesktopCode } from '@/shared/models/desktop-auth';

const bodySchema = z.object({
  code: z.string().min(1),
  deviceInfo: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Invalid request body' } },
        { status: 400 }
      );
    }

    const result = await exchangeDesktopCode(parsed.data.code, parsed.data.deviceInfo);
    if (!result) {
      return Response.json(
        { error: { message: 'Invalid or expired code' } },
        { status: 401 }
      );
    }

    return Response.json(result);
  } catch (e) {
    console.error('[POST /api/auth/desktop/exchange] error:', e);
    return Response.json(
      { error: { message: 'Exchange failed' } },
      { status: 500 }
    );
  }
}
