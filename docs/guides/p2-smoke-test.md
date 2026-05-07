# P2 Smoke Test

## Preconditions

- Service is running with production-like env vars.
- Optional: set `AUTH_TOKEN` and `CHAT_ID` for authenticated chat tests.

## Run

```bash
BASE_URL=http://localhost:3000 \
AUTH_TOKEN=<bearer-token> \
CHAT_ID=<existing-chat-id> \
OPS_SIMULATE_TOKEN=<ops-token> \
./scripts/smoke-p2.sh
```

## Verify

1. `/api/health` returns app/db/dify checks.
2. Normal `/api/chat` request succeeds.
3. High-frequency requests eventually return `429`.
4. `Retry-After` and quota-related response fields are present.
5. `/api/ops/simulate-error` returns synthetic `500` when token is valid.
6. Sentry/webhook receives alert events.
