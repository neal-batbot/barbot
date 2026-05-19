import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '@/core/db';
import { desktopAuthCode, desktopSession, user } from '@/config/db/schema';

const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createDesktopAuthCode(userId: string): Promise<string> {
  const code = generateSecureToken();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  await db().insert(desktopAuthCode).values({
    code,
    userId,
    expiresAt,
  });

  return code;
}

export async function exchangeDesktopCode(
  code: string,
  deviceInfo?: string
): Promise<{
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: { id: string; email: string; name: string | null; imageUrl: string | null };
} | null> {
  const now = new Date();

  const [authCode] = await db()
    .select()
    .from(desktopAuthCode)
    .where(
      and(
        eq(desktopAuthCode.code, code),
        eq(desktopAuthCode.exchanged, false),
        gt(desktopAuthCode.expiresAt, now)
      )
    )
    .limit(1);

  if (!authCode) return null;

  await db()
    .update(desktopAuthCode)
    .set({ exchanged: true })
    .where(eq(desktopAuthCode.id, authCode.id));

  const [userRecord] = await db()
    .select()
    .from(user)
    .where(eq(user.id, authCode.userId))
    .limit(1);

  if (!userRecord) return null;

  const token = `dt_${generateSecureToken()}`;
  const refreshToken = `dr_${generateSecureToken()}`;
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await db().insert(desktopSession).values({
    userId: authCode.userId,
    token,
    refreshToken,
    deviceInfo: deviceInfo ?? null,
    expiresAt,
  });

  return {
    token,
    refreshToken,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      imageUrl: userRecord.image ?? null,
    },
  };
}

export async function refreshDesktopSession(
  currentRefreshToken: string
): Promise<{
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: { id: string; email: string; name: string | null; imageUrl: string | null };
} | null> {
  const [session] = await db()
    .select()
    .from(desktopSession)
    .where(eq(desktopSession.refreshToken, currentRefreshToken))
    .limit(1);

  if (!session) return null;

  const [userRecord] = await db()
    .select()
    .from(user)
    .where(eq(user.id, session.userId))
    .limit(1);

  if (!userRecord) return null;

  const newToken = `dt_${generateSecureToken()}`;
  const newRefreshToken = `dr_${generateSecureToken()}`;
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await db()
    .update(desktopSession)
    .set({
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt,
    })
    .where(eq(desktopSession.id, session.id));

  return {
    token: newToken,
    refreshToken: newRefreshToken,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      imageUrl: userRecord.image ?? null,
    },
  };
}

export async function validateDesktopToken(
  token: string
): Promise<{ userId: string } | null> {
  const now = new Date();

  const [session] = await db()
    .select({ userId: desktopSession.userId })
    .from(desktopSession)
    .where(
      and(
        eq(desktopSession.token, token),
        gt(desktopSession.expiresAt, now)
      )
    )
    .limit(1);

  return session ?? null;
}

export async function revokeDesktopSessionByToken(token: string): Promise<void> {
  await db().delete(desktopSession).where(eq(desktopSession.token, token));
}

export async function listDesktopSessionsForUser(userId: string): Promise<
  Array<{
    id: string;
    deviceInfo: string | null;
    expiresAt: Date;
    createdAt: Date;
  }>
> {
  const now = new Date();

  return db()
    .select({
      id: desktopSession.id,
      deviceInfo: desktopSession.deviceInfo,
      expiresAt: desktopSession.expiresAt,
      createdAt: desktopSession.createdAt,
    })
    .from(desktopSession)
    .where(
      and(
        eq(desktopSession.userId, userId),
        gt(desktopSession.expiresAt, now)
      )
    )
    .orderBy(desc(desktopSession.createdAt));
}

export async function revokeDesktopSessionById(
  userId: string,
  sessionId: string
): Promise<void> {
  await db()
    .delete(desktopSession)
    .where(
      and(
        eq(desktopSession.id, sessionId),
        eq(desktopSession.userId, userId)
      )
    );
}
