import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import { getAuth } from '@/core/auth';
import {
  resolveBridgeAudience,
  signBridgeJwt,
  VSCODE_AUDIENCE,
} from '@/shared/lib/auth-bridge';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!envConfigs.auth_secret) {
    return NextResponse.json(
      { error: 'auth_secret_missing' },
      { status: 500 }
    );
  }

  const requestedAudience = req.nextUrl.searchParams.get('aud');
  const audience =
    resolveBridgeAudience(requestedAudience) ||
    (!requestedAudience ? VSCODE_AUDIENCE : null);
  if (!audience) {
    return NextResponse.json({ error: 'invalid_audience' }, { status: 400 });
  }

  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    image: session.user.image ?? null,
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30 days
    iss: envConfigs.app_url,
    aud: audience,
  };

  const token = signBridgeJwt(payload, envConfigs.auth_secret);

  return NextResponse.json({
    token,
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
  });
}
