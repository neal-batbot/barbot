import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calculateUsageCost,
  resolveModelTokenPricing,
} from '../src/shared/services/model-pricing';

test('resolves official GPT-5.3-Codex pricing', () => {
  const pricing = resolveModelTokenPricing('gpt-5.3-codex');
  assert.equal(pricing?.inputPerMillion, 1.75);
  assert.equal(pricing?.cachedInputPerMillion, 0.175);
  assert.equal(pricing?.outputPerMillion, 14);
});

test('calculates cost from input and output token split', () => {
  const cost = calculateUsageCost({
    model: 'gpt-5.2',
    tokens: 1100,
    inputTokens: 1000,
    outputTokens: 100,
  });

  assert.equal(cost.amount, '0.00315000');
  assert.equal(cost.billableTokens, 1100);
  assert.equal(cost.pricing?.model, 'gpt-5.2');
});

test('uses cached input rate when supplied', () => {
  const cost = calculateUsageCost({
    model: 'gpt-5.5',
    tokens: 1500,
    inputTokens: 1000,
    cachedInputTokens: 500,
    outputTokens: 500,
  });

  assert.equal(cost.amount, '0.01775000');
  assert.equal(cost.pricing?.model, 'gpt-5.5');
});
