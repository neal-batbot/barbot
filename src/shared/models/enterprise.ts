import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { enterpriseAccount, enterpriseMember } from '@/config/db/schema';

export type EnterpriseAccount = typeof enterpriseAccount.$inferSelect;
export type EnterpriseMember = typeof enterpriseMember.$inferSelect;

export async function getEnterpriseBySlug(slug: string): Promise<EnterpriseAccount | null> {
  const rows = await db()
    .select()
    .from(enterpriseAccount)
    .where(and(eq(enterpriseAccount.slug, slug), eq(enterpriseAccount.status, 'active')))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEnterpriseById(id: string): Promise<EnterpriseAccount | null> {
  const rows = await db()
    .select()
    .from(enterpriseAccount)
    .where(eq(enterpriseAccount.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEnterpriseMembership(
  userId: string,
  enterpriseId: string
): Promise<EnterpriseMember | null> {
  const rows = await db()
    .select()
    .from(enterpriseMember)
    .where(
      and(eq(enterpriseMember.userId, userId), eq(enterpriseMember.enterpriseId, enterpriseId))
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Returns all enterprise accounts the user belongs to.
 */
export async function getUserEnterprises(userId: string): Promise<EnterpriseAccount[]> {
  const members = await db()
    .select()
    .from(enterpriseMember)
    .where(eq(enterpriseMember.userId, userId));

  if (members.length === 0) return [];

  const enterpriseIds = members.map((m) => m.enterpriseId);
  const rows = await db()
    .select()
    .from(enterpriseAccount)
    .where(eq(enterpriseAccount.status, 'active'));

  return rows.filter((e) => enterpriseIds.includes(e.id));
}

/**
 * Check if a user is a member of an enterprise that has access to the given bot.
 * Returns the matching enterprise account, or null.
 */
export async function findEnterpriseBotAccess(
  userId: string,
  botId: string
): Promise<EnterpriseAccount | null> {
  const enterprises = await getUserEnterprises(userId);
  for (const enterprise of enterprises) {
    let botIds: string[] = [];
    try {
      botIds = JSON.parse(enterprise.botIds);
    } catch {
      // ignore malformed json
    }
    if (botIds.includes(botId)) {
      return enterprise;
    }
  }
  return null;
}
