import {
  type PlatformAudience,
  type PlatformEntitlement,
  type PlatformFeature,
  type PlatformProduct,
} from '@/shared/lib/platform-config';
import { verifyBridgeJwt } from '@/shared/lib/auth-bridge';

export type PlatformSessionResponse = {
  authenticated: boolean;
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
};

async function parseJsonResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.message || `request_failed_${response.status}`
    );
  }
  return payload;
}

export async function getSession(basePath: string = '/api/auth/session') {
  const response = await fetch(basePath, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await parseJsonResponse(response);
  return payload.data as PlatformSessionResponse;
}

export async function getBridgeToken(
  audience: PlatformAudience,
  basePath: string = '/api/extension/token'
) {
  const response = await fetch(
    `${basePath}?aud=${encodeURIComponent(audience)}`,
    {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }
  );
  const payload = await parseJsonResponse(response);
  return payload as {
    token: string;
    audience: PlatformAudience;
    product: PlatformProduct;
    expiresAt: string;
  };
}

export async function getEntitlement(
  product: PlatformProduct,
  basePath: string = '/api/extension/entitlement',
  token?: string
) {
  const response = await fetch(
    `${basePath}?product=${encodeURIComponent(product)}`,
    {
      method: 'GET',
      credentials: token ? 'omit' : 'include',
      cache: 'no-store',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    }
  );
  const payload = await parseJsonResponse(response);
  return payload.data?.entitlement as PlatformEntitlement;
}

export function verifyBridgeToken(token: string, secret: string) {
  return verifyBridgeJwt(token, secret);
}

export function requireFeature(
  entitlement: PlatformEntitlement,
  feature: PlatformFeature
) {
  if (!entitlement.features.includes(feature)) {
    throw new Error(`feature_not_enabled:${feature}`);
  }
  return entitlement;
}
