import { z } from 'zod';
import { refreshDesktopSession } from '@/shared/models/desktop-auth';

const bodySchema = z.object({
  refreshToken: z.string().min(1),
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

    const result = await refreshDesktopSession(parsed.data.refreshToken);
    if (!result) {
      return Response.json(
        { error: { message: 'Invalid refresh token' } },
        { status: 401 }
      );
    }

    return Response.json(result);
  } catch (e) {
    console.error('[POST /api/auth/desktop/refresh] error:', e);
    return Response.json(
      { error: { message: 'Refresh failed' } },
      { status: 500 }
    );
  }
}
