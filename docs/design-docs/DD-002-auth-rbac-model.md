---
id: DD-002
title: Auth & RBAC Model
status: VALIDATED
created: 2026-03-28
last-updated: 2026-03-28
---

## Core Belief

Better Auth handles identity. RBAC roles are seeded via `scripts/init-rbac.ts` and stored in the database. Auth config is loaded dynamically from the database `config` table — not from static environment variables — so it can be updated without redeployment.

## Context

The project serves multiple user types (admins, regular users, guests) with different feature access. Auth needs to be configurable per deployment without code changes.

## Decision

- **Identity provider**: Better Auth (`src/core/auth/index.ts`)
- **Config loading**: Dynamic — read from database `config` table on each auth operation
- **RBAC**: Custom roles in database, initialized with `pnpm rbac:init`
- **Role assignment**: Via `pnpm rbac:assign` script or admin UI
- **Session storage**: Better Auth managed (not custom JWT)

## Auth Config Loading Pattern

```typescript
// src/core/auth/index.ts
// Auth config is loaded from database, not from static env vars
const authConfig = await getConfig(); // reads from database config table
```

## RBAC Initialization

```bash
pnpm rbac:init     # Create default roles: admin, user, guest
pnpm rbac:assign   # Assign admin role to a specific user email
```

## Consequences

- Auth config changes require a database update, not a code deploy
- `pnpm auth:generate` must be run after changing auth config schema
- Role checks happen at the API route level, not middleware level

## Validation Status

VALIDATED — in production use.

## See Also

- [../../src/core/auth/index.ts](../../src/core/auth/index.ts) — auth configuration
- [../../src/core/rbac/](../../src/core/rbac/) — RBAC implementation
- [../../scripts/init-rbac.ts](../../scripts/init-rbac.ts) — role initialization script
