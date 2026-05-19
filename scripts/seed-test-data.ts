/**
 * Seed deterministic SaaS billing data for local dashboard/E2E validation.
 * Usage: pnpm exec tsx scripts/seed-test-data.ts
 */

import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';

import {
  account,
  apikey,
  billingEvent,
  credit,
  order,
  permission,
  planEntitlement,
  product,
  providerConfig,
  role,
  rolePermission,
  subscription,
  usageLog,
  user,
  userRole,
} from '@/config/db/schema';
import { db } from '@/core/db';
import { getUuid } from '@/shared/lib/hash';
import { ApikeyStatus } from '@/shared/models/apikey';

const TEST_EMAIL = process.env.E2E_BILLING_EMAIL || 'billing-e2e@example.com';
const ADMIN_EMAIL =
  process.env.E2E_BILLING_ADMIN_EMAIL || 'billing-admin-e2e@example.com';
const TEST_PASSWORD = process.env.E2E_BILLING_PASSWORD || 'Test@123456';
const API_KEY = process.env.E2E_BILLING_API_KEY || 'sk_e2e_billing_local';
const ADMIN_PERMISSIONS = [
  'admin.access',
  'admin.payments.read',
  'admin.subscriptions.read',
  'admin.credits.read',
];

function daysAgo(days: number): Date {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value;
}

async function ensureUser(email: string, name: string) {
  const [existing] = await db().select().from(user).where(eq(user.email, email));
  if (existing) return existing.id;

  const userId = getUuid();
  await db().insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
  });

  await db().insert(account).values({
    id: getUuid(),
    userId,
    providerId: 'credential',
    accountId: userId,
    password: await hashPassword(TEST_PASSWORD),
  });

  return userId;
}

async function ensureAdminRole(adminUserId: string) {
  let [adminRole] = await db()
    .select()
    .from(role)
    .where(eq(role.name, 'admin'));

  if (!adminRole) {
    [adminRole] = await db()
      .insert(role)
      .values({
        id: getUuid(),
        name: 'admin',
        title: 'Admin',
        description: 'Billing E2E admin role',
        status: 'active',
        sort: 10,
      })
      .returning();
  }

  for (const code of ADMIN_PERMISSIONS) {
    const [resource, ...actionParts] = code.replace(/^admin\./, '').split('.');
    const action = actionParts.join('.') || 'access';
    let [existingPermission] = await db()
      .select()
      .from(permission)
      .where(eq(permission.code, code));

    if (!existingPermission) {
      [existingPermission] = await db()
        .insert(permission)
        .values({
          id: getUuid(),
          code,
          resource: resource || 'admin',
          action,
          title: code,
          description: 'Required by billing E2E',
        })
        .returning();
    }

    const [existingRolePermission] = await db()
      .select()
      .from(rolePermission)
      .where(
        and(
          eq(rolePermission.roleId, adminRole.id),
          eq(rolePermission.permissionId, existingPermission.id)
        )
      );

    if (!existingRolePermission) {
      await db().insert(rolePermission).values({
        id: getUuid(),
        roleId: adminRole.id,
        permissionId: existingPermission.id,
      });
    }
  }

  const [existing] = await db()
    .select()
    .from(userRole)
    .where(
      and(eq(userRole.userId, adminUserId), eq(userRole.roleId, adminRole.id))
    );

  if (existing) return;

  await db().insert(userRole).values({
    id: getUuid(),
    userId: adminUserId,
    roleId: adminRole.id,
  });
}

async function ensureApiKey(userId: string) {
  const [existing] = await db()
    .select()
    .from(apikey)
    .where(and(eq(apikey.userId, userId), eq(apikey.key, API_KEY)));

  if (existing) return;

  await db().insert(apikey).values({
    id: getUuid(),
    userId,
    key: API_KEY,
    title: 'E2E Billing Usage Reporter',
    status: ApikeyStatus.ACTIVE,
  });
}

async function ensureDesktopAccess() {
  const [existingProduct] = await db()
    .select()
    .from(product)
    .where(eq(product.code, 'desktop_code'));

  if (!existingProduct) {
    await db().insert(product).values({
      id: getUuid(),
      code: 'desktop_code',
      name: 'Harvey Desktop',
      description: 'Electron desktop coding assistant',
      isActive: true,
    });
  }

  const [existingEntitlement] = await db()
    .select()
    .from(planEntitlement)
    .where(
      and(
        eq(planEntitlement.planName, 'Pi Agent Pro'),
        eq(planEntitlement.productCode, 'desktop_code')
      )
    );

  const entitlementValues = {
    planName: 'Pi Agent Pro',
    productCode: 'desktop_code',
    isEnabled: true,
    quotaTokens: 2_000_000,
    quotaRequests: null,
    features: JSON.stringify({
      device_limit: 3,
      advanced_model: true,
      allowed_models: ['gpt-5.5'],
    }),
  };

  if (existingEntitlement) {
    await db()
      .update(planEntitlement)
      .set(entitlementValues)
      .where(eq(planEntitlement.id, existingEntitlement.id));
  } else {
    await db().insert(planEntitlement).values({
      id: getUuid(),
      ...entitlementValues,
    });
  }

  const [existingProvider] = await db()
    .select()
    .from(providerConfig)
    .where(
      and(
        eq(providerConfig.planName, 'Pi Agent Pro'),
        eq(providerConfig.productCode, 'desktop_code'),
        eq(providerConfig.providerName, 'test_dragoncode'),
        eq(providerConfig.modelName, 'gpt-5.5')
      )
    );

  const providerValues = {
    planName: 'Pi Agent Pro',
    productCode: 'desktop_code',
    providerName: 'test_dragoncode',
    modelName: 'gpt-5.5',
    baseUrl: process.env.E2E_DESKTOP_PROVIDER_BASE_URL || 'mock://desktop-code',
    apiKey: process.env.E2E_DESKTOP_PROVIDER_API_KEY || 'sk_e2e_desktop_local',
    priority: 0,
    weight: 100,
    healthStatus: 'healthy',
    cooldownUntil: null,
    fallbackGroup: 'desktop-code-e2e',
    costPer1kInput: '0.0005',
    costPer1kOutput: '0.0015',
    supportsStreaming: true,
    isDefaultAuto: true,
    isActive: true,
  };

  if (existingProvider) {
    await db()
      .update(providerConfig)
      .set(providerValues)
      .where(eq(providerConfig.id, existingProvider.id));
  } else {
    await db().insert(providerConfig).values({
      id: getUuid(),
      ...providerValues,
    });
  }
}

async function ensureSubscription(userId: string) {
  const subscriptionNo = 'e2e-sub-pi-web-ui';
  const [existing] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo));

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const values = {
    id: getUuid(),
    subscriptionNo,
    userId,
    userEmail: TEST_EMAIL,
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: 'sub_e2e_pi_web_ui',
    subscriptionResult: JSON.stringify({ mode: 'e2e' }),
    productId: 'pi-web-ui-pro',
    productName: 'Pi Agent Pro',
    planName: 'Pi Agent Pro',
    description: 'E2E subscription for Pi Agent billing dashboard',
    amount: 1390,
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    creditsAmount: 100000,
    creditsValidDays: 30,
    paymentProductId: 'price_e2e_pi_web_ui_monthly',
    billingUrl: 'https://billing.stripe.com/e2e',
  };

  if (existing) return;
  await db().insert(subscription).values(values);
}

async function ensureOrder(userId: string) {
  const orderNo = 'e2e-order-pi-web-ui-paid';
  const [existing] = await db()
    .select()
    .from(order)
    .where(eq(order.orderNo, orderNo));

  if (existing) return;

  await db().insert(order).values({
    id: getUuid(),
    orderNo,
    userId,
    userEmail: TEST_EMAIL,
    status: 'paid',
    amount: 1390,
    currency: 'usd',
    productId: 'pi-web-ui-pro',
    productName: 'Pi Agent Pro',
    paymentType: 'subscription',
    paymentInterval: 'month',
    paymentProvider: 'stripe',
    paymentSessionId: 'cs_e2e_pi_web_ui',
    checkoutInfo: JSON.stringify({ mode: 'e2e' }),
    checkoutResult: JSON.stringify({ url: 'https://checkout.stripe.com/e2e' }),
    paymentResult: JSON.stringify({ paid: true }),
    paymentEmail: TEST_EMAIL,
    paymentAmount: 1390,
    paymentCurrency: 'usd',
    paidAt: daysAgo(2),
    description: 'E2E paid invoice for Pi Agent Pro',
    creditsAmount: 100000,
    creditsValidDays: 30,
    planName: 'Pi Agent Pro',
    paymentProductId: 'price_e2e_pi_web_ui_monthly',
    invoiceId: 'in_e2e_pi_web_ui',
    invoiceUrl: 'https://invoice.stripe.com/e2e',
    subscriptionNo: 'e2e-sub-pi-web-ui',
    transactionId: 'txn_e2e_pi_web_ui',
  });
}

async function ensureCredits(userId: string) {
  const grants = [
    {
      transactionNo: 'e2e-credit-grant-pi-web-ui',
      transactionType: 'grant',
      transactionScene: 'subscription',
      credits: 100000,
      remainingCredits: 97500,
      description: 'E2E subscription grant',
    },
    {
      transactionNo: 'e2e-credit-consume-pi-web-ui',
      transactionType: 'consume',
      transactionScene: 'chat',
      credits: -2500,
      remainingCredits: 0,
      description: 'E2E Pi Agent chat usage',
    },
  ];

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  for (const item of grants) {
    const [existing] = await db()
      .select()
      .from(credit)
      .where(eq(credit.transactionNo, item.transactionNo));
    if (existing) continue;

    await db().insert(credit).values({
      id: getUuid(),
      userId,
      userEmail: TEST_EMAIL,
      orderNo: 'e2e-order-pi-web-ui-paid',
      subscriptionNo: 'e2e-sub-pi-web-ui',
      transactionNo: item.transactionNo,
      transactionType: item.transactionType,
      transactionScene: item.transactionScene,
      credits: item.credits,
      remainingCredits: item.remainingCredits,
      description: item.description,
      expiresAt,
      status: 'active',
      metadata: JSON.stringify({ source: 'e2e-seed', product: 'pi-web-ui' }),
    });
  }
}

async function ensureUsage(userId: string) {
  const rows = [
    {
      requestId: 'e2e-pi-web-ui-dify-1',
      product: 'pi-web-ui',
      model: 'mcuAgent_v2',
      provider: 'dify',
      tokens: 1840,
      cost: '0.00000000',
      createdAt: daysAgo(1),
    },
    {
      requestId: 'e2e-pi-web-ui-dify-2',
      product: 'pi-web-ui',
      model: 'mcuAgent_v2',
      provider: 'dify',
      tokens: 2110,
      cost: '0.00000000',
      createdAt: daysAgo(3),
    },
    {
      requestId: 'e2e-api-gpt55-1',
      product: 'desktop_code',
      model: 'gpt-5.5',
      provider: 'test_dragoncode',
      tokens: 3200,
      cost: '0.06400000',
      createdAt: daysAgo(4),
    },
  ];

  for (const row of rows) {
    const [existing] = await db()
      .select()
      .from(usageLog)
      .where(and(eq(usageLog.userId, userId), eq(usageLog.requestId, row.requestId)));
    if (!existing) {
      await db().insert(usageLog).values({
        id: getUuid(),
        userId,
        appId: row.product,
        product: row.product,
        model: row.model,
        provider: row.provider,
        type: 'chat',
        tokens: row.tokens,
        cost: row.cost,
        source: 'server',
        requestId: row.requestId,
        status: 'success',
        metadata: JSON.stringify({ source: 'e2e-seed' }),
        createdAt: row.createdAt,
      });
    }

    const [event] = await db()
      .select()
      .from(billingEvent)
      .where(
        and(
          eq(billingEvent.userId, userId),
          eq(billingEvent.requestId, row.requestId)
        )
      );
    if (event) continue;

    await db().insert(billingEvent).values({
      id: getUuid(),
      userId,
      appId: row.product,
      requestId: row.requestId,
      source: 'server',
      product: row.product,
      model: row.model,
      provider: row.provider,
      billableTokens: row.tokens,
      unitPrice:
        row.tokens > 0 ? (Number(row.cost) / row.tokens).toFixed(12) : '0',
      amount: row.cost,
      period: new Date().toISOString().slice(0, 7),
      status: 'billable',
      metadata: JSON.stringify({ source: 'e2e-seed' }),
      createdAt: row.createdAt,
    });
  }
}

async function main() {
  console.log('Seeding billing E2E data...');

  const userId = await ensureUser(TEST_EMAIL, 'Billing E2E User');
  const adminUserId = await ensureUser(ADMIN_EMAIL, 'Billing E2E Admin');

  await ensureAdminRole(adminUserId);
  await ensureApiKey(userId);
  await ensureDesktopAccess();
  await ensureSubscription(userId);
  await ensureOrder(userId);
  await ensureCredits(userId);
  await ensureUsage(userId);

  console.log('Done.');
  console.log(`User:  ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  console.log(`Admin: ${ADMIN_EMAIL} / ${TEST_PASSWORD}`);
  console.log(`Usage token for Pi BFF: ${API_KEY}`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
