/**
 * Seed test data for usage and billing pages
 * Usage: npx tsx scripts/seed-test-data.ts
 */

import { db } from '@/core/db';
import { user, account, subscription, order, credit, usageLog } from '@/config/db/schema';
import { hashPassword } from 'better-auth/crypto';
import { getUuid } from '@/shared/lib/hash';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test@123456';

const PRODUCTS = ['ti-chatbot', 'novosns', 'image-gen'];
const MODELS = ['claude-3.5-sonnet', 'gpt-4o', 'dall-e-3'];
const TYPES = ['chat', 'image', 'chat', 'chat', 'image'];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log('🌱 Seeding test data...\n');

  // 1. Create test user
  let [existingUser] = await db().select().from(user).where(eq(user.email, TEST_EMAIL));
  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`✓ User already exists: ${TEST_EMAIL}`);
  } else {
    userId = getUuid();
    await db().insert(user).values({
      id: userId,
      name: 'Test User',
      email: TEST_EMAIL,
      emailVerified: true,
    });

    const passwordHash = await hashPassword(TEST_PASSWORD);
    await db().insert(account).values({
      id: getUuid(),
      userId,
      providerId: 'credential',
      accountId: userId,
      password: passwordHash,
    });
    console.log(`✓ Created user: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  }

  // 2. Create subscription
  const [existingSub] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));

  if (!existingSub) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db().insert(subscription).values({
      id: getUuid(),
      subscriptionNo: `SUB-${Date.now()}`,
      userId,
      userEmail: TEST_EMAIL,
      status: 'active',
      paymentProvider: 'stripe',
      subscriptionId: `sub_test_${Date.now()}`,
      planName: 'Pro Plan',
      productName: 'IC-AI Pro',
      amount: 2900,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      creditsAmount: 1000000,
      creditsValidDays: 30,
      billingUrl: 'https://billing.stripe.com/test',
    });
    console.log('✓ Created subscription: Pro Plan ($29/mo)');
  } else {
    console.log('✓ Subscription already exists');
  }

  // 3. Create credits
  const [existingCredit] = await db()
    .select()
    .from(credit)
    .where(eq(credit.userId, userId));

  if (!existingCredit) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await db().insert(credit).values({
      id: getUuid(),
      transactionNo: `TXN-${Date.now()}`,
      userId,
      transactionType: 'grant',
      scene: 'subscription',
      credits: 1000000,
      balance: 1000000,
      status: 'active',
      expiresAt,
    });
    console.log('✓ Created credits: 1,000,000');
  } else {
    console.log('✓ Credits already exist');
  }

  // 4. Create paid orders (invoices)
  const existingOrders = await db()
    .select()
    .from(order)
    .where(eq(order.userId, userId));

  if (existingOrders.length === 0) {
    for (let i = 0; i < 3; i++) {
      const paidAt = daysAgo(i * 30);
      await db().insert(order).values({
        id: getUuid(),
        orderNo: `ORD-${Date.now()}-${i}`,
        userId,
        userEmail: TEST_EMAIL,
        status: 'paid',
        paymentProvider: 'stripe',
        paymentType: 'subscription',
        amount: 2900,
        currency: 'usd',
        paymentAmount: 2900,
        paymentCurrency: 'usd',
        planName: 'Pro Plan',
        productName: 'IC-AI Pro',
        paidAt,
        invoiceId: `in_test_${Date.now()}_${i}`,
        checkoutInfo: '{}',
      });
    }
    console.log('✓ Created 3 invoices');
  } else {
    console.log('✓ Orders already exist');
  }

  // 5. Create usage logs (90 days of data)
  const existingLogs = await db()
    .select()
    .from(usageLog)
    .where(eq(usageLog.userId, userId));

  if (existingLogs.length === 0) {
    const logs = [];
    for (let day = 89; day >= 0; day--) {
      const requestsToday = randomInt(5, 40);
      for (let r = 0; r < requestsToday; r++) {
        const product = randomFrom(PRODUCTS);
        const type = product === 'image-gen' ? 'image' : randomFrom(['chat', 'chat', 'chat']);
        const model = type === 'image' ? 'dall-e-3' : randomFrom(['claude-3.5-sonnet', 'gpt-4o']);
        const tokens = type === 'image' ? 0 : randomInt(200, 4000);
        const cost = type === 'image' ? 0.04 : tokens * 0.000003;

        const createdAt = daysAgo(day);
        createdAt.setHours(randomInt(8, 22), randomInt(0, 59));

        logs.push({
          id: getUuid(),
          userId,
          appId: 'legacy',
          product,
          model,
          type,
          tokens,
          cost: cost.toFixed(8),
          status: Math.random() > 0.05 ? 'success' : 'error',
          createdAt,
        });
      }
    }

    // Insert in batches of 100
    for (let i = 0; i < logs.length; i += 100) {
      await db().insert(usageLog).values(logs.slice(i, i + 100));
    }
    console.log(`✓ Created ${logs.length} usage log entries (90 days)`);
  } else {
    console.log(`✓ Usage logs already exist (${existingLogs.length} entries)`);
  }

  console.log('\n✅ Done! Login at http://localhost:3000/en/sign-in');
  console.log(`   Email:    ${TEST_EMAIL}`);
  console.log(`   Password: ${TEST_PASSWORD}`);
}

main().catch((e) => {
  console.error('\n❌ Error:', e);
  process.exit(1);
});
