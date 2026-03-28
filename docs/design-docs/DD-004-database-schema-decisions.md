---
id: DD-004
title: Database Schema Decisions
status: VALIDATED
created: 2026-03-28
last-updated: 2026-03-28
---

## Core Belief

Schema is defined in `src/config/db/schema.postgres.ts` as the single source of truth, exported through `schema.ts`. Drizzle is the only ORM; raw SQL is not used. Migrations are file-based for production, `db:push` for development only.

## Context

The project needs a type-safe database layer that supports both traditional servers and Cloudflare Workers. Schema changes must be tracked and reproducible.

## Decision

- **ORM**: Drizzle ORM only — no raw SQL, no other ORMs
- **Schema location**: `src/config/db/schema.postgres.ts` (single file)
- **Connection**: Singleton pattern in `src/core/db/index.ts`
- **Development**: `pnpm db:push` (direct schema update, no migration files)
- **Production**: `pnpm db:generate && pnpm db:migrate` (migration-based)
- **Inspection**: `pnpm db:studio` (Drizzle Studio GUI)

## Migration Workflow

```bash
# After modifying src/config/db/schema.postgres.ts:
pnpm db:generate    # Create migration file in migrations/
pnpm db:migrate     # Apply to database

# Also update generated docs:
pnpm docs:gen-schema
```

## Schema Organization

11 core models in `src/shared/models/`:

| Model | Key relationships |
|-------|------------------|
| user | Has many chats, apikeys, subscriptions, orders, credits |
| chat | Belongs to user, has many chat_messages |
| chat_message | Belongs to chat |
| config | Singleton app config (Dify keys, bots JSON) |
| ai_task | Belongs to user, tracks async AI generations |
| apikey | Belongs to user |
| subscription | Belongs to user |
| order | Belongs to user |
| credit | Belongs to user |
| taxonomy | Independent (content categories) |
| post | Independent (blog/content) |

## Consequences

- All schema changes must go through Drizzle — never alter tables manually
- The `config` table holds JSON blobs (e.g., `dify_bots`) — keep these validated by scripts
- Cloudflare Workers compatibility requires no Node.js-specific DB drivers

## Validation Status

VALIDATED — in production use.

## See Also

- [../../src/config/db/schema.postgres.ts](../../src/config/db/schema.postgres.ts) — schema source of truth
- [../../src/core/db/index.ts](../../src/core/db/index.ts) — DB singleton
- [../generated/db-schema.md](../generated/db-schema.md) — auto-generated schema reference
