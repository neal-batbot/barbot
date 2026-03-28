---
id: LL-001
title: Empty conversation_id Causes Dify 404
date: 2026-01-07
severity: CRITICAL
domain: dify-integration
linked-design-doc: DD-003
---

## Issue

Dify API returned 404 when the frontend sent an empty string as `conversation_id`.

## Root Cause

Code always included `conversation_id` in the request body, even for new chats where the value was `''`.

## Fix

Conditionally include `conversation_id` only when it exists and is non-empty:

```typescript
if (conversationId && conversationId.trim()) {
  requestBody.conversation_id = conversationId;
}
```

## Rule Added

See [../design-docs/DD-003-dify-streaming-architecture.md Rule 1](../design-docs/DD-003-dify-streaming-architecture.md).

## Prevention

Code review checklist: when building Dify request body, verify `conversation_id` is not unconditionally assigned.
