---
id: EP-002
title: Launch Readiness Hardening (Docker Track)
status: ACTIVE
created: 2026-05-07
---

## Objective

Implement launch-critical hardening for security, reliability, and release operations.

## Progress

- [x] Remove local debug ingest calls from `/api/chat`
- [x] Add `/api/chat` rate limiting (IP + user window + user daily quota)
- [x] Return standardized `429` payload with `retryAfter` and `quotaRemaining`
- [x] Expand `/api/health` to app/db/dify checks + version/build metadata
- [x] Add global security headers (HSTS, CSP, X-Frame-Options, Referrer-Policy)
- [x] Restrict remote image domains (no wildcard host)
- [x] Remove plaintext secrets from deployment docs and `docker-compose.yml`
- [x] Add production env template (`.env.production.example`)
- [x] Add minimal CI workflow (`pnpm install`, `pnpm lint`, `pnpm build`)
- [x] Add Docker release runbook + production release script
- [x] Add structured logs for auth verify failures, chat route errors, Dify API failures
- [x] Integrate Sentry DSN event reporting + alert routing webhook
- [ ] Add dashboard-level cost guard UI and over-quota upgrade UX
- [x] Add Cloudflare rule configuration artifact for `/api/chat`
- [x] Add API error-rate + p95 latency threshold alerts
- [x] Add backend daily cost guard for `/api/chat` (user/model)
- [x] Add synthetic 5xx endpoint for Sentry/webhook pipeline verification
- [x] Add Redis-backed rate-limit store with configurable failure mode
- [x] Add Cloudflare 24h observation template and alert tuning/on-call runbook

## Notes

- Current rate-limit storage is process memory (suitable for current Docker single-instance baseline).
- For multi-instance scaling, replace with Redis-backed counters.
