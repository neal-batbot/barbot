import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { closeDb, db } from '@/core/db';
import { account, credit, subscription, user } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import {
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
} from '@/shared/models/credit';

const ACCOUNT_COUNT = 40;
const EMAIL_PREFIX = 'testuser';
const DOMAIN = 'example.com';
const PASSWORD = 'Test@123456';
const CREDIT_AMOUNT = 999;
const TEST_PLAN_NAME = 'Pro Plan';

function buildPeriod() {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  return { now, periodEnd };
}

async function upsertCredentialAccount(userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  const existingAccounts = await db()
    .select()
    .from(account)
    .where(eq(account.userId, userId));

  const credentialAccount = existingAccounts.find(
    (row) => row.providerId === 'credential'
  );

  if (!credentialAccount) {
    await db().insert(account).values({
      id: getUuid(),
      userId,
      providerId: 'credential',
      accountId: userId,
      password: passwordHash,
    });
    return;
  }

  await db()
    .update(account)
    .set({ password: passwordHash })
    .where(eq(account.id, credentialAccount.id));
}

async function grantCredits(userId: string, email: string, amount: number) {
  // Ensure deterministic balance for test accounts.
  await db().delete(credit).where(eq(credit.userId, userId));

  await db().insert(credit).values({
    id: getUuid(),
    userId,
    userEmail: email,
    orderNo: '',
    subscriptionNo: '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.GIFT,
    credits: amount,
    remainingCredits: amount,
    description: 'Batch created test account credits',
    status: CreditStatus.ACTIVE,
  });
}

async function ensureTestSubscription(userId: string, email: string) {
  const [existingSubscription] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(subscription.createdAt);

  const { now, periodEnd } = buildPeriod();

  if (!existingSubscription) {
    await db().insert(subscription).values({
      id: getUuid(),
      subscriptionNo: getSnowId(),
      userId,
      userEmail: email,
      status: 'active',
      paymentProvider: 'internal-test',
      subscriptionId: `test-sub-${userId}`,
      subscriptionResult: 'generated-by-create-40-test-accounts',
      planName: TEST_PLAN_NAME,
      productName: 'IC-AI Test Plan',
      amount: 0,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      creditsAmount: CREDIT_AMOUNT,
      creditsValidDays: 30,
    });
    return;
  }

  await db()
    .update(subscription)
    .set({
      userEmail: email,
      status: 'active',
      planName: TEST_PLAN_NAME,
      productName: existingSubscription.productName || 'IC-AI Test Plan',
      interval: existingSubscription.interval || 'month',
      intervalCount: existingSubscription.intervalCount || 1,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      updatedAt: now,
    })
    .where(eq(subscription.id, existingSubscription.id));
}

async function main() {
  const lines: string[] = [
    'email,password,credits',
  ];

  for (let i = 1; i <= ACCOUNT_COUNT; i += 1) {
    const suffix = String(i).padStart(2, '0');
    const email = `${EMAIL_PREFIX}${suffix}@${DOMAIN}`;
    const name = `test-user-${suffix}`;

    const [existingUser] = await db().select().from(user).where(eq(user.email, email));
    const userId = existingUser?.id ?? getUuid();

    if (!existingUser) {
      await db().insert(user).values({
        id: userId,
        name,
        email,
        emailVerified: true,
      });
    }

    await upsertCredentialAccount(userId, PASSWORD);
    await ensureTestSubscription(userId, email);
    await grantCredits(userId, email, CREDIT_AMOUNT);

    lines.push(`${email},${PASSWORD},${CREDIT_AMOUNT.toFixed(2)}`);
  }

  const outputPath = join(process.cwd(), 'test-accounts-40.txt');
  writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

  console.log('✅ Done.');
  console.log(`Accounts: ${ACCOUNT_COUNT}`);
  console.log(`Credits per account: ${CREDIT_AMOUNT.toFixed(2)}`);
  console.log(`Credentials file: ${outputPath}`);

  await closeDb();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Failed to create test accounts:', error);
  process.exit(1);
});
