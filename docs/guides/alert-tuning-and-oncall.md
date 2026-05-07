# Alert Tuning and On-Call Runbook

## Week-1 Tuning Targets

Tune these after production traffic is stable for 24-72 hours:

- `ALERT_MIN_REQUESTS`
- `ALERT_ERROR_RATE_THRESHOLD`
- `ALERT_P95_LATENCY_MS`
- `ALERT_COOLDOWN_MS`

Suggested initial profile:

- Business hours: lower thresholds, faster detection.
- Off-hours: higher thresholds or aggregated handling to reduce noise.

## On-Call Ownership

- **L1 (primary):** first receiver, triage in 10 minutes.
- **L2 (backup):** joins when L1 marks incident severity high.
- **Escalation:** unresolved > 30 min or user impact > 10% requests.

## Synthetic Verification

Use internal route to verify alert pipeline:

```bash
curl -i -X POST "$BASE_URL/api/ops/simulate-error" \
  -H "x-ops-token: $OPS_SIMULATE_TOKEN"
```

Expected:

- HTTP `500` response with `SYNTHETIC_5XX`.
- Sentry receives error event.
- Webhook receiver gets alert payload.

## Incident Log Fields

For each alert, record:

- Trigger time (UTC), route, error rate/p95 value
- First responder (L1), resolution owner (L2)
- Mitigation action and ETA
- Root cause summary and follow-up ticket
