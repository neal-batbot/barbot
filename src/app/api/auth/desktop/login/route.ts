import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { createDesktopAuthCode, exchangeDesktopCode } from '@/shared/models/desktop-auth';

export const runtime = 'nodejs';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

    const { email, password, deviceInfo } = parsed.data;

    const auth = await getAuth();

    // Validate email/password via Better Auth
    const signInResult = await auth.api.signInEmail({
      body: { email, password },
      asResponse: false,
    }).catch(() => null);

    const userId = signInResult?.user?.id;
    if (!userId) {
      return Response.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Mint a one-shot code and exchange it for a desktop session token
    const code = await createDesktopAuthCode(userId);
    const result = await exchangeDesktopCode(code, deviceInfo);
    if (!result) {
      return Response.json(
        { error: { message: 'Failed to issue desktop session' } },
        { status: 500 }
      );
    }

    return Response.json(result);
  } catch (e) {
    console.error('[POST /api/auth/desktop/login] error:', e);
    return Response.json(
      { error: { message: 'Login failed' } },
      { status: 500 }
    );
  }
}
