# Cost Guard and Alerting

## Cost Guard (Server-Side)

`/api/chat` now supports daily caps:

- `COST_GUARD_DAILY_TOKENS_MAX`
- `COST_GUARD_DAILY_COST_MAX`
- `COST_GUARD_DAILY_MODEL_TOKENS_MAX`

When exceeded, API returns `429`:

```json
{
  "code": "COST_GUARD_EXCEEDED",
  "message": "Daily usage limit reached. Please retry later or upgrade your plan.",
  "retryAfter": 86400,
  "quotaRemaining": 0,
  "upgradeUrl": "/pricing"
}
```

## Alerting Thresholds

Set:

- `SENTRY_DSN`
- `ALERT_WEBHOOK_URL` (optional)
- `ALERT_ERROR_RATE_THRESHOLD` (default `0.05`)
- `ALERT_P95_LATENCY_MS` (default `2000`)
- `ALERT_MIN_REQUESTS` (default `30`)
- `ALERT_WINDOW_MS` (default `300000`)
- `ALERT_COOLDOWN_MS` (default `300000`)

Metrics are evaluated for:

- `/api/chat`
- `/api/dify/chat`

## Multi-Instance Rate Limit Backend

`/api/chat` supports two backends:

- `RATE_LIMIT_STORE=memory` (single-instance baseline)
- `RATE_LIMIT_STORE=redis` (recommended for multi-instance)

When using Redis:

- set `REDIS_REST_URL` and `REDIS_REST_TOKEN`
- configure `RATE_LIMIT_FAILURE_MODE`:
  - `fail-open` (default): allow requests on Redis failure and emit strong error logs
  - `fail-closed`: block requests when Redis is unavailable

Threshold breaches emit structured logs and send events to Sentry DSN (best-effort).
