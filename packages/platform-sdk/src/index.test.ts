import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BarbotPlatformSDK } from './index';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function createFetch(body: unknown, init?: ResponseInit) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, requestInit) => {
    calls.push({ url: String(input), init: requestInit });
    return jsonResponse(body, init);
  };
  return { fetcher, calls };
}

test('checkEntitlement sends the platform API key and unwraps data', async () => {
  const { fetcher, calls } = createFetch({
    code: 0,
    data: {
      allowed: true,
      product: 'desktop_code',
      plan: 'Pro Plan',
      subscription_status: 'active',
      quota: { tokens: 1000, requests: null, remaining_credits: 50 },
      features: { device_limit: 3 },
    },
  });
  const sdk = new BarbotPlatformSDK({
    baseUrl: 'https://barbot.example/',
    apiKey: 'sk_test',
    fetcher,
  });

  const entitlement = await sdk.checkEntitlement('desktop_code');

  assert.equal(entitlement.allowed, true);
  assert.equal(calls[0]?.url, 'https://barbot.example/api/v1/entitlement?product=desktop_code');
  assert.equal((calls[0]?.init?.headers as Record<string, string>).Authorization, 'Bearer sk_test');
});

test('getBridgeToken can use a supplied bearer token instead of api key', async () => {
  const { fetcher, calls } = createFetch({
    token: 'bridge.jwt',
    audience: 'fumadocs-web',
    product: 'fumadocs',
    expiresAt: '2026-06-01T00:00:00.000Z',
    sourceAudience: null,
    user: { id: 'usr_1', email: 'user@example.com', name: 'User' },
  });
  const sdk = new BarbotPlatformSDK({ baseUrl: 'https://barbot.example', fetcher });

  const bridge = await sdk.getBridgeToken('fumadocs-web', 'existing.jwt');

  assert.equal(bridge.token, 'bridge.jwt');
  assert.equal((calls[0]?.init?.headers as Record<string, string>).Authorization, 'Bearer existing.jwt');
});

test('reportUsageBatch posts records under records key', async () => {
  const { fetcher, calls } = createFetch({ code: 0, data: { success: true, count: 1 } });
  const sdk = new BarbotPlatformSDK({
    baseUrl: 'https://barbot.example',
    apiKey: 'sk_test',
    fetcher,
  });

  await sdk.reportUsageBatch([
    {
      product: 'cli_agent',
      type: 'chat',
      model: 'claude-sonnet-4-5',
      tokens: 42,
      cost: 0.01,
    },
  ]);

  assert.equal(calls[0]?.init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    records: [
      {
        product: 'cli_agent',
        type: 'chat',
        model: 'claude-sonnet-4-5',
        tokens: 42,
        cost: 0.01,
      },
    ],
  });
});

test('platform API calls fail fast without an API key', async () => {
  const sdk = new BarbotPlatformSDK({
    baseUrl: 'https://barbot.example',
    fetcher: async () => jsonResponse({ code: 0 }),
  });

  await assert.rejects(() => sdk.checkEntitlement('desktop_code'), /API key is required/);
});

test('non-ok responses surface Barbot error messages', async () => {
  const sdk = new BarbotPlatformSDK({
    baseUrl: 'https://barbot.example',
    apiKey: 'sk_test',
    fetcher: async () =>
      jsonResponse({ code: -1, message: 'device_limit_exceeded' }, { status: 403 }),
  });

  await assert.rejects(
    () =>
      sdk.registerDevice({
        device_id: 'device-1',
        product_code: 'desktop_code',
      }),
    /device_limit_exceeded/
  );
});
