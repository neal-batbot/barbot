import { findApikeyByKey } from '@/shared/models/apikey';
import { validateDesktopToken } from '@/shared/models/desktop-auth';

export interface PlatformAuthIdentity {
  userId: string;
  authType: 'api_key' | 'desktop_session';
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

  const apikeyRecord = await findApikeyByKey(token);
  return apikeyRecord ? { userId: apikeyRecord.userId, authType: 'api_key' } : null;
}

export function unauthorizedResponse(): Response {
  return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
}
