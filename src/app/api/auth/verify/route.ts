import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { validateDesktopToken } from '@/shared/models/desktop-auth';

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return Response.json({ error: 'Authorization header required' }, { status: 401 });
  }

  const session = await validateDesktopToken(token);
  if (!session) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const [userRecord] = await db()
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, session.userId))
    .limit(1);

  if (!userRecord) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  return Response.json({
    valid: true,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      imageUrl: userRecord.image ?? null,
      createdAt: userRecord.createdAt,
    },
  });
}
