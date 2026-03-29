/**
 * E2E tests for IC-AI platform v1 API endpoints.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=sk-xxx npx tsx tests/platform-api.test.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY || "";

if (!API_KEY) {
  console.error("ERROR: API_KEY environment variable is required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

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

  await test("GET /api/v1/entitlement — valid product", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/entitlement?product=desktop_code`, { headers });
    assert(res.ok, `HTTP ${res.status}`);
    const json = await res.json();
    assert(json.code === 0, `expected code 0, got ${json.code}`);
    assert(typeof json.data?.allowed === "boolean", "data.allowed should be boolean");
  });

  await test("GET /api/v1/entitlement — invalid API key returns 401", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/entitlement?product=desktop_code`, {
      headers: { Authorization: "Bearer invalid-key-xxx" },
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  const deviceId = `test-device-${Date.now()}`;

  await test("POST /api/v1/device/register — new device", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/device/register`, {
      method: "POST", headers,
      body: JSON.stringify({ device_id: deviceId, platform: "test", product_code: "desktop_code" }),
    });
    assert(res.ok, `HTTP ${res.status}`);
  });

  await test("POST /api/v1/device/register — idempotent", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/device/register`, {
      method: "POST", headers,
      body: JSON.stringify({ device_id: deviceId, platform: "test", product_code: "desktop_code" }),
    });
    assert(res.ok, `HTTP ${res.status}`);
  });

  await test("POST /api/v1/device/heartbeat", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/device/heartbeat`, {
      method: "POST", headers,
      body: JSON.stringify({ device_id: deviceId, product_code: "desktop_code" }),
    });
    assert(res.ok, `HTTP ${res.status}`);
  });

  await test("POST /api/v1/usage/report — single", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/usage/report`, {
      method: "POST", headers,
      body: JSON.stringify({ product: "desktop_code", type: "chat", model: "test", tokens: 100 }),
    });
    assert(res.ok, `HTTP ${res.status}`);
    const json = await res.json();
    assert(json.code === 0, `code ${json.code}`);
  });

  await test("POST /api/v1/usage/report/batch", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/usage/report/batch`, {
      method: "POST", headers,
      body: JSON.stringify({
        records: [
          { product: "cli_agent", type: "chat", tokens: 50 },
          { product: "cli_agent", type: "chat", tokens: 80 },
        ],
      }),
    });
    assert(res.ok, `HTTP ${res.status}`);
    const json = await res.json();
    assert(json.code === 0, `code ${json.code}`);
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
