# Environment Setup

> Last updated: 2026-03-28

## Quick Start

```bash
cp .env.example .env          # Copy environment template
pnpm install                  # Install dependencies
pnpm db:generate              # Generate Drizzle schema
pnpm db:migrate               # Run database migrations
pnpm dev                      # Start dev server (Turbopack)
```

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `AUTH_SECRET` | Better Auth secret (32 bytes) | `openssl rand -base64 32` |
| `DIFY_API_URL` | Dify API base URL (fallback) | `https://api.dify.ai/v1` |
| `DIFY_BASE_URL` | Pi Agent BFF Dify base URL. Keep aligned with `DIFY_API_URL` | `https://api.dify.ai/v1` |
| `DIFY_API_KEY` | Dify global API key (fallback) | `app-xxx` |
| `BARBOT_USAGE_TOKEN` | Server-side token used by Pi BFF to report usage to Barbot | `sk_xxx` |
| `PI_AGENT_WEB_URL` | Server-side Pi Agent Web UI URL for platform routing | `https://pi.example.com` |
| `NEXT_PUBLIC_PI_WEB_UI_URL` | Public Pi Agent Web UI URL used by the browser | `https://pi.example.com` |
| `RATE_LIMIT_IP_MAX` | `/api/chat` IP 限流阈值（窗口内） | `60` |
| `RATE_LIMIT_USER_MAX` | `/api/chat` 用户限流阈值（窗口内） | `40` |
| `RATE_LIMIT_DAILY_USER_MAX` | `/api/chat` 用户日请求上限 | `800` |
| `RATE_LIMIT_STORE` | 限流存储后端（`memory`/`redis`） | `memory` |
| `RATE_LIMIT_FAILURE_MODE` | Redis 异常策略（`fail-open`/`fail-closed`） | `fail-open` |
| `REDIS_REST_URL` | Upstash Redis REST URL（启用 redis 限流时必填） | `https://...upstash.io` |
| `REDIS_REST_TOKEN` | Upstash Redis REST Token | `...` |
| `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS` | 允许的远程图片域名（逗号分隔） | `cdn.example.com` |
| `SENTRY_DSN` | Sentry DSN（用于异常上报） | `https://...` |
| `ALERT_ERROR_RATE_THRESHOLD` | 错误率告警阈值 | `0.05` |
| `ALERT_P95_LATENCY_MS` | P95 延迟告警阈值（毫秒） | `2000` |
| `COST_GUARD_DAILY_TOKENS_MAX` | 用户日 token 上限（0=关闭） | `200000` |
| `COST_GUARD_DAILY_COST_MAX` | 用户日成本上限（0=关闭） | `5` |
| `OPS_SIMULATE_TOKEN` | 触发 `/api/ops/simulate-error` 的内部校验 token | `...` |

> Bot-specific API keys are stored in the database `config` table, not in `.env`. See [../design-docs/DD-003-dify-streaming-architecture.md](../design-docs/DD-003-dify-streaming-architecture.md).

## Production Gate

Before deploying a production or sandbox release, run:

```bash
pnpm prod:env:check
pnpm prod:gate
```

`prod:env:check` verifies the minimum environment required for the Dify/Pi Agent billing loop:

- Barbot public URL and Pi Agent public URL are present and should be HTTPS in production.
- `DATABASE_URL` and `AUTH_SECRET` / `BETTER_AUTH_SECRET` are present.
- `DIFY_API_URL` / `DIFY_BASE_URL` and `DIFY_API_KEY` are present.
- `BARBOT_USAGE_TOKEN` is present so only the Pi BFF can report usage.
- At least one payment provider is enabled and has the required keys or webhook secret.

Payment settings can be configured either as environment variables or through the Admin settings table. Environment variables override DB-backed settings. For production, prefer Stripe/Creem/PayPal sandbox keys first, run the gate, then switch to live keys only after webhook callbacks and order/subscription updates are verified.

Relevant payment env names:

```bash
DEFAULT_PAYMENT_PROVIDER=stripe
STRIPE_ENABLED=true
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_SIGNING_SECRET=whsec_xxx
CREEM_ENABLED=false
PAYPAL_ENABLED=false
ALIPAY_ENABLED=false
```

## Database Setup

```bash
pnpm db:generate    # Generate migration files from schema changes
pnpm db:migrate     # Apply migrations (production-safe)
pnpm db:push        # Push schema directly (development only)
pnpm db:studio      # Open Drizzle Studio GUI
```

## RBAC Initialization

First-time setup only:

```bash
pnpm rbac:init              # Create default roles and permissions
pnpm rbac:assign            # Assign admin role to a user
```

## See Also

- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — full project structure
- [../design-docs/DD-002-auth-rbac-model.md](../design-docs/DD-002-auth-rbac-model.md) — auth architecture
- [../design-docs/DD-004-database-schema-decisions.md](../design-docs/DD-004-database-schema-decisions.md) — database patterns
