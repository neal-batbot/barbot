import { revokeDesktopSessionByToken } from '@/shared/models/desktop-auth';
import { extractBearerToken } from '@/shared/lib/platform-auth';

export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (!token?.startsWith('dt_')) {
    return Response.json({ error: { message: 'Authorization header required' } }, { status: 401 });
  }

  await revokeDesktopSessionByToken(token);
  return Response.json({ success: true });
}
