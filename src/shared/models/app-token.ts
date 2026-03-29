import { createHash, randomBytes } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { appToken } from '@/config/db/schema';

export type AppToken = typeof appToken.$inferSelect;
export type NewAppToken = typeof appToken.$inferInsert;

export enum AppTokenStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export function hashAppToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function generateAppTokenValue(): {
  rawToken: string;
  tokenPrefix: string;
  tokenHash: string;
} {
  const rawToken = `icat_${randomBytes(24).toString('hex')}`;
  const tokenPrefix = rawToken.slice(0, 12);
  const tokenHash = hashAppToken(rawToken);

  return { rawToken, tokenPrefix, tokenHash };
}

export async function createAppToken(input: NewAppToken): Promise<AppToken> {
  const [result] = await db().insert(appToken).values(input).returning();
  return result;
}

export async function listUserAppTokens(userId: string): Promise<AppToken[]> {
  return db()
    .select()
    .from(appToken)
    .where(eq(appToken.userId, userId))
    .orderBy(desc(appToken.createdAt));
}

export async function findActiveAppTokenByRawToken(
  rawToken: string
): Promise<AppToken | undefined> {
  const tokenHash = hashAppToken(rawToken);
  const [result] = await db()
    .select()
    .from(appToken)
    .where(
      and(
        eq(appToken.tokenHash, tokenHash),
        eq(appToken.status, AppTokenStatus.ACTIVE)
      )
    )
    .limit(1);

  return result;
}

export async function touchAppTokenUsedAt(id: string): Promise<void> {
  await db()
    .update(appToken)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(appToken.id, id));
}

export async function revokeAppToken({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<AppToken | undefined> {
  const [result] = await db()
    .update(appToken)
    .set({ status: AppTokenStatus.REVOKED, updatedAt: new Date() })
    .where(and(eq(appToken.id, id), eq(appToken.userId, userId)))
    .returning();

  return result;
}
