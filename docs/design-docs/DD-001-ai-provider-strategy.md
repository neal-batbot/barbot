---
id: DD-001
title: AI Provider Strategy
status: VALIDATED
created: 2026-03-28
last-updated: 2026-03-28
---

## Core Belief

Dify is the primary AI runtime for conversational features. OpenRouter / Replicate / FAL / Gemini are secondary providers for generative media tasks, accessed via the AI SDK. The SSE streaming path for Dify is hand-rolled (bypasses AI SDK) for performance.

## Context

The project needs both conversational AI (customer support chatbot) and generative AI (image, music, video generation). No single provider covers all use cases cost-effectively.

## Decision

- **Chat / customer support** → Dify (workflow-based, SSE streaming, multi-bot support)
- **Image generation** → Replicate or FAL via AI SDK
- **Music generation** → Replicate via AI SDK
- **Video generation** → Replicate via AI SDK
- **Alternative chat** → OpenRouter or Gemini via AI SDK (switchable at UI level)

Provider selection for chat is determined by `chat.model` field:
- `dify/{botId}` → Dify provider with bot-specific API key
- Other values → AI SDK providers

## Consequences

- Dify SSE streaming requires a custom hook (`src/shared/hooks/use-dify-chat.ts`) — cannot use AI SDK's `useChat`
- Bot-specific API keys must be stored in the database `config` table, not hardcoded
- Provider switching is handled at the UI level, not the API level

## Validation Status

VALIDATED — all providers in production use as of 2026-01-07.

## See Also

- [DD-003-dify-streaming-architecture.md](DD-003-dify-streaming-architecture.md) — Dify implementation details
- [../../src/shared/hooks/use-dify-chat.ts](../../src/shared/hooks/use-dify-chat.ts) — primary Dify hook
- [../../src/extensions/ai/](../../src/extensions/ai/) — AI provider integrations
