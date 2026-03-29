/**
 * Seed platform products and default plan entitlements
 * Usage: npx tsx scripts/seed-products.ts
 */

import { db } from '@/core/db';
import { product, planEntitlement } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const PRODUCTS = [
  { code: 'web_chat', name: 'Web Chat', description: 'Platform built-in web chat product' },
  { code: 'desktop_code', name: 'Harvey Desktop', description: 'Electron desktop coding assistant' },
  { code: 'editor_agent', name: 'Vector-cline', description: 'VS Code AI coding extension' },
  { code: 'cli_agent', name: 'Pi CLI Agent', description: 'Terminal coding agent (pi-mono)' },
  { code: 'slack_bot', name: 'Pi Slack Bot', description: 'Slack coding bot (pi-mono mom)' },
];

// plan_name → product_code → entitlement config
const ENTITLEMENTS: Array<{
  planName: string;
  productCode: string;
  isEnabled: boolean;
  quotaTokens: number | null;
  quotaRequests: number | null;
  features: object;
}> = [
  // ── free plan ──────────────────────────────────────────────────────────────
  { planName: 'free', productCode: 'web_chat', isEnabled: true, quotaTokens: 50000, quotaRequests: 100, features: { device_limit: 1 } },
  { planName: 'free', productCode: 'desktop_code', isEnabled: false, quotaTokens: null, quotaRequests: null, features: { device_limit: 0 } },
  { planName: 'free', productCode: 'editor_agent', isEnabled: false, quotaTokens: null, quotaRequests: null, features: { device_limit: 0 } },
  { planName: 'free', productCode: 'cli_agent', isEnabled: false, quotaTokens: null, quotaRequests: null, features: { device_limit: 0 } },
  { planName: 'free', productCode: 'slack_bot', isEnabled: false, quotaTokens: null, quotaRequests: null, features: { device_limit: 0 } },

  // ── Pro Plan ───────────────────────────────────────────────────────────────
  { planName: 'Pro Plan', productCode: 'web_chat', isEnabled: true, quotaTokens: null, quotaRequests: null, features: { device_limit: 1 } },
  { planName: 'Pro Plan', productCode: 'desktop_code', isEnabled: true, quotaTokens: 2000000, quotaRequests: null, features: { device_limit: 3, advanced_model: true } },
  { planName: 'Pro Plan', productCode: 'editor_agent', isEnabled: true, quotaTokens: 2000000, quotaRequests: null, features: { device_limit: 3, advanced_model: true } },
  { planName: 'Pro Plan', productCode: 'cli_agent', isEnabled: true, quotaTokens: 1000000, quotaRequests: null, features: { device_limit: 2 } },
  { planName: 'Pro Plan', productCode: 'slack_bot', isEnabled: true, quotaTokens: 500000, quotaRequests: null, features: { device_limit: 1 } },
];

async function main() {
  console.log('🌱 Seeding products and plan entitlements...\n');

  // Upsert products
  for (const p of PRODUCTS) {
    const [existing] = await db().select().from(product).where(eq(product.code, p.code));
    if (existing) {
      console.log(`  ✓ Product exists: ${p.code}`);
    } else {
      await db().insert(product).values({ ...p, isActive: true });
      console.log(`  + Created product: ${p.code}`);
    }
  }

  console.log('');

  // Upsert entitlements
  for (const e of ENTITLEMENTS) {
    await db()
      .insert(planEntitlement)
      .values({
        planName: e.planName,
        productCode: e.productCode,
        isEnabled: e.isEnabled,
        quotaTokens: e.quotaTokens,
        quotaRequests: e.quotaRequests,
        features: JSON.stringify(e.features),
      })
      .onConflictDoUpdate({
        target: [planEntitlement.planName, planEntitlement.productCode],
        set: {
          isEnabled: e.isEnabled,
          quotaTokens: e.quotaTokens,
          quotaRequests: e.quotaRequests,
          features: JSON.stringify(e.features),
          updatedAt: new Date(),
        },
      });
    const status = e.isEnabled ? '✓' : '✗';
    console.log(`  ${status} ${e.planName} → ${e.productCode}`);
  }

  console.log('\n✅ Done!');
  console.log('   View at: http://localhost:3000/en/admin/products');
  console.log('   View at: http://localhost:3000/en/admin/plan-entitlements');
}

main().catch((e) => {
  console.error('\n❌ Error:', e);
  process.exit(1);
});
