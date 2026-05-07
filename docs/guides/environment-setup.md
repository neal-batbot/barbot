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
| `DIFY_API_KEY` | Dify global API key (fallback) | `app-xxx` |
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
