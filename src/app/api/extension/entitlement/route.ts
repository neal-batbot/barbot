import { NextRequest, NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import {
  isAllowedBridgeAudience,
  verifyBridgeJwt,
} from '@/shared/lib/auth-bridge';
import {
  buildPlatformEntitlement,
  resolvePlatformProduct,
  resolveProductFromAudience,
  type PlatformAudience,
} from '@/shared/lib/platform-config';
import { findUserById } from '@/shared/models/user';
import { getUserInfo } from '@/shared/models/user';
import { resolveEntitlement } from '@/shared/services/entitlement';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let userId: string | null = null;
  let requestedProduct = resolvePlatformProduct(
    req.nextUrl.searchParams.get('product')
  );
  const authHeader = req.headers.get('authorization');
  let audienceProduct: ReturnType<typeof resolvePlatformProduct> = null;

  if (authHeader?.startsWith('Bearer ')) {
    if (!envConfigs.auth_secret) {
      return NextResponse.json(
        { error: 'auth_secret_missing' },
        { status: 500 }
      );
    }

    const token = authHeader.slice(7);
    const payload = verifyBridgeJwt(token, envConfigs.auth_secret);
    if (!payload) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    const aud = typeof payload.aud === 'string' ? payload.aud : null;
    if (!isAllowedBridgeAudience(aud)) {
      return NextResponse.json({ error: 'invalid_audience' }, { status: 401 });
    }
    audienceProduct = resolveProductFromAudience(aud as PlatformAudience);

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < now) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 });
    }

    userId = typeof payload.sub === 'string' ? payload.sub : null;
    if (!userId) {
      return NextResponse.json({ error: 'invalid_subject' }, { status: 401 });
    }

    if (requestedProduct && audienceProduct !== requestedProduct) {
      return NextResponse.json(
        { error: 'cross_product_access_not_allowed' },
        { status: 403 }
      );
    }
  } else {
    const user = await getUserInfo();
    if (!user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    userId = user.id;
  }

  try {
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    requestedProduct = requestedProduct ?? audienceProduct ?? 'pi-web-ui';
    const entitlement = await resolveEntitlement(userId);
    const platformEntitlement = buildPlatformEntitlement(
      requestedProduct,
      entitlement
    );

    return NextResponse.json({
      code: 0,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
        entitlement: {
          ...platformEntitlement,
          allowedModels: entitlement.allowedModels,
          remainingTokens: entitlement.remainingTokens,
          remainingCredits: entitlement.remainingCredits,
          overageEnabled: entitlement.overageEnabled,
          periodStart: entitlement.periodStart.toISOString(),
          periodEnd: entitlement.periodEnd.toISOString(),
        },
      },
    });
  } catch (e) {
    console.error('[GET /api/extension/entitlement] error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
