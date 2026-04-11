import { headers } from 'next/headers';

import { getAuth } from '@/core/auth';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({
      code: 0,
      message: 'ok',
      data: {
        authenticated: false,
        user: null,
      },
    });
  }

  return Response.json({
    code: 0,
    message: 'ok',
    data: {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      },
    },
  });
}
