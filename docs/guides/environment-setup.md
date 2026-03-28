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
