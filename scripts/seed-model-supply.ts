/**
 * Seed deterministic model supply configuration for Web Chat.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-model-supply.ts
 *   MODEL_SUPPLY_SEED_MODE=e2e pnpm exec tsx scripts/seed-model-supply.ts
 *   MODEL_SUPPLY_SEED_ACTION=degrade-primary pnpm exec tsx scripts/seed-model-supply.ts
 *   MODEL_SUPPLY_SEED_ACTION=restore-primary pnpm exec tsx scripts/seed-model-supply.ts
 */

import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { PERMISSIONS } from '@/core/rbac/permission';
import {
  account,
  permission,
  planEntitlement,
  product,
  providerConfig,
  role,
  rolePermission,
  subscription,
  user,
  userRole,
} from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

const MODE = process.env.MODEL_SUPPLY_SEED_MODE || 'local';
const ACTION = process.env.MODEL_SUPPLY_SEED_ACTION || 'seed';
const E2E_EMAIL =
  process.env.MODEL_SUPPLY_E2E_EMAIL || 'model-supply-e2e@example.com';
const E2E_PASSWORD = process.env.MODEL_SUPPLY_E2E_PASSWORD || 'Test@123456';

type EntitlementSeed = {
  planName: string;
  features: Record<string, unknown>;
};

type ProviderSeed = {
  planName: string;
  providerName: string;
  modelName: string;
  priority: number;
  fallbackGroup: string;
  isDefaultAuto?: boolean;
  weight?: number;
  baseUrl?: string;
  apiKey?: string;
  costPer1kInput?: string;
  costPer1kOutput?: string;
};

const entitlements: EntitlementSeed[] = [
  {
    planName: 'free',
    features: {
      allowed_models: ['auto', 'kimi-*', 'glm-*'],
      premium_model_pool: ['claude-*', 'gpt-*', 'openai/*'],
      auto_model_enabled: true,
      overage_enabled: false,
      monthly_token_quota: 100_000,
      cost_multiplier: 1,
      unit_price_per_1k: 0,
    },
  },
  {
    planName: 'pro',
    features: {
      allowed_models: [
        'auto',
        'kimi-*',
        'glm-*',
        'claude-*',
        'gpt-*',
        'openai/*',
        'google/gemini-2.0-flash-001',
        'deepseek/deepseek-chat',
        'qwen/qwen-2.5-72b-instruct',
      ],
      premium_model_pool: ['claude-*', 'gpt-*', 'openai/*'],
      auto_model_enabled: true,
      overage_enabled: true,
      monthly_token_quota: 2_000_000,
      cost_multiplier: 1,
      unit_price_per_1k: 0.0035,
    },
  },
  {
    planName: 'team',
    features: {
      allowed_models: ['*'],
      premium_model_pool: ['*'],
      auto_model_enabled: true,
      overage_enabled: true,
      monthly_token_quota: 10_000_000,
      cost_multiplier: 1,
      unit_price_per_1k: 0.0025,
    },
  },
];

function providerSeeds(): ProviderSeed[] {
  if (MODE === 'e2e') {
    return [
      {
        planName: 'free',
        providerName: 'mock',
        modelName: 'mock-primary',
        priority: -100,
        fallbackGroup: 'e2e-chat',
        isDefaultAuto: true,
        baseUrl: 'mock://primary',
        apiKey: 'mock',
      },
      {
        planName: 'free',
        providerName: 'mock',
        modelName: 'mock-fallback',
        priority: -90,
        fallbackGroup: 'e2e-chat',
        baseUrl: 'mock://fallback',
        apiKey: 'mock',
      },
    ];
  }

  return [
    {
      planName: 'free',
      providerName: 'kimi',
      modelName: 'kimi-k2.5',
      priority: 0,
      fallbackGroup: 'chat-basic',
      isDefaultAuto: true,
      baseUrl:
        process.env.KIMI_CODING_BASE_URL || 'https://api.kimi.com/coding',
      apiKey: process.env.KIMI_CODING_API_KEY || process.env.KIMI_API_KEY || '',
      costPer1kInput: '0.0005',
      costPer1kOutput: '0.0015',
    },
    {
      planName: 'free',
      providerName: 'zhipu',
      modelName: 'glm-4-flash',
      priority: 1,
      fallbackGroup: 'chat-basic',
      baseUrl:
        process.env.ZHIPU_CODING_BASE_URL ||
        'https://open.bigmodel.cn/api/coding/paas/v4',
      apiKey:
        process.env.ZHIPU_CODING_API_KEY || process.env.ZHIPU_API_KEY || '',
      costPer1kInput: '0.0001',
      costPer1kOutput: '0.0001',
    },
    {
      planName: 'pro',
      providerName: 'claude-proxy',
      modelName: 'claude-sonnet-4-6',
      priority: 0,
      fallbackGroup: 'chat-premium',
      isDefaultAuto: true,
      baseUrl: process.env.CLAUDE_PROXY_BASE_URL || '',
      apiKey: process.env.CLAUDE_PROXY_API_KEY || '',
      costPer1kInput: '0.003',
      costPer1kOutput: '0.015',
    },
    {
      planName: 'pro',
      providerName: 'kimi',
      modelName: 'kimi-k2.5',
      priority: 1,
      fallbackGroup: 'chat-premium',
      baseUrl:
        process.env.KIMI_CODING_BASE_URL || 'https://api.kimi.com/coding',
      apiKey: process.env.KIMI_CODING_API_KEY || process.env.KIMI_API_KEY || '',
      costPer1kInput: '0.0005',
      costPer1kOutput: '0.0015',
    },
    {
      planName: 'team',
      providerName: 'claude-proxy',
      modelName: 'claude-sonnet-4-6',
      priority: 0,
      fallbackGroup: 'chat-team',
      isDefaultAuto: true,
      baseUrl: process.env.CLAUDE_PROXY_BASE_URL || '',
      apiKey: process.env.CLAUDE_PROXY_API_KEY || '',
      costPer1kInput: '0.003',
      costPer1kOutput: '0.015',
    },
  ];
}

async function upsertProduct() {
  const [existing] = await db()
    .select()
    .from(product)
    .where(eq(product.code, 'chat'));
  if (existing) {
    await db()
      .update(product)
      .set({
        name: 'Web Chat',
        description: 'Barbot Web Chat model supply',
        isActive: true,
      })
      .where(eq(product.id, existing.id));
    return;
  }

  await db().insert(product).values({
    code: 'chat',
    name: 'Web Chat',
    description: 'Barbot Web Chat model supply',
    isActive: true,
  });
}

async function upsertEntitlements() {
  for (const item of entitlements) {
    const [existing] = await db()
      .select()
      .from(planEntitlement)
      .where(
        and(
          eq(planEntitlement.planName, item.planName),
          eq(planEntitlement.productCode, 'chat')
        )
      );

    const values = {
      planName: item.planName,
      productCode: 'chat',
      isEnabled: true,
      quotaTokens: item.features.monthly_token_quota as number,
      features: JSON.stringify(item.features),
    };

    if (existing) {
      await db()
        .update(planEntitlement)
        .set(values)
        .where(eq(planEntitlement.id, existing.id));
    } else {
      await db().insert(planEntitlement).values(values);
    }
  }
}

async function upsertProviders() {
  for (const item of providerSeeds()) {
    const [existing] = await db()
      .select()
      .from(providerConfig)
      .where(
        and(
          eq(providerConfig.planName, item.planName),
          eq(providerConfig.productCode, 'chat'),
          eq(providerConfig.providerName, item.providerName),
          eq(providerConfig.modelName, item.modelName)
        )
      );

    const values = {
      planName: item.planName,
      productCode: 'chat',
      providerName: item.providerName,
      modelName: item.modelName,
      baseUrl: item.baseUrl || '',
      apiKey: item.apiKey || '',
      priority: item.priority,
      weight: item.weight || 0,
      healthStatus: 'healthy',
      cooldownUntil: null,
      fallbackGroup: item.fallbackGroup,
      costPer1kInput: item.costPer1kInput,
      costPer1kOutput: item.costPer1kOutput,
      supportsStreaming: true,
      isDefaultAuto: Boolean(item.isDefaultAuto),
      isActive: true,
    };

    if (existing) {
      await db()
        .update(providerConfig)
        .set(values)
        .where(eq(providerConfig.id, existing.id));
    } else {
      await db().insert(providerConfig).values(values);
    }
  }
}

async function setE2EPrimaryHealth(healthStatus: 'healthy' | 'degraded') {
  const cooldownUntil =
    healthStatus === 'degraded' ? new Date(Date.now() + 10 * 60 * 1000) : null;

  await db()
    .update(providerConfig)
    .set({ healthStatus, cooldownUntil })
    .where(
      and(
        eq(providerConfig.planName, 'free'),
        eq(providerConfig.productCode, 'chat'),
        eq(providerConfig.providerName, 'mock'),
        eq(providerConfig.modelName, 'mock-primary')
      )
    );
}

async function ensurePermissionRole(userId: string) {
  const [existingPermission] = await db()
    .select()
    .from(permission)
    .where(eq(permission.code, PERMISSIONS.CHAT_MODEL_USE));
  const permissionId = existingPermission?.id || getUuid();

  if (!existingPermission) {
    await db().insert(permission).values({
      id: permissionId,
      code: PERMISSIONS.CHAT_MODEL_USE,
      resource: 'chat',
      action: 'model.use',
      title: 'Use chat models',
      description: 'Allows a user to use Web Chat model supply.',
    });
  }

  const [existingRole] = await db()
    .select()
    .from(role)
    .where(eq(role.name, 'model-supply-e2e'));
  const roleId = existingRole?.id || getUuid();

  if (!existingRole) {
    await db().insert(role).values({
      id: roleId,
      name: 'model-supply-e2e',
      title: 'Model Supply E2E',
      description: 'Deterministic Web Chat model supply test role',
      status: 'active',
      sort: 0,
    });
  }

  const [existingRolePermission] = await db()
    .select()
    .from(rolePermission)
    .where(
      and(
        eq(rolePermission.roleId, roleId),
        eq(rolePermission.permissionId, permissionId)
      )
    );
  if (!existingRolePermission) {
    await db().insert(rolePermission).values({
      id: getUuid(),
      roleId,
      permissionId,
    });
  }

  const [existingUserRole] = await db()
    .select()
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)));
  if (!existingUserRole) {
    await db().insert(userRole).values({
      id: getUuid(),
      userId,
      roleId,
    });
  }
}

async function ensureE2EUser() {
  const [existingUser] = await db()
    .select()
    .from(user)
    .where(eq(user.email, E2E_EMAIL));
  const userId = existingUser?.id || getUuid();

  if (!existingUser) {
    await db().insert(user).values({
      id: userId,
      name: 'Model Supply E2E',
      email: E2E_EMAIL,
      emailVerified: true,
    });
  }

  const [existingAccount] = await db()
    .select()
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, 'credential'))
    );
  if (!existingAccount) {
    await db()
      .insert(account)
      .values({
        id: getUuid(),
        userId,
        providerId: 'credential',
        accountId: userId,
        password: await hashPassword(E2E_PASSWORD),
      });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const subscriptionNo = 'e2e-model-supply-free';
  const [existingSubscription] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo));
  if (!existingSubscription) {
    await db()
      .insert(subscription)
      .values({
        id: getUuid(),
        subscriptionNo,
        userId,
        userEmail: E2E_EMAIL,
        status: 'active',
        paymentProvider: 'e2e',
        subscriptionId: 'sub_e2e_model_supply_free',
        subscriptionResult: JSON.stringify({ mode: 'e2e' }),
        productId: 'chat-free',
        productName: 'Web Chat Free',
        planName: 'free',
        description: 'E2E subscription for Web Chat model supply',
        amount: 0,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        creditsAmount: 0,
        creditsValidDays: 30,
        paymentProductId: 'price_e2e_chat_free',
      });
  }

  await ensurePermissionRole(userId);
  return userId;
}

async function main() {
  await upsertProduct();
  await upsertEntitlements();
  await upsertProviders();

  if (ACTION === 'degrade-primary') {
    await setE2EPrimaryHealth('degraded');
  } else if (ACTION === 'restore-primary') {
    await setE2EPrimaryHealth('healthy');
  }

  let userId: string | undefined;
  if (MODE === 'e2e') {
    userId = await ensureE2EUser();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: MODE,
        action: ACTION,
        productCode: 'chat',
        e2eEmail: MODE === 'e2e' ? E2E_EMAIL : undefined,
        e2eUserId: userId,
      },
      null,
      2
    )
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
