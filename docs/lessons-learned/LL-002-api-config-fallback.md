---
id: LL-002
title: Missing API Configuration Fallback
date: 2026-01-07
severity: HIGH
domain: dify-integration
linked-design-doc: DD-003
---

## Issue

`dify_api_url` was empty in the database, causing API failures with no useful error message.

## Root Cause

Code only checked the database `config` table for `dify_api_url` — there was no fallback to an environment variable.

## Fix

```typescript
const difyApiUrl = configs.dify_api_url || process.env.DIFY_API_URL;
if (!difyApiUrl) throw new Error('dify_api_url not configured');
```

## Rule Added

See [../design-docs/DD-003-dify-streaming-architecture.md Rule 3](../design-docs/DD-003-dify-streaming-architecture.md).

## Prevention

For all external service URLs: always provide env var fallback. Use `scripts/verify-dify-config.ts` before deployment.
