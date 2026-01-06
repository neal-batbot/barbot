# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShipAny Template Two is a Next.js 16 SaaS boilerplate for building AI-powered applications. It features a modular architecture with multi-provider AI integration (Dify, OpenRouter, Replicate), authentication via Better Auth, database management with Drizzle ORM, and full internationalization support.

**Tech Stack:**
- Next.js 16.0.7 with App Router and Turbopack
- React 19.2.1 with TypeScript 5
- Tailwind CSS v4 with Radix UI components
- Drizzle ORM with PostgreSQL
- Better Auth for authentication
- next-intl for i18n (English/Chinese)

**Package Manager:** pnpm 10.24.0

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build
pnpm build:fast       # Build with increased memory (4GB)
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting

# Database Operations
pnpm db:generate      # Generate Drizzle schema from migrations
pnpm db:migrate       # Run database migrations
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio (database GUI)

# Authentication
pnpm auth:generate    # Generate Better Auth configuration

# RBAC (Role-Based Access Control)
pnpm rbac:init        # Initialize RBAC system
pnpm rbac:assign      # Assign roles to users

# Cloudflare Deployment
pnpm cf:preview       # Preview on Cloudflare
pnpm cf:deploy        # Deploy to Cloudflare
pnpm cf:upload        # Upload to Cloudflare
pnpm cf:typegen       # Generate Cloudflare types
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set required environment variables:
   - `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:password@host:port/db`)
   - `AUTH_SECRET` - Generate with: `openssl rand -base64 32` (or use [Better Auth docs](https://www.better-auth.com/docs/installation))
3. Run `pnpm install` to install dependencies
4. Run `pnpm db:generate && pnpm db:migrate` to set up database
5. Run `pnpm dev` to start development server

## Architecture

### Directory Structure

```
src/
├── app/[locale]/           # Internationalized routes
│   ├── (landing)/          # Landing page and feature routes
│   │   ├── (ai)/          # AI-powered features
│   │   │   ├── ai-image-generator/
│   │   │   ├── ai-music-generator/
│   │   │   └── ai-video-generator/
│   │   ├── settings/       # User settings pages
│   │   └── api/           # API routes
│   │       └── dify/      # Dify AI integration
├── core/                   # Core business logic
│   ├── auth/              # Better Auth configuration
│   ├── db/                # Database singleton connection
│   ├── i18n/              # Locale detection
│   └── theme/             # Theme configuration
├── config/                # Configuration files
│   ├── locale/            # Translation files (en/zh)
│   │   └── messages/      # Feature-specific translations
│   └── style/             # CSS variables & theme system
├── shared/                # Shared modules
│   ├── blocks/            # Reusable UI blocks
│   │   ├── chat/         # Chat-related components
│   │   └── common/       # Common UI blocks
│   ├── components/        # Generic React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── models/            # Database schemas & models
│   ├── services/          # External service integrations
│   └── types/             # TypeScript type definitions
└── themes/                # Theme-specific components
```

### Key Architectural Patterns

**1. Modular Feature Organization**
- Features are organized under `src/app/[locale]/(landing)/` as route groups
- Each major feature (AI generators, settings, etc.) has its own directory
- Shared UI blocks live in `src/shared/blocks/` for reusability

**2. Configuration-Driven Design**
- Dynamic configuration loaded from database via `src/config/app.config.ts`
- Environment variables for sensitive data
- Feature flags supported through config system

**3. Multi-Provider AI Integration**
- Primary provider: Dify (custom SSE streaming implementation at `src/app/api/dify/chat/route.ts`)
- Alternative providers: OpenRouter, Replicate (via AI SDK)
- Provider selection handled at UI level with switching capability
- See `TUTORIAL_DIFY_INTEGRATION.md` for detailed Dify implementation

**4. Database Layer**
- **ORM**: Drizzle with type-safe queries
- **Connection**: Singleton pattern in `src/core/db/index.ts`
- **Supports**: Traditional servers and Cloudflare Workers
- **Migrations**: File-based with `pnpm db:generate && pnpm db:migrate`

**5. Internationalization (i18n)**
- **Library**: next-intl
- **Locales**: English (en) and Chinese (zh)
- **Structure**: `src/config/locale/messages/{locale}/{feature}.json`
- **Usage**: All user-facing text must be translated; use `t()` hook in components

**6. Authentication Flow**
- **Provider**: Better Auth
- **Configuration**: `src/core/auth/index.ts`
- **Dynamic**: Auth config loaded from database
- **RBAC**: Role-based access control supported via `pnpm rbac:*` commands

### Data Flow for Dify Chat

```
User Input (DifyFollowUp component)
    ↓
POST /api/dify/chat (API route)
    ↓
Dify API (with streaming)
    ↓
SSE Stream parsed by useDifyChat hook
    ↓
React state updates (batched with requestAnimationFrame)
    ↓
UI updates (DifyMessages component)
```

**Key Implementation Files:**
- Hook: `src/shared/hooks/chat/use-dify-chat.ts` (or similar location)
- API: `src/app/[locale]/(landing)/api/dify/chat/route.ts`
- Components: `src/shared/blocks/chat/`

## Code Style & Conventions

**Import Order** (enforced by `.prettierrc.json`):
1. React/Next.js imports
2. Third-party libraries
3. Internal imports (grouped by relative path)
4. Type imports
5. CSS imports

**Component Patterns:**
- Use functional components with hooks
- Wrap performance-sensitive components in `React.memo`
- Use `useCallback` for event handlers passed to children
- Use `useRef` for values that shouldn't trigger re-renders (e.g., streaming buffers)

**State Management:**
- React Context for global state
- Custom hooks for feature-specific logic
- Server state via React Query/SWR (if needed)

**TypeScript:**
- Strict mode enabled
- Path alias: `@/*` → `./src/*`
- Always define interfaces for component props and API responses

## Important Implementation Details

### Dify Chat Streaming Optimization

The Dify chat implementation bypasses the AI SDK for better performance:
- **Direct SSE handling**: Native ReadableStream API
- **Batched UI updates**: Uses `requestAnimationFrame` to prevent excessive re-renders
- **Workflow progress tracking**: Displays real-time workflow node execution
- **Error handling**: Graceful fallbacks for AbortError and network issues

**Critical performance pattern:**
```typescript
// Use ref to avoid re-renders during streaming
const contentBufferRef = useRef<string>('');

// Schedule updates to batch UI changes
const scheduleUpdate = useCallback(() => {
  if (rafIdRef.current === null) {
    rafIdRef.current = requestAnimationFrame(() => {
      setMessages(prev => [...prev, { content: contentBufferRef.current }]);
      rafIdRef.current = null;
    });
  }
}, []);
```

### Database Schema Management

- Schemas defined in `src/shared/models/`
- Always run `pnpm db:generate` after schema changes
- Use `pnpm db:push` for development (direct schema update)
- Use `pnpm db:migrate` for production (migration-based)

### Adding New Features

1. **Create route**: Add feature directory under `src/app/[locale]/(landing)/`
2. **Add translations**: Create JSON files in `src/config/locale/messages/en/` and `zh/`
3. **Create components**: Build UI in `src/shared/blocks/` or `src/shared/components/`
4. **Database changes**: Modify models in `src/shared/models/`, then run migrations
5. **API routes**: Add under `src/app/[locale]/(landing)/api/` if needed

## Deployment

**Vercel (Recommended):**
- Connect GitHub repo to Vercel
- Set environment variables in Vercel dashboard
- Deploy automatically on push to main branch

**Cloudflare Workers:**
- Use `pnpm cf:deploy` to deploy
- Requires Cloudflare credentials in environment
- See `pnpm cf:*` commands for full workflow

## Troubleshooting

**Build issues:**
- Use `pnpm build:fast` for memory-intensive builds
- Check TypeScript errors: `pnpm lint`

**Database issues:**
- Verify `DATABASE_URL` is correct
- Run `pnpm db:studio` to inspect database
- Recreate with `pnpm db:push` if migrations fail

**Auth issues:**
- Regenerate `AUTH_SECRET` if needed
- Run `pnpm auth:generate` after auth config changes

**Dify streaming issues:**
- Check browser Network tab for SSE events
- Verify Dify API credentials in database config
- See `TUTORIAL_DIFY_INTEGRATION.md` for debugging tips

## Additional Resources

- **Official Docs**: https://www.shipany.ai/zh/docs
- **Architecture Summary**: https://github.com/boomer1678/shipany-template/issues/1
- **Dify Integration Tutorial**: See `TUTORIAL_DIFY_INTEGRATION.md` in this repo
- **Update Log**: https://github.com/boomer1678/shipany-template/issues/3
