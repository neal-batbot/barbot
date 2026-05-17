import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  buildStaticProviderFailoverChain,
  DEFAULT_STATIC_MODEL_BY_PROVIDER,
  inferChatProvider,
  STATIC_PROVIDER_CHAIN,
} from '@/config/chat-providers';
import { providerConfig } from '@/config/db/schema';
import { getBillingUsageForPeriod } from '@/shared/models/billing-event';
import { getRemainingCredits } from '@/shared/models/credit';
import {
  findPlanEntitlement,
  parseFeatures,
} from '@/shared/models/plan-entitlement';
import { getProviderConfigs } from '@/shared/models/provider-config';
import { getCurrentSubscription } from '@/shared/models/subscription';
import {
  checkChatAccess,
  getBillingPeriodLabel,
} from '@/shared/services/entitlement';

export type PlanName = 'free' | 'pro' | 'team';

export type ModelSupplyErrorCode =
  | 'SUBSCRIPTION_REQUIRED'
  | 'MODEL_NOT_ALLOWED'
  | 'QUOTA_EXCEEDED'
  | 'PROVIDER_UNAVAILABLE'
  | 'BOT_ACCESS_DENIED'
  | 'TRIAL_QUOTA_EXCEEDED';

export interface PlanPolicy {
  plan: PlanName;
  quotaTokens: number;
  allowedModels: string[];
  premiumModelPool: string[];
  overageEnabled: boolean;
  autoModelEnabled: boolean;
  costMultiplier: number;
  unitPricePer1k: number;
}

export interface BillingPolicy {
  usageType: 'included' | 'credits' | 'on_demand';
  period: string;
  quotaTokens: number;
  usedTokens: number;
  remainingTokens: number;
  remainingCredits: number;
  overageEnabled: boolean;
  costMultiplier: number;
  unitPricePer1k: number;
}

export interface AccessEvaluation {
  allowed: boolean;
  code?: ModelSupplyErrorCode;
  message?: string;
  upgradeUrl?: string;
  billingPolicy: BillingPolicy;
}

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'down';

export interface ProviderChannel {
  channelId: string;
  provider: string;
  model: string;
  priority: number;
  weight?: number;
  healthStatus?: ProviderHealthStatus;
  cooldownUntil?: Date | string | null;
  fallbackGroup?: string | null;
  supportsStreaming?: boolean;
  isDefaultAuto?: boolean;
  baseUrl?: string | null;
  apiKey?: string | null;
  costPer1kInput?: string | null;
  costPer1kOutput?: string | null;
}

export interface ProviderAttempt {
  channelId: string;
  provider: string;
  model: string;
  fallbackReason?: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  costPer1kInput?: string | null;
  costPer1kOutput?: string | null;
}

export interface ProviderExecutionPlan {
  selectedProvider: string;
  selectedModel: string;
  selectedChannelId: string;
  fallbackChain: ProviderAttempt[];
  providerUnavailable: boolean;
}

export interface ChatModelSupplyDecision extends ProviderExecutionPlan {
  requestedModel: string;
  requestedProvider: string;
  plan: PlanName;
  billingPolicy: BillingPolicy;
  entitlement: AccessEvaluation;
}

export interface ChatPlanView {
  plan: PlanName;
  allowedModels: string[];
  autoModelEnabled: boolean;
  quotaTokens: number;
  usedTokens: number;
  remainingTokens: number;
  remainingCredits: number;
  overageEnabled: boolean;
  billingPolicy: BillingPolicy;
}

export class ProviderUnavailableError extends Error {
  code: ModelSupplyErrorCode = 'PROVIDER_UNAVAILABLE';
  status = 503;

  constructor(message = 'No healthy provider is available for this model.') {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

const DEFAULT_PLAN_POLICIES: Record<PlanName, PlanPolicy> = {
  free: {
    plan: 'free',
    quotaTokens: 100_000,
    overageEnabled: false,
    autoModelEnabled: true,
    costMultiplier: 1,
    unitPricePer1k: 0,
    allowedModels: ['auto', 'kimi-*', 'glm-*'],
    premiumModelPool: ['claude-*', 'gpt-*', 'openai/*', 'deepseek/*', 'qwen/*'],
  },
  pro: {
    plan: 'pro',
    quotaTokens: 2_000_000,
    overageEnabled: true,
    autoModelEnabled: true,
    costMultiplier: 1,
    unitPricePer1k: 0.0035,
    allowedModels: [
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
    premiumModelPool: ['claude-*', 'gpt-*', 'openai/*'],
  },
  team: {
    plan: 'team',
    quotaTokens: 10_000_000,
    overageEnabled: true,
    autoModelEnabled: true,
    costMultiplier: 1,
    unitPricePer1k: 0.0025,
    allowedModels: ['*'],
    premiumModelPool: ['*'],
  },
};

function coercePlanName(input?: string | null): PlanName {
  const value = (input || '').toLowerCase();
  if (value.includes('team')) return 'team';
  if (value.includes('pro') || value.includes('premium')) return 'pro';
  return 'free';
}

function readFeature<T>(
  features: Record<string, unknown> | null | undefined,
  snakeKey: string,
  camelKey: string,
  fallback: T
): T {
  if (!features) return fallback;
  const value = features[snakeKey] ?? features[camelKey];
  return value === undefined || value === null ? fallback : (value as T);
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return numeric;
}

function toStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );
  return cleaned.length > 0 ? cleaned : fallback;
}

function matchesModelRule(model: string, rule: string): boolean {
  if (rule === '*') return true;
  if (rule.endsWith('*')) {
    return model.startsWith(rule.slice(0, -1));
  }
  return model === rule;
}

function isModelAllowed(model: string, allowedRules: string[]): boolean {
  return allowedRules.some((rule) => matchesModelRule(model, rule));
}

function isCoolingDown(channel: ProviderChannel, now: Date): boolean {
  if (!channel.cooldownUntil) return false;
  const cooldownUntil = new Date(channel.cooldownUntil);
  return Number.isFinite(cooldownUntil.getTime()) && cooldownUntil > now;
}

function toAttempt(
  channel: ProviderChannel,
  fallbackReason?: string
): ProviderAttempt {
  return {
    channelId: channel.channelId,
    provider: channel.provider,
    model: channel.model,
    fallbackReason,
    baseUrl: channel.baseUrl,
    apiKey: channel.apiKey,
    costPer1kInput: channel.costPer1kInput,
    costPer1kOutput: channel.costPer1kOutput,
  };
}

export function resolvePlanPolicy(
  planInput?: string | null,
  features?: Record<string, unknown> | null
): PlanPolicy {
  const plan = coercePlanName(planInput);
  const defaults = DEFAULT_PLAN_POLICIES[plan];
  const allowedModels = toStringArray(
    readFeature(
      features,
      'allowed_models',
      'allowedModels',
      defaults.allowedModels
    ),
    defaults.allowedModels
  );
  const premiumModelPool = toStringArray(
    readFeature(
      features,
      'premium_model_pool',
      'premiumModelPool',
      defaults.premiumModelPool
    ),
    defaults.premiumModelPool
  );

  return {
    ...defaults,
    allowedModels,
    premiumModelPool,
    quotaTokens: toPositiveNumber(
      readFeature(
        features,
        'monthly_token_quota',
        'monthlyTokenQuota',
        defaults.quotaTokens
      ),
      defaults.quotaTokens
    ),
    overageEnabled: Boolean(
      readFeature(
        features,
        'overage_enabled',
        'overageEnabled',
        defaults.overageEnabled
      )
    ),
    autoModelEnabled: Boolean(
      readFeature(
        features,
        'auto_model_enabled',
        'autoModelEnabled',
        defaults.autoModelEnabled
      )
    ),
    costMultiplier: toPositiveNumber(
      readFeature(
        features,
        'cost_multiplier',
        'costMultiplier',
        defaults.costMultiplier
      ),
      defaults.costMultiplier
    ),
    unitPricePer1k: toPositiveNumber(
      readFeature(
        features,
        'unit_price_per_1k',
        'unitPricePer1k',
        defaults.unitPricePer1k
      ),
      defaults.unitPricePer1k
    ),
  };
}

export function evaluatePlanAccess({
  requestedModel,
  policy,
  usedTokens,
  remainingCredits,
  now = new Date(),
}: {
  requestedModel: string;
  policy: PlanPolicy;
  usedTokens: number;
  remainingCredits: number;
  now?: Date;
}): AccessEvaluation {
  const normalizedModel = requestedModel || 'auto';
  const isAuto = normalizedModel === 'auto';
  const remainingTokens = Math.max(policy.quotaTokens - usedTokens, 0);
  const billingPolicy: BillingPolicy = {
    usageType:
      remainingTokens > 0
        ? 'included'
        : remainingCredits > 0
          ? 'credits'
          : 'on_demand',
    period: getBillingPeriodLabel(now),
    quotaTokens: policy.quotaTokens,
    usedTokens,
    remainingTokens,
    remainingCredits,
    overageEnabled: policy.overageEnabled,
    costMultiplier: policy.costMultiplier,
    unitPricePer1k: policy.unitPricePer1k,
  };

  if (isAuto && !policy.autoModelEnabled) {
    return {
      allowed: false,
      code: 'MODEL_NOT_ALLOWED',
      message: 'Auto model routing is not enabled for this plan.',
      upgradeUrl: '/pricing',
      billingPolicy,
    };
  }

  if (!isAuto && !isModelAllowed(normalizedModel, policy.allowedModels)) {
    const premiumOnly = isModelAllowed(
      normalizedModel,
      policy.premiumModelPool
    );
    return {
      allowed: false,
      code:
        premiumOnly && policy.plan === 'free'
          ? 'SUBSCRIPTION_REQUIRED'
          : 'MODEL_NOT_ALLOWED',
      message:
        premiumOnly && policy.plan === 'free'
          ? 'This model requires a paid subscription.'
          : 'Model is not allowed by your current plan.',
      upgradeUrl: '/pricing',
      billingPolicy,
    };
  }

  if (remainingTokens <= 0 && !policy.overageEnabled && remainingCredits <= 0) {
    return {
      allowed: false,
      code: 'QUOTA_EXCEEDED',
      message: 'Your monthly model usage quota has been exceeded.',
      upgradeUrl: '/pricing',
      billingPolicy,
    };
  }

  return { allowed: true, billingPolicy };
}

export function buildProviderExecutionPlan({
  requestedModel,
  requestedProvider,
  channels,
  now = new Date(),
}: {
  requestedModel: string;
  requestedProvider?: string | null;
  channels: ProviderChannel[];
  now?: Date;
}): ProviderExecutionPlan {
  const isAuto = !requestedModel || requestedModel === 'auto';
  const sorted = channels
    .filter((channel) => channel.supportsStreaming !== false)
    .sort(
      (a, b) => a.priority - b.priority || (b.weight ?? 0) - (a.weight ?? 0)
    );
  const candidates = sorted.filter((channel) => {
    if (channel.healthStatus === 'down') return false;
    if (isCoolingDown(channel, now)) return false;
    return true;
  });
  const preferred = isAuto
    ? (sorted.find((channel) => channel.isDefaultAuto) ?? sorted[0])
    : sorted.find(
        (channel) =>
          channel.model === requestedModel ||
          (requestedProvider && channel.provider === requestedProvider)
      );
  const preferredFallbackGroup = preferred?.fallbackGroup;
  const requested = isAuto
    ? (candidates.find((channel) => channel.isDefaultAuto) ?? candidates[0])
    : (candidates.find(
        (channel) =>
          channel.model === requestedModel ||
          (requestedProvider && channel.provider === requestedProvider)
      ) ??
      (preferredFallbackGroup
        ? candidates.find(
            (channel) => channel.fallbackGroup === preferredFallbackGroup
          )
        : undefined));

  if (!requested) {
    return {
      selectedProvider: requestedProvider || inferChatProvider(requestedModel),
      selectedModel: requestedModel,
      selectedChannelId: '',
      fallbackChain: [],
      providerUnavailable: true,
    };
  }

  const fallbackGroup = requested.fallbackGroup || preferredFallbackGroup;
  const fallbackCandidates = candidates.filter((channel) => {
    if (channel.channelId === requested.channelId) return true;
    if (fallbackGroup && channel.fallbackGroup === fallbackGroup) return true;
    if (!fallbackGroup && channel.provider !== requested.provider) return true;
    return false;
  });
  const fallbackChain = fallbackCandidates.map((channel, index) =>
    toAttempt(
      channel,
      index === 0 ? undefined : `fallback:${requested.provider}`
    )
  );

  return {
    selectedProvider: requested.provider,
    selectedModel: requested.model,
    selectedChannelId: requested.channelId,
    fallbackChain,
    providerUnavailable: fallbackChain.length === 0,
  };
}

function getCurrentPeriod(
  subscription: Awaited<ReturnType<typeof getCurrentSubscription>>
) {
  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    return {
      start: new Date(subscription.currentPeriodStart),
      end: new Date(subscription.currentPeriodEnd),
    };
  }

  const now = new Date();
  return {
    start: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
    ),
    end: now,
  };
}

export async function resolveChatPlanView({
  userId,
  productCode = 'chat',
}: {
  userId: string;
  productCode?: string;
}): Promise<ChatPlanView> {
  const subscription = await getCurrentSubscription(userId);
  const planName = coercePlanName(
    subscription?.planName || subscription?.productId
  );
  const period = getCurrentPeriod(subscription);
  const [usage, remainingCredits, planEntitlement] = await Promise.all([
    getBillingUsageForPeriod({
      userId,
      startDate: period.start,
      endDate: period.end,
    }),
    getRemainingCredits(userId),
    findPlanEntitlement(planName, productCode),
  ]);

  const features = planEntitlement
    ? parseFeatures(planEntitlement.features)
    : {};
  const policy = resolvePlanPolicy(planName, features);
  const billingPolicy = evaluatePlanAccess({
    requestedModel: 'auto',
    policy,
    usedTokens: usage.billableTokens,
    remainingCredits,
  }).billingPolicy;

  return {
    plan: policy.plan,
    allowedModels: policy.allowedModels,
    autoModelEnabled: policy.autoModelEnabled,
    quotaTokens: policy.quotaTokens,
    usedTokens: usage.billableTokens,
    remainingTokens: billingPolicy.remainingTokens,
    remainingCredits,
    overageEnabled: policy.overageEnabled,
    billingPolicy,
  };
}

function providerConfigToChannel(
  config: Awaited<ReturnType<typeof getProviderConfigs>>[number]
): ProviderChannel {
  return {
    channelId: config.channelId,
    provider: config.providerName,
    model:
      config.modelName ||
      DEFAULT_STATIC_MODEL_BY_PROVIDER[config.providerName] ||
      config.providerName,
    priority: config.priority ?? 100,
    weight: config.weight ?? 0,
    healthStatus:
      (config.healthStatus as ProviderHealthStatus | null) || 'healthy',
    cooldownUntil: config.cooldownUntil,
    fallbackGroup: config.fallbackGroup || 'chat',
    supportsStreaming: config.supportsStreaming ?? true,
    isDefaultAuto: config.isDefaultAuto ?? false,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    costPer1kInput: config.costPer1kInput,
    costPer1kOutput: config.costPer1kOutput,
  };
}

export function buildStaticChatChannels(
  planName: PlanName = 'pro'
): ProviderChannel[] {
  const baseOrder = STATIC_PROVIDER_CHAIN as unknown as string[];
  const order =
    planName === 'free'
      ? [
          'kimi',
          'zhipu',
          ...baseOrder.filter(
            (provider) => provider !== 'kimi' && provider !== 'zhipu'
          ),
        ]
      : baseOrder;
  return order.map((provider, index) => ({
    channelId: `static:${provider}`,
    provider,
    model: DEFAULT_STATIC_MODEL_BY_PROVIDER[provider] || provider,
    priority: index,
    weight: 0,
    healthStatus: 'healthy',
    fallbackGroup: 'static-chat',
    supportsStreaming: true,
    isDefaultAuto: index === 0,
  }));
}

export async function resolveChatModelSupply({
  userId,
  requestedModel,
  requestedProvider,
  productCode = 'chat',
}: {
  userId: string;
  requestedModel: string;
  requestedProvider?: string | null;
  productCode?: string;
}): Promise<ChatModelSupplyDecision | AccessEvaluation> {
  const model = requestedModel || 'auto';
  const provider = requestedProvider || inferChatProvider(model);

  if (model.startsWith('dify/')) {
    const access = await checkChatAccess({ userId, model });
    return access.allowed
      ? {
          requestedModel: model,
          requestedProvider: 'dify',
          selectedProvider: 'dify',
          selectedModel: model,
          selectedChannelId: model,
          fallbackChain: [
            {
              channelId: model,
              provider: 'dify',
              model,
            },
          ],
          providerUnavailable: false,
          plan: access.entitlement.plan,
          billingPolicy: {
            usageType:
              access.entitlement.remainingTokens > 0
                ? 'included'
                : access.entitlement.remainingCredits > 0
                  ? 'credits'
                  : 'on_demand',
            period: getBillingPeriodLabel(new Date()),
            quotaTokens: access.entitlement.quotaTokens,
            usedTokens: access.entitlement.usedTokens,
            remainingTokens: access.entitlement.remainingTokens,
            remainingCredits: access.entitlement.remainingCredits,
            overageEnabled: access.entitlement.overageEnabled,
            costMultiplier: 1,
            unitPricePer1k: access.entitlement.unitPricePer1k,
          },
          entitlement: {
            allowed: true,
            billingPolicy: {
              usageType:
                access.entitlement.remainingTokens > 0
                  ? 'included'
                  : access.entitlement.remainingCredits > 0
                    ? 'credits'
                    : 'on_demand',
              period: getBillingPeriodLabel(new Date()),
              quotaTokens: access.entitlement.quotaTokens,
              usedTokens: access.entitlement.usedTokens,
              remainingTokens: access.entitlement.remainingTokens,
              remainingCredits: access.entitlement.remainingCredits,
              overageEnabled: access.entitlement.overageEnabled,
              costMultiplier: 1,
              unitPricePer1k: access.entitlement.unitPricePer1k,
            },
          },
        }
      : {
          allowed: false,
          code: access.code,
          message: access.message,
          upgradeUrl: access.upgradeUrl,
          billingPolicy: {
            usageType: 'included',
            period: getBillingPeriodLabel(new Date()),
            quotaTokens: access.entitlement.quotaTokens,
            usedTokens: access.entitlement.usedTokens,
            remainingTokens: access.entitlement.remainingTokens,
            remainingCredits: access.entitlement.remainingCredits,
            overageEnabled: access.entitlement.overageEnabled,
            costMultiplier: 1,
            unitPricePer1k: access.entitlement.unitPricePer1k,
          },
        };
  }

  const subscription = await getCurrentSubscription(userId);
  const planName = coercePlanName(
    subscription?.planName || subscription?.productId
  );
  const period = getCurrentPeriod(subscription);
  const [usage, remainingCredits, planEntitlement, providerConfigs] =
    await Promise.all([
      getBillingUsageForPeriod({
        userId,
        startDate: period.start,
        endDate: period.end,
      }),
      getRemainingCredits(userId),
      findPlanEntitlement(planName, productCode),
      getProviderConfigs(planName, productCode),
    ]);
  const features = parseFeatures(planEntitlement?.features);
  const policy = resolvePlanPolicy(planName, features);
  const entitlement = evaluatePlanAccess({
    requestedModel: model,
    policy,
    usedTokens: usage.billableTokens,
    remainingCredits,
  });

  if (!entitlement.allowed) {
    return entitlement;
  }

  const dbChannels = providerConfigs.map(providerConfigToChannel);
  const channels =
    dbChannels.length > 0
      ? dbChannels
      : model === 'auto'
        ? buildStaticChatChannels(planName)
        : buildStaticProviderFailoverChain(provider, model).map(
            (attempt, index) => ({
              channelId: `static:${attempt.provider}:${attempt.model}`,
              provider: attempt.provider,
              model: attempt.model,
              priority: index,
              weight: 0,
              healthStatus: 'healthy' as ProviderHealthStatus,
              fallbackGroup: `static:${provider}`,
              supportsStreaming: true,
              isDefaultAuto: false,
            })
          );
  const executionPlan = buildProviderExecutionPlan({
    requestedModel: model,
    requestedProvider: provider,
    channels,
  });

  if (executionPlan.providerUnavailable) {
    return {
      allowed: false,
      code: 'PROVIDER_UNAVAILABLE',
      message: 'No healthy provider is available for this model.',
      billingPolicy: entitlement.billingPolicy,
    };
  }

  return {
    ...executionPlan,
    requestedModel: model,
    requestedProvider: provider,
    plan: planName,
    billingPolicy: entitlement.billingPolicy,
    entitlement,
  };
}

export function isModelSupplyDecision(
  value: ChatModelSupplyDecision | AccessEvaluation
): value is ChatModelSupplyDecision {
  return 'fallbackChain' in value && 'selectedProvider' in value;
}

export async function markProviderChannelSuccess(
  channelId?: string | null
): Promise<void> {
  if (
    !channelId ||
    channelId.startsWith('static:') ||
    channelId.startsWith('dify/')
  )
    return;
  await db()
    .update(providerConfig)
    .set({
      healthStatus: 'healthy',
      cooldownUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(providerConfig.id, channelId));
}

export async function markProviderChannelFailure(
  channelId?: string | null,
  cooldownMs = 5 * 60 * 1000
): Promise<void> {
  if (
    !channelId ||
    channelId.startsWith('static:') ||
    channelId.startsWith('dify/')
  )
    return;
  await db()
    .update(providerConfig)
    .set({
      healthStatus: 'degraded',
      cooldownUntil: new Date(Date.now() + cooldownMs),
      updatedAt: new Date(),
    })
    .where(
      and(eq(providerConfig.id, channelId), eq(providerConfig.isActive, true))
    );
}
