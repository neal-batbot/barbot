import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProviderExecutionPlan,
  evaluatePlanAccess,
  resolvePlanPolicy,
  type ProviderChannel,
} from '../src/shared/services/model-supply';

test('plan entitlement features override default quota and model rules', () => {
  const policy = resolvePlanPolicy('pro', {
    allowed_models: ['auto', 'claude-*'],
    monthly_token_quota: 4_000_000,
    overage_enabled: false,
    cost_multiplier: 1.4,
    auto_model_enabled: true,
  });

  assert.equal(policy.quotaTokens, 4_000_000);
  assert.equal(policy.overageEnabled, false);
  assert.equal(policy.costMultiplier, 1.4);
  assert.deepEqual(policy.allowedModels, ['auto', 'claude-*']);
  assert.equal(policy.autoModelEnabled, true);
});

test('access decision blocks premium models outside the active plan', () => {
  const policy = resolvePlanPolicy('free', {
    allowed_models: ['auto', 'kimi-*', 'glm-*'],
    monthly_token_quota: 100,
    overage_enabled: false,
  });

  const decision = evaluatePlanAccess({
    requestedModel: 'claude-sonnet-4-6',
    policy,
    usedTokens: 0,
    remainingCredits: 0,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.code, 'SUBSCRIPTION_REQUIRED');
});

test('access decision allows overage when plan enables on-demand usage', () => {
  const policy = resolvePlanPolicy('pro', {
    allowed_models: ['claude-*'],
    monthly_token_quota: 100,
    overage_enabled: true,
  });

  const decision = evaluatePlanAccess({
    requestedModel: 'claude-sonnet-4-6',
    policy,
    usedTokens: 150,
    remainingCredits: 0,
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.billingPolicy.usageType, 'on_demand');
});

test('provider execution plan skips channels in cooldown and keeps fallback order', () => {
  const now = new Date('2026-05-16T00:00:00Z');
  const channels: ProviderChannel[] = [
    {
      channelId: 'primary',
      provider: 'claude-proxy',
      model: 'claude-sonnet-4-6',
      priority: 0,
      healthStatus: 'degraded',
      cooldownUntil: new Date('2026-05-16T00:05:00Z'),
      fallbackGroup: 'coding',
    },
    {
      channelId: 'secondary',
      provider: 'kimi',
      model: 'kimi-k2.5',
      priority: 1,
      healthStatus: 'healthy',
      fallbackGroup: 'coding',
    },
    {
      channelId: 'third',
      provider: 'zhipu',
      model: 'glm-4-flash',
      priority: 2,
      healthStatus: 'healthy',
      fallbackGroup: 'coding',
    },
  ];

  const plan = buildProviderExecutionPlan({
    requestedModel: 'claude-sonnet-4-6',
    requestedProvider: 'claude-proxy',
    channels,
    now,
  });

  assert.equal(plan.selectedProvider, 'kimi');
  assert.equal(plan.selectedModel, 'kimi-k2.5');
  assert.deepEqual(
    plan.fallbackChain.map((item) => item.channelId),
    ['secondary', 'third']
  );
});

test('provider execution plan preserves explicitly requested model on primary channel', () => {
  const channels: ProviderChannel[] = [
    {
      channelId: 'claude-primary',
      provider: 'claude-proxy',
      model: 'claude-sonnet-4-5',
      priority: 0,
      healthStatus: 'healthy',
      fallbackGroup: 'coding',
    },
    {
      channelId: 'kimi-fallback',
      provider: 'kimi',
      model: 'kimi-k2.5',
      priority: 1,
      healthStatus: 'healthy',
      fallbackGroup: 'coding',
    },
  ];

  const plan = buildProviderExecutionPlan({
    requestedModel: 'claude-sonnet-4-5',
    requestedProvider: 'claude-proxy',
    channels,
  });

  assert.equal(plan.selectedModel, 'claude-sonnet-4-5');
  assert.equal(plan.selectedProvider, 'claude-proxy');
});
