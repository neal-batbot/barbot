import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import { getRemainingCredits } from '@/shared/models/credit';
import { findUserById } from '@/shared/models/user';

export const runtime = 'nodejs';

function base64UrlDecode(input: string) {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

function verifyJwt(
  token: string,
  secret: string
): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest();

  const actualSignature = base64UrlDecode(encodedSignature);
  if (!crypto.timingSafeEqual(expectedSignature, actualSignature)) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload).toString('utf-8'));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!envConfigs.auth_secret) {
    return NextResponse.json(
      { error: 'auth_secret_missing' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = verifyJwt(token, envConfigs.auth_secret);

  if (!payload) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  if (payload.aud !== 'vector-vscode') {
    return NextResponse.json({ error: 'invalid_audience' }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) {
    return NextResponse.json({ error: 'token_expired' }, { status: 401 });
  }

  const userId = payload.sub as string;
  if (!userId) {
    return NextResponse.json({ error: 'invalid_subject' }, { status: 401 });
  }

  try {
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    const remainingCredits = await getRemainingCredits(userId);

    return NextResponse.json({
      code: 0,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
        },
        credits: {
          remainingCredits,
        },
      },
    });
  } catch (e) {
    console.error('get extension user info failed:', e);
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    );
  }
}
