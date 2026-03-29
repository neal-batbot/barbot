import { validateDesktopToken } from '@/shared/models/desktop-auth';

export async function getDesktopUserId(req: Request): Promise<string | null> {
  const token = req.headers.get('X-Desktop-Token');
  if (!token) return null;

  const result = await validateDesktopToken(token);
  return result?.userId ?? null;
}
