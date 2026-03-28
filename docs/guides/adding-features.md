# Adding New Features

> Last updated: 2026-03-28

## Step-by-Step Workflow

1. **Create route** — Add feature directory under `src/app/[locale]/(landing)/`
2. **Database schema** — Modify models in `src/shared/models/`, then run:
   ```bash
   pnpm db:generate && pnpm db:migrate
   pnpm docs:gen-schema   # Update docs/generated/db-schema.md
   ```
3. **API routes** — Add under `src/app/[locale]/(landing)/api/` if needed
4. **Components** — Build UI in `src/shared/blocks/` (reusable) or `src/shared/components/` (generic)
5. **Translations** — Add JSON files in `src/config/locale/messages/en/` and `zh/`
6. **Tests** — See testing requirements in global `~/.claude/rules/testing.md`

## Component Patterns

```typescript
// Performance-sensitive: use React.memo + useCallback
const MyComponent = React.memo(({ onAction }: Props) => {
  const handleAction = useCallback(() => { ... }, []);
  return <div onClick={handleAction}>...</div>;
});

// Streaming buffers: use useRef to avoid re-renders
const contentBufferRef = useRef<string>('');
const scheduleUpdate = useCallback(() => {
  if (rafIdRef.current === null) {
    rafIdRef.current = requestAnimationFrame(() => {
      setMessages(prev => [...]);
      rafIdRef.current = null;
    });
  }
}, []);
```

## i18n Pattern

```typescript
// Client component
import { useTranslations } from 'next-intl';
const t = useTranslations('FeatureName');

// Server component
import { getTranslations } from 'next-intl/server';
const t = await getTranslations('FeatureName');
```

Message files:
- `src/config/locale/messages/en/feature-name.json`
- `src/config/locale/messages/zh/feature-name.json`

## API Route Pattern

```typescript
// src/app/[locale]/(landing)/api/feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/core/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // validate with zod...
  return NextResponse.json({ success: true, data: result });
}
```

## See Also

- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — full directory map
- [../generated/db-schema.md](../generated/db-schema.md) — current database schema
- [../design-docs/DD-001-ai-provider-strategy.md](../design-docs/DD-001-ai-provider-strategy.md) — when to use which AI provider
