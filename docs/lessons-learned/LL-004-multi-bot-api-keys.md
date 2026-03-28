---
id: LL-004
title: Global API Key Used for All Bots
date: 2026-01-07
severity: HIGH
domain: dify-integration
linked-design-doc: DD-003
---

## Issue

All Dify bots used the same global API key, causing requests to fail or go to the wrong bot.

## Root Cause

The bot lookup logic based on `chat.model` was not implemented — code always used `configs.dify_api_key` regardless of which bot was requested.

## Fix

Look up the bot-specific API key from `configs.dify_bots` based on `chat.model`:

```typescript
let difyApiKey = configs.dify_api_key; // fallback
if (chat.model && chat.model.startsWith('dify/')) {
  const botId = chat.model.replace('dify/', '');
  const bots = JSON.parse(configs.dify_bots);
  const bot = bots.find((b: any) => b.id === botId);
  if (bot?.api_key) difyApiKey = bot.api_key;
}
```

## Rule Added

See [../design-docs/DD-003-dify-streaming-architecture.md Rule 2](../design-docs/DD-003-dify-streaming-architecture.md).

## Prevention

When adding a new bot, always verify its `api_key` is in the `dify_bots` JSON config and use `scripts/verify-dify-bots.ts` to confirm.
