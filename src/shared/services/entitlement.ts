import { getCurrentSubscription } from '@/shared/models/subscription';
import { getBillingUsageForPeriod } from '@/shared/models/billing-event';
import { getRemainingCredits } from '@/shared/models/credit';

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
  code?: 'SUBSCRIPTION_REQUIRED' | 'QUOTA_EXCEEDED' | 'MODEL_NOT_ALLOWED';
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
    allowedModels: ['dify/*', 'glm-5', 'gpt-4.1-mini', 'qwen/qwen-2.5-72b-instruct'],
  },
  pro: {
    name: 'pro',
    quotaTokens: 2_000_000,
    overageEnabled: true,
    unitPricePer1k: 0.0035,
    allowedModels: [
      'dify/*',
      'glm-5',
      'gpt-4.1-mini',
      'gpt-4o',
      'claude-3-5-sonnet-latest',
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

export async function checkChatAccess({
  userId,
  model,
}: {
  userId: string;
  model: string;
}): Promise<AccessDecision> {
  const entitlement = await resolveEntitlement(userId);

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
