# Model Supply DB Change

`src/config/db/migrations` is ignored in this checkout, so local development should use:

```bash
pnpm db:generate
pnpm db:push
pnpm exec tsx scripts/seed-model-supply.ts
```

For production change tickets, apply the schema columns first, then run a reviewed seed equivalent.

```sql
ALTER TABLE provider_config
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS weight integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS cooldown_until timestamp,
  ADD COLUMN IF NOT EXISTS fallback_group text NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS cost_per_1k_input text,
  ADD COLUMN IF NOT EXISTS cost_per_1k_output text,
  ADD COLUMN IF NOT EXISTS supports_streaming boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_default_auto boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_provider_config_health
  ON provider_config (health_status, cooldown_until);

INSERT INTO product (code, name, description, is_active)
VALUES ('chat', 'Web Chat', 'Barbot Web Chat model supply', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
```

Seed `plan_entitlement.features` with `allowed_models`, `premium_model_pool`,
`auto_model_enabled`, `overage_enabled`, `monthly_token_quota`,
`cost_multiplier`, and `unit_price_per_1k`. Seed `provider_config` rows per
plan with explicit `priority`, `fallback_group`, `health_status`, and
`is_default_auto`.
