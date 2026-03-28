---
id: LL-003
title: No 404 Error Recovery for Expired conversation_id
date: 2026-01-07
severity: CRITICAL
domain: dify-integration
linked-design-doc: DD-003
---

## Issue

Expired or invalid `conversation_id` caused permanent 404 errors — the user could not continue chatting without manually clearing browser state.

## Root Cause

No automatic recovery mechanism when Dify returned 404 for an invalid `conversation_id`. The invalid ID remained in the database and was reused on every retry.

## Fix

Handle 404 from Dify by clearing the `conversation_id` from the database:

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

## Rule Added

See [../design-docs/DD-003-dify-streaming-architecture.md Rule 1](../design-docs/DD-003-dify-streaming-architecture.md).

## Prevention

Always handle Dify 404 explicitly. Use `scripts/clear-all-conversation-ids.ts` when conversation state is corrupted in bulk.
