import { findApikeyByKey } from '@/shared/models/apikey';
import { validateDesktopToken } from '@/shared/models/desktop-auth';
import { envConfigs } from '@/config';
import { verifyBridgeJwt } from '@/shared/lib/auth-bridge';

export interface PlatformAuthIdentity {
  userId: string;
  authType: 'api_key' | 'desktop_session' | 'bridge_token';
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function resolvePlatformAuth(req: Request): Promise<PlatformAuthIdentity | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  if (token.startsWith('dt_')) {
    const session = await validateDesktopToken(token);
    return session ? { userId: session.userId, authType: 'desktop_session' } : null;
  }

  if (envConfigs.auth_secret) {
    const payload = verifyBridgeJwt(token, envConfigs.auth_secret);
    if (payload && typeof payload.sub === 'string') {
      const expiresAt = typeof payload.exp === 'number' ? payload.exp : 0;
      const now = Math.floor(Date.now() / 1000);
      if (!expiresAt || expiresAt >= now) {
        return { userId: payload.sub, authType: 'bridge_token' };
      }
    }
  }

  const apikeyRecord = await findApikeyByKey(token);
  return apikeyRecord ? { userId: apikeyRecord.userId, authType: 'api_key' } : null;
}

export function unauthorizedResponse(): Response {
  return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
}
