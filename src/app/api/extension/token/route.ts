import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import { getAuth } from '@/core/auth';
import { findUserById } from '@/shared/models/user';
import {
  getPlatformAudienceConfig,
  hasPlatformFeature,
  resolveProductFromAudience,
  type PlatformAudience,
  buildPlatformEntitlement,
} from '@/shared/lib/platform-config';
import {
  isAllowedBridgeAudience,
  resolveBridgeAudience,
  signBridgeJwt,
  VSCODE_AUDIENCE,
  verifyBridgeJwt,
} from '@/shared/lib/auth-bridge';
import { resolveEntitlement } from '@/shared/services/entitlement';

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
  const resolvedAudience = audience as PlatformAudience | null;
  if (!resolvedAudience) {
    return NextResponse.json({ error: 'invalid_audience' }, { status: 400 });
  }

  const audienceConfig = getPlatformAudienceConfig(resolvedAudience);
  const audienceProduct = resolveProductFromAudience(resolvedAudience);
  if (!audienceProduct) {
    return NextResponse.json({ error: 'invalid_audience_product' }, { status: 400 });
  }

  const auth = await getAuth();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  let sourceAudience: PlatformAudience | null = null;
  let userId = session?.user?.id ?? null;
  let userEmail = session?.user?.email ?? null;
  let userName = session?.user?.name ?? session?.user?.email ?? null;
  let userImage = session?.user?.image ?? null;

  if (!userId && bearerToken) {
    const payload = verifyBridgeJwt(bearerToken, envConfigs.auth_secret);
    if (!payload) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    const aud = typeof payload.aud === 'string' ? payload.aud : null;
    if (!isAllowedBridgeAudience(aud)) {
      return NextResponse.json({ error: 'invalid_audience' }, { status: 401 });
    }

    if (typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return NextResponse.json({ error: 'token_expired' }, { status: 401 });
      }
    }

    const sourceProduct = resolveProductFromAudience(aud as PlatformAudience);
    if (sourceProduct !== audienceProduct) {
      return NextResponse.json(
        { error: 'cross_product_exchange_not_allowed' },
        { status: 403 }
      );
    }

    sourceAudience = aud as PlatformAudience;
    userId = typeof payload.sub === 'string' ? payload.sub : null;
    if (!userId) {
      return NextResponse.json({ error: 'invalid_subject' }, { status: 401 });
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    userEmail = user.email ?? null;
    userName = user.name ?? user.email ?? null;
    userImage = user.image ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const entitlement = await resolveEntitlement(userId);
  const platformEntitlement = buildPlatformEntitlement(
    audienceProduct,
    entitlement
  );

  if (
    audienceConfig.requiredFeature &&
    !hasPlatformFeature(platformEntitlement, audienceConfig.requiredFeature)
  ) {
    return NextResponse.json(
      {
        error: 'feature_not_enabled',
        feature: audienceConfig.requiredFeature,
        product: audienceProduct,
        plan: platformEntitlement.plan,
      },
      { status: 403 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    email: userEmail,
    name: userName,
    image: userImage,
    product: audienceProduct,
    plan: platformEntitlement.plan,
    features: platformEntitlement.features,
    iat: now,
    exp: now + audienceConfig.ttlSeconds,
    iss: envConfigs.app_url,
    aud: resolvedAudience,
  };

  const token = signBridgeJwt(payload, envConfigs.auth_secret);

  return NextResponse.json({
    token,
    audience: resolvedAudience,
    product: audienceProduct,
    expiresAt: new Date((now + audienceConfig.ttlSeconds) * 1000).toISOString(),
    sourceAudience,
    user: {
      id: userId,
      email: userEmail,
      name: userName,
      image: userImage,
    },
  });
}
