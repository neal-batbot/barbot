import crypto from 'crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import { getAuth } from '@/core/auth';

export const runtime = 'nodejs';

function base64UrlEncode(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest();
  return `${data}.${base64UrlEncode(signature)}`;
}

export async function GET() {
  if (!envConfigs.auth_secret) {
    return NextResponse.json(
      { error: 'auth_secret_missing' },
      { status: 500 }
    );
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
    iat: now,
    exp: now + 5 * 60,
    iss: envConfigs.app_url,
    aud: 'continue-vscode',
  };

  const token = signJwt(payload, envConfigs.auth_secret);

  return NextResponse.json({
    token,
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    },
  });
}
