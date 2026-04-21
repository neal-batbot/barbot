import { getCurrentSubscription } from '@/shared/models/subscription';
import { getBillingUsageForPeriod } from '@/shared/models/billing-event';
import { getRemainingCredits } from '@/shared/models/credit';
import { getAllConfigs } from '@/shared/models/config';
import { findEnterpriseBotAccess } from '@/shared/models/enterprise';
import { hasAnyPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac/permission';

export type PlanName = 'free' | 'pro' | 'team';

export interface PlanRule {
  name: PlanName;
  quotaTokens: number;
  overageEnabled: boolean;
  unitPricePer1k: number;
  allowedModels: string[];
}

export interface EntitlementResult {
  plan: PlanName;
  quotaTokens: number;
  usedTokens: number;
  remainingTokens: number;
  remainingCredits: number;
  overageTokens: number;
  overageEnabled: boolean;
  unitPricePer1k: number;
  overageAmount: number;
  allowedModels: string[];
  periodStart: Date;
  periodEnd: Date;
}

export interface AccessDecision {
  allowed: boolean;
  code?: 'SUBSCRIPTION_REQUIRED' | 'QUOTA_EXCEEDED' | 'MODEL_NOT_ALLOWED' | 'BOT_ACCESS_DENIED' | 'TRIAL_QUOTA_EXCEEDED';
  message?: string;
  upgradeUrl?: string;
  entitlement: EntitlementResult;
}

const PLAN_RULES: Record<PlanName, PlanRule> = {
  free: {
    name: 'free',
    quotaTokens: 100_000,
    overageEnabled: false,
    unitPricePer1k: 0,
    // dify/* is intentionally excluded — bot access is handled separately via RBAC/trial/enterprise
    allowedModels: ['kimi-*', 'glm-*'],
  },
  pro: {
    name: 'pro',
    quotaTokens: 2_000_000,
    overageEnabled: true,
    unitPricePer1k: 0.0035,
    allowedModels: [
      'kimi-*',
      'glm-*',
      'claude-*',
      'gpt-*',
      'openai/*',
      'google/gemini-2.0-flash-001',
      'deepseek/deepseek-chat',
      'qwen/qwen-2.5-72b-instruct',
    ],
  },
  team: {
    name: 'team',
    quotaTokens: 10_000_000,
    overageEnabled: true,
    unitPricePer1k: 0.0025,
    allowedModels: ['*'],
  },
};

const DEFAULT_UPGRADE_URL = '/pricing';

function resolvePlanName(input?: string | null): PlanName {
  const value = (input || '').toLowerCase();
  if (value.includes('team')) return 'team';
  if (value.includes('pro') || value.includes('premium')) return 'pro';
  return 'free';
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

function getCurrentPeriod(subscription: any): { start: Date; end: Date } {
  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    return {
      start: new Date(subscription.currentPeriodStart),
      end: new Date(subscription.currentPeriodEnd),
    };
  }

  const start = startOfCurrentMonth();
  const end = new Date();
  return { start, end };
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

function isPaidOnlyModel(model: string): boolean {
  return !isModelAllowed(model, PLAN_RULES.free.allowedModels);
}

export async function resolveEntitlement(userId: string): Promise<EntitlementResult> {
  const subscription = await getCurrentSubscription(userId);
  const plan = resolvePlanName(subscription?.planName || subscription?.productId);
  const rule = PLAN_RULES[plan];
  const period = getCurrentPeriod(subscription);

  const [usage, remainingCredits] = await Promise.all([
    getBillingUsageForPeriod({
      userId,
      startDate: period.start,
      endDate: period.end,
    }),
    getRemainingCredits(userId),
  ]);

  const usedTokens = usage.billableTokens;
  const remainingTokens = Math.max(rule.quotaTokens - usedTokens, 0);
  const overageTokens = Math.max(usedTokens - rule.quotaTokens, 0);
  const overageAmount = (overageTokens / 1000) * rule.unitPricePer1k;

  return {
    plan,
    quotaTokens: rule.quotaTokens,
    usedTokens,
    remainingTokens,
    remainingCredits,
    overageTokens,
    overageEnabled: rule.overageEnabled,
    unitPricePer1k: rule.unitPricePer1k,
    overageAmount,
    allowedModels: rule.allowedModels,
    periodStart: period.start,
    periodEnd: period.end,
  };
}

/**
 * Check access for dify/* models via three paths:
 * 1. Enterprise member with that bot in their account's botIds
 * 2. RBAC: chat.bot.access (all bots) or chat.bot.<botId> (specific bot)
 * 3. Trial: bot is in dify_trial_bots and global trial quota not exhausted
 */
async function checkBotAccess(
  userId: string,
  model: string,
  entitlement: EntitlementResult
): Promise<AccessDecision> {
  // team plan gets all bots via allowedModels: ['*']
  if (entitlement.plan === 'team') {
    return { allowed: true, entitlement };
  }

  const botId = model.replace('dify/', '');

  // 1. Enterprise member check
  const enterpriseAccount = await findEnterpriseBotAccess(userId, botId);
  if (enterpriseAccount) {
    return { allowed: true, entitlement };
  }

  // 2. RBAC check
  const hasBotPermission = await hasAnyPermission(userId, [
    PERMISSIONS.CHAT_BOT_ACCESS,
    PERMISSIONS.CHAT_BOT_PREFIX + botId,
  ]);
  if (hasBotPermission) {
    return { allowed: true, entitlement };
  }

  // 3. Trial check
  const configs = await getAllConfigs();
  let trialBotIds: string[] = [];
  try {
    trialBotIds = JSON.parse(configs.dify_trial_bots || '[]');
  } catch {
    // ignore
  }

  if (trialBotIds.includes(botId)) {
    const trialQuota = parseInt(configs.dify_trial_quota_tokens || '50000', 10);
    // Count trial usage from usageLog (via billing events with product=chat and model starting with dify/)
    // For simplicity, we track via a config key that gets incremented server-side in the chat route.
    // Here we check if quota is exceeded.
    const trialUsed = parseInt(configs.dify_trial_used_tokens || '0', 10);
    if (trialUsed < trialQuota) {
      return { allowed: true, entitlement };
    }
    return {
      allowed: false,
      code: 'TRIAL_QUOTA_EXCEEDED',
      message: 'Trial quota for this bot has been exhausted. Contact us for enterprise access.',
      upgradeUrl: '/contact',
      entitlement,
    };
  }

  return {
    allowed: false,
    code: 'BOT_ACCESS_DENIED',
    message: 'This assistant requires enterprise access. Contact us to get set up.',
    upgradeUrl: '/contact',
    entitlement,
  };
}

export async function checkChatAccess({
  userId,
  model,
}: {
  userId: string;
  model: string;
}): Promise<AccessDecision> {
  const entitlement = await resolveEntitlement(userId);

  // Dify bots are handled separately from the plan model allowlist
  if (model.startsWith('dify/')) {
    return checkBotAccess(userId, model, entitlement);
  }

  if (!isModelAllowed(model, entitlement.allowedModels)) {
    if (isPaidOnlyModel(model) && entitlement.plan === 'free') {
      return {
        allowed: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'This model requires a paid subscription.',
        upgradeUrl: DEFAULT_UPGRADE_URL,
        entitlement,
      };
    }

    return {
      allowed: false,
      code: 'MODEL_NOT_ALLOWED',
      message: 'Model is not allowed by your current plan.',
      upgradeUrl: DEFAULT_UPGRADE_URL,
      entitlement,
    };
  }

  // Allow requests when users still have positive credit balance,
  // even if monthly token quota is exhausted.
  if (
    entitlement.remainingTokens <= 0 &&
    !entitlement.overageEnabled &&
    entitlement.remainingCredits <= 0
  ) {
    return {
      allowed: false,
      code: 'QUOTA_EXCEEDED',
      message: 'Your monthly token quota has been exceeded.',
      upgradeUrl: DEFAULT_UPGRADE_URL,
      entitlement,
    };
  }

  return {
    allowed: true,
    entitlement,
  };
}

export function getBillingPeriodLabel(input: Date): string {
  const year = input.getUTCFullYear();
  const month = `${input.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

