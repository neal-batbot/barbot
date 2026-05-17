import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAllowedModelMenu,
  parseUsageSupplyMetadata,
} from '../src/shared/services/model-supply-ui';

test('model menu puts Auto first and hides models outside the active plan', () => {
  const menu = buildAllowedModelMenu({
    staticModels: [
      {
        title: 'Kimi K2.5',
        name: 'kimi-k2.5',
        provider: 'kimi',
        tier: 'free',
      },
      {
        title: 'Claude Sonnet',
        name: 'claude-sonnet-4-6',
        provider: 'claude-proxy',
        tier: 'pro',
      },
    ],
    difyBots: [],
    plan: {
      plan: 'free',
      allowedModels: ['auto', 'kimi-*'],
      autoModelEnabled: true,
    },
  });

  assert.deepEqual(
    menu.map((item) => item.id),
    ['auto', 'kimi-k2.5']
  );
});

test('usage metadata exposes requested and actual model supply fields', () => {
  const metadata = parseUsageSupplyMetadata(
    JSON.stringify({
      requestedModel: 'claude-sonnet-4-6',
      actualModel: 'kimi-k2.5',
      actualProvider: 'kimi',
      fallbackReason: 'fallback:claude-proxy',
      usageType: 'on_demand',
    })
  );

  assert.equal(metadata.requestedModel, 'claude-sonnet-4-6');
  assert.equal(metadata.actualModel, 'kimi-k2.5');
  assert.equal(metadata.actualProvider, 'kimi');
  assert.equal(metadata.fallbackReason, 'fallback:claude-proxy');
  assert.equal(metadata.usageType, 'on_demand');
});
