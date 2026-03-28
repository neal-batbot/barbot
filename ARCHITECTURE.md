# Architecture

> Stable architectural reference. Changes infrequently. Last updated: 2026-03-28.

## System Overview

IC-AI is a Next.js 16 SaaS boilerplate for AI-powered customer support. Dify is the primary AI runtime; OpenRouter / Replicate / FAL / Gemini are secondary providers accessible via the AI SDK.

### Dify Chat Data Flow

```
User Input (DifyFollowUp component)
    ↓
POST /api/dify/chat (API route)
    ↓
Dify API (streaming)
    ↓
SSE Stream → useDifyChat hook (src/shared/hooks/use-dify-chat.ts)
    ↓
requestAnimationFrame-batched React state updates
    ↓
UI renders (DifyMessages component)
```

---

## Directory Map

```
src/
├── app/[locale]/           # Internationalized Next.js App Router
│   ├── (admin)/            # Admin dashboard routes
│   ├── (auth)/             # Authentication pages
│   ├── (chat)/             # Chat interface routes
│   ├── (docs)/             # Documentation pages
│   └── (landing)/          # Landing pages & feature routes
│       └── api/            # Locale-scoped API routes
├── api/                    # Non-locale API routes
│   ├── auth/               # Better Auth endpoints
│   ├── chat/               # Chat API
│   ├── dify/               # Dify integration
│   └── payment/            # Payment webhooks
├── config/
│   ├── db/                 # Drizzle schema (schema.postgres.ts)
│   ├── locale/messages/    # i18n translations (en/ zh/)
│   └── style/              # CSS variables & theme tokens
├── core/
│   ├── auth/               # Better Auth config (src/core/auth/index.ts)
│   ├── db/                 # DB singleton (src/core/db/index.ts)
│   ├── i18n/               # Locale detection
│   └── rbac/               # Role-based access control
├── extensions/             # Third-party provider integrations
│   ├── ai/                 # Dify, Gemini, Replicate, FAL, KIE
│   ├── analytics/          # GA, Clarity, Plausible…
│   ├── payment/            # Stripe, PayPal, Creem
│   └── storage/            # S3, R2
├── shared/
│   ├── blocks/             # Reusable UI blocks (chat/, common/, console/)
│   ├── components/         # Generic React components
│   ├── contexts/           # React Contexts (app, chat)
│   ├── hooks/              # Custom hooks (use-dify-chat.ts is primary)
│   ├── models/             # Drizzle table schemas (11 models)
│   ├── services/           # External service wrappers (9 services)
│   └── types/              # Shared TypeScript types
└── themes/default/         # Default theme (blocks, layouts, pages)
```

---

## Key Architectural Patterns

**1. Modular Feature Organization** — Features live under `src/app/[locale]/(landing)/` as route groups. Shared UI blocks go in `src/shared/blocks/`.

**2. Configuration-Driven Design** — Dynamic config loaded from the `config` database table via `src/config/app.config.ts`. Environment variables are fallbacks only.

**3. Dify-First AI Integration** — Dify SSE streaming is hand-rolled (bypasses AI SDK) for performance. Secondary providers use the AI SDK. See [docs/design-docs/DD-003-dify-streaming-architecture.md](docs/design-docs/DD-003-dify-streaming-architecture.md).

**4. Database Layer** — Drizzle ORM only (no raw SQL). Singleton connection in `src/core/db/index.ts`. Migration-based for production (`pnpm db:migrate`), `db:push` for development. Full schema: [docs/generated/db-schema.md](docs/generated/db-schema.md).

**5. Internationalization** — next-intl. Locales: `en` / `zh`. Messages in `src/config/locale/messages/{locale}/{feature}.json`. All user-facing text must use `t()` hook.

**6. Authentication & RBAC** — Better Auth with dynamic config loaded from database. RBAC roles seeded via `pnpm rbac:init`. See [docs/design-docs/DD-002-auth-rbac-model.md](docs/design-docs/DD-002-auth-rbac-model.md).

---

## Data Models

Full schema: [docs/generated/db-schema.md](docs/generated/db-schema.md)

| Model | File | Purpose |
|-------|------|---------|
| user | shared/models/user.ts | User accounts |
| chat | shared/models/chat.ts | Chat sessions |
| chat_message | shared/models/chat_message.ts | Individual messages |
| config | shared/models/config.ts | App configuration (Dify keys, bots) |
| ai_task | shared/models/ai_task.ts | AI generation tasks |
| apikey | shared/models/apikey.ts | API key management |
| subscription | shared/models/subscription.ts | Billing subscriptions |
| order | shared/models/order.ts | Payment orders |
| credit | shared/models/credit.ts | Usage credits |
| taxonomy | shared/models/taxonomy.ts | Content taxonomy |
| post | shared/models/post.tsx | Blog/content posts |

---

## Deployment Targets

| Target | Command | Guide |
|--------|---------|-------|
| Vercel (recommended) | Auto-deploy on push to main | [docs/guides/vercel-deployment.md](docs/guides/vercel-deployment.md) |
| Cloudflare Workers | `pnpm cf:deploy` | — |
| Docker | `docker compose up` | [docs/guides/docker-setup.md](docs/guides/docker-setup.md) |
