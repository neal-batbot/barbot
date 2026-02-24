/**
 * Create test users and assign role
 *
 * Usage:
 *   npx tsx scripts/create-test-users.ts --count=10 --role=admin
 *   npx tsx scripts/create-test-users.ts --count=10 --role=admin --email-prefix=test-admin --domain=example.com
 *   npx tsx scripts/create-test-users.ts --count=10 --role=admin --password=Test@123456
 */

import { eq } from 'drizzle-orm';

import { hashPassword } from 'better-auth/crypto';

import { db } from '@/core/db';
import { account, user } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { assignRoleToUser, getRoleByName, getUserRoles } from '@/shared/services/rbac';

type Args = {
  count: number;
  role: string;
  emailPrefix: string;
  domain: string;
  password: string;
  verified: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const getArg = (name: string) =>
    args.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];

  const count = Number(getArg('count') || 10);
  const role = getArg('role') || 'admin';
  const emailPrefix = getArg('email-prefix') || 'test-admin';
  const domain = getArg('domain') || 'example.com';
  const password = getArg('password') || 'Test@123456';
  const verified = (getArg('verified') || 'true') !== 'false';

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error('Invalid --count value');
  }

  return { count, role, emailPrefix, domain, password, verified };
}

async function ensureCredentialAccount(userId: string, password: string) {
  const existing = await db()
    .select()
    .from(account)
    .where(eq(account.userId, userId));

  const hasCredential = existing.some((row) => row.providerId === 'credential');
  if (hasCredential) {
    return;
  }

  const passwordHash = await hashPassword(password);
  await db().insert(account).values({
    id: getUuid(),
    userId,
    providerId: 'credential',
    accountId: userId,
    password: passwordHash,
  });
}

async function main() {
  const { count, role, emailPrefix, domain, password, verified } = parseArgs();

  const targetRole = await getRoleByName(role);
  if (!targetRole) {
    throw new Error(`Role not found: ${role}`);
  }

  const createdEmails: string[] = [];
  const skippedEmails: string[] = [];

  for (let i = 1; i <= count; i += 1) {
    const email = `${emailPrefix}${String(i).padStart(2, '0')}@${domain}`;

    const [existingUser] = await db().select().from(user).where(eq(user.email, email));
    let userId = existingUser?.id;

    if (!userId) {
      userId = getUuid();
      await db().insert(user).values({
        id: userId,
        name: `${emailPrefix}-${String(i).padStart(2, '0')}`,
        email,
        emailVerified: verified,
      });
      createdEmails.push(email);
    } else {
      skippedEmails.push(email);
    }

    await ensureCredentialAccount(userId, password);

    const roles = await getUserRoles(userId);
    const hasRole = roles.some((r) => r.id === targetRole.id);
    if (!hasRole) {
      await assignRoleToUser(userId, targetRole.id);
    }
  }

  console.log('\n✅ Test users created/updated');
  console.log(`Role: ${targetRole.name}`);
  console.log(`Password: ${password}`);
  if (createdEmails.length) {
    console.log('\nCreated:');
    createdEmails.forEach((email) => console.log(`  - ${email}`));
  }
  if (skippedEmails.length) {
    console.log('\nAlready existed (role ensured):');
    skippedEmails.forEach((email) => console.log(`  - ${email}`));
  }
  console.log('');
}

main().catch((error) => {
  console.error('\n❌ Failed to create test users:', error);
  process.exit(1);
});
