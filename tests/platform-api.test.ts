/**
 * E2E tests for IC-AI platform v1 API endpoints.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=sk-xxx npx tsx tests/platform-api.test.ts
 *   BASE_URL=http://localhost:3000 API_KEY=sk-xxx DESKTOP_TOKEN=dt_xxx npx tsx tests/platform-api.test.ts
 *   BASE_URL=http://localhost:3000 TEST_LOGOUT_TOKEN=dt_xxx npx tsx tests/platform-api.test.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY || "";
const DESKTOP_TOKEN = process.env.DESKTOP_TOKEN || "";
const TEST_LOGOUT_TOKEN = process.env.TEST_LOGOUT_TOKEN || "";

if (!API_KEY && !DESKTOP_TOKEN && !TEST_LOGOUT_TOKEN) {
  console.error("ERROR: API_KEY or DESKTOP_TOKEN environment variable is required");
  process.exit(1);
}

const authContexts = [
  API_KEY ? { name: "API key", token: API_KEY } : null,
  DESKTOP_TOKEN ? { name: "desktop token", token: DESKTOP_TOKEN } : null,
].filter(Boolean) as Array<{ name: string; token: string }>;

function headersFor(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  FAIL  ${name}: ${e.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function run() {
  console.log(`\nPlatform API E2E Tests (${BASE_URL})\n`);

  for (const auth of authContexts) {
    const headers = headersFor(auth.token);

    await test(`GET /api/v1/entitlement — valid product (${auth.name})`, async () => {
      const res = await fetch(`${BASE_URL}/api/v1/entitlement?product=desktop_code`, { headers });
      assert(res.ok, `HTTP ${res.status}`);
      const json = await res.json();
      assert(json.code === 0, `expected code 0, got ${json.code}`);
      assert(typeof json.data?.allowed === "boolean", "data.allowed should be boolean");
      assert(typeof json.data?.plan === "string", "data.plan should be string");
      assert(typeof json.data?.quota?.tokens === "number", "quota.tokens should be number");
      assert(typeof json.data?.quota?.used_tokens === "number", "quota.used_tokens should be number");
      assert(typeof json.data?.quota?.remaining_tokens === "number", "quota.remaining_tokens should be number");
      assert(typeof json.data?.quota?.remaining_credits === "number", "quota.remaining_credits should be number");
      assert(typeof json.data?.period_start === "string", "period_start should be string");
      assert(typeof json.data?.period_end === "string", "period_end should be string");
      assert(typeof json.data?.features === "object", "features should be object");
    });

    await test(`GET /api/v1/provider-config — entitlement-gated relay config (${auth.name})`, async () => {
      const res = await fetch(`${BASE_URL}/api/v1/provider-config?product=desktop_code`, { headers });
      assert(res.ok, `HTTP ${res.status}`);
      const json = await res.json();
      assert(json.code === 0, `expected code 0, got ${json.code}`);
      assert(typeof json.data?.available === "boolean", "data.available should be boolean");
      if (json.data?.available) {
        assert(json.data.allowed === true, "available provider config should be allowed");
        assert(json.data.primary?.provider, "primary.provider should exist");
        assert(json.data.primary?.baseUrl, "primary.baseUrl should exist");
        assert(json.data.primary?.apiKey, "primary.apiKey should exist in API response");
        assert(json.data.primary?.modelName !== undefined, "primary.modelName should be present");
        assert(Array.isArray(json.data.fallbacks), "fallbacks should be array");
        assert(Array.isArray(json.data.models), "models should be array");
      } else {
        assert(json.data.allowed === false || json.data.message, "unavailable config should explain why");
      }
    });

    const deviceId = `test-device-${auth.name.replace(/\s+/g, "-")}-${Date.now()}`;

    await test(`POST /api/v1/device/register — new device (${auth.name})`, async () => {
      const res = await fetch(`${BASE_URL}/api/v1/device/register`, {
        method: "POST", headers,
        body: JSON.stringify({ device_id: deviceId, platform: "test", product_code: "desktop_code" }),
      });
      assert(res.ok, `HTTP ${res.status}`);
    });

    await test(`POST /api/v1/device/register — idempotent (${auth.name})`, async () => {
      const res = await fetch(`${BASE_URL}/api/v1/device/register`, {
        method: "POST", headers,
        body: JSON.stringify({ device_id: deviceId, platform: "test", product_code: "desktop_code" }),
      });
      assert(res.ok, `HTTP ${res.status}`);
    });

    await test(`POST /api/v1/device/heartbeat (${auth.name})`, async () => {
      const res = await fetch(`${BASE_URL}/api/v1/device/heartbeat`, {
        method: "POST", headers,
        body: JSON.stringify({ device_id: deviceId, product_code: "desktop_code" }),
      });
      assert(res.ok, `HTTP ${res.status}`);
    });

    const requestId = `platform-test:${auth.name}:${Date.now()}`;
    await test(`POST /api/v1/usage/report — single and idempotent (${auth.name})`, async () => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${BASE_URL}/api/v1/usage/report`, {
          method: "POST", headers,
          body: JSON.stringify({
            product: "desktop_code",
            type: "chat",
            model: "gpt-5.3-codex",
            tokens: 1100,
            input_tokens: 1000,
            output_tokens: 100,
            request_id: requestId,
          }),
        });
        assert(res.ok, `HTTP ${res.status}`);
        const json = await res.json();
        assert(json.code === 0, `code ${json.code}`);
        assert(Number(json.data?.cost) > 0, "cost should be calculated server-side");
      }
    });

    await test(`POST /api/v1/usage/report/batch (${auth.name})`, async () => {
      const res = await fetch(`${BASE_URL}/api/v1/usage/report/batch`, {
        method: "POST", headers,
        body: JSON.stringify({
          records: [
            {
              product: "desktop_code",
              type: "chat",
              model: "gpt-5.2",
              tokens: 50,
              input_tokens: 40,
              output_tokens: 10,
              request_id: `${requestId}:batch:1`,
            },
            {
              product: "desktop_code",
              type: "chat",
              model: "gpt-5.5",
              tokens: 80,
              input_tokens: 60,
              output_tokens: 20,
              request_id: `${requestId}:batch:2`,
            },
          ],
        }),
      });
      assert(res.ok, `HTTP ${res.status}`);
      const json = await res.json();
      assert(json.code === 0, `code ${json.code}`);
    });
  }

  await test("GET /api/v1/entitlement — invalid API key returns 401", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/entitlement?product=desktop_code`, {
      headers: headersFor("invalid-key-xxx"),
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  if (TEST_LOGOUT_TOKEN) {
    await test("POST /api/auth/desktop/logout — revokes desktop token", async () => {
      const logout = await fetch(`${BASE_URL}/api/auth/desktop/logout`, {
        method: "POST",
        headers: headersFor(TEST_LOGOUT_TOKEN),
      });
      assert(logout.ok, `logout HTTP ${logout.status}`);

      const verify = await fetch(`${BASE_URL}/api/auth/verify`, {
        headers: headersFor(TEST_LOGOUT_TOKEN),
      });
      assert(verify.status === 401, `expected revoked token verify 401, got ${verify.status}`);
    });
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
