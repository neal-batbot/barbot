---
id: DD-003
title: Dify Streaming Architecture & Critical Rules
status: VALIDATED
created: 2026-03-28
last-updated: 2026-03-28
---

## Core Belief

Dify SSE streaming uses `requestAnimationFrame` batching and a `useRef` content buffer to prevent excessive React re-renders. `conversation_id` is conditionally sent — **never as an empty string**. Bot API keys are selected per-bot from database config, not from a global key.

---

## Critical Rules (MUST FOLLOW)

### Rule 1: conversation_id Management

**NEVER send empty string as `conversation_id`** — Dify API returns 404.

```typescript
// CORRECT: Only include if exists and non-empty
const requestBody: Record<string, any> = {
  inputs, query, response_mode: 'streaming', user: user.id, files: [],
};
if (conversationId && conversationId.trim()) {
  requestBody.conversation_id = conversationId;
}

// WRONG: Always sending it
requestBody.conversation_id = conversationId; // '' causes 404!
```

Always handle 404 "Conversation Not Exists" errors:
```typescript
if (difyResponse.status === 404 && conversationId) {
  await updateChat(chatId, {
    metadata: JSON.stringify({ ...chatMetadata, dify_conversation_id: undefined }),
  });
  return new Response(
    JSON.stringify({ error: 'conversation_not_found', message: 'Conversation expired. Retry to create a new one.' }),
    { status: 404 }
  );
}
```

### Rule 2: Multi-Bot API Key Selection

Always determine the bot API key from `chat.model`, not from a global key.

```typescript
// CORRECT: Bot-specific key lookup
let difyApiKey = configs.dify_api_key; // global fallback
if (chat.model && chat.model.startsWith('dify/')) {
  const botId = chat.model.replace('dify/', '');
  const bots = JSON.parse(configs.dify_bots);
  const bot = bots.find((b: any) => b.id === botId);
  if (bot?.api_key) difyApiKey = bot.api_key;
}
```

`chat.model` format: `"dify/{botId}"` (e.g., `"dify/ti-chatbot"`, `"dify/novosns"`)

### Rule 3: API URL Configuration

`dify_api_url` is required. Always fall back to environment variable:

```typescript
const difyApiUrl = configs.dify_api_url || process.env.DIFY_API_URL;
if (!difyApiUrl) throw new Error('dify_api_url not configured');
```

### Rule 4: Rating Parameter Handling

Only send `rating` in `inputs` if the bot config has `has_rating: true`:

```typescript
const inputs: Record<string, any> = {};
if (rating) {
  inputs.rating = rating;
} else if (botConfig?.has_rating && botConfig?.ratings?.length > 0) {
  inputs.rating = botConfig.default_rating || botConfig.ratings[0];
}
// Do NOT send rating if bot doesn't have this feature
```

### Rule 5: Debug Logging Format

Always add debug logs at API entry points:

```typescript
console.log('[DEBUG POST /api/dify/chat] Chat ID:', chatId);
console.log('[DEBUG POST /api/dify/chat] Chat Model:', chat.model);
console.log('[DEBUG POST /api/dify/chat] Conversation ID:', conversationId || '(empty)');
console.log('[DEBUG POST /api/dify/chat] Using bot:', botConfig?.title || 'default');
console.log('[DEBUG POST /api/dify/chat] API Key:', difyApiKey.substring(0, 15) + '...');
```

---

## Streaming Performance Pattern

The Dify hook bypasses AI SDK for better streaming performance:

```typescript
// src/shared/hooks/use-dify-chat.ts
const contentBufferRef = useRef<string>(''); // Avoid re-renders during streaming

const scheduleUpdate = useCallback(() => {
  if (rafIdRef.current === null) {
    rafIdRef.current = requestAnimationFrame(() => {
      setMessages(prev => [...prev, { content: contentBufferRef.current }]);
      rafIdRef.current = null;
    });
  }
}, []);
```

---

## Bot Configuration Format (stored in database `config.dify_bots`)

```json
[
  {
    "id": "ti-chatbot",
    "title": "TI ChatBot Assistant",
    "api_key": "app-xxx",
    "has_rating": true,
    "ratings": ["Catalog工业", "Automotive汽车"],
    "default_rating": "Catalog工业"
  },
  {
    "id": "novosns",
    "title": "Novosns Assistant",
    "api_key": "app-xxx",
    "has_rating": false
  }
]
```

**Configuration priority**: Database config table → Environment variables → Error

---

## Common Pitfalls

| DON'T | DO |
|-------|----|
| Send `conversation_id: ''` | Only include if non-empty |
| Use global API key for all bots | Select per-bot key from `chat.model` |
| Ignore Dify 404 errors | Clear invalid `conversation_id` and allow retry |
| Hardcode API URLs | Use DB config with env var fallback |

---

## Validation Scripts

```bash
npx tsx scripts/verify-dify-config.ts       # Test API connections for all bots
npx tsx scripts/verify-dify-bots.ts         # Check bot config in database
npx tsx scripts/add-dify-url.ts             # Add missing dify_api_url
npx tsx scripts/clear-all-conversation-ids.ts  # Clear expired conversation IDs
```

## See Also

- [../../src/shared/hooks/use-dify-chat.ts](../../src/shared/hooks/use-dify-chat.ts) — primary Dify hook
- [../../src/app/api/dify/chat/route.ts](../../src/app/api/dify/chat/) — API route
- [../guides/dify-integration.md](../guides/dify-integration.md) — full integration tutorial
- [../lessons-learned/](../lessons-learned/) — 5 documented lessons from past issues
