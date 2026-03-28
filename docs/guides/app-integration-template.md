# App Integration Template (Minimal v1)

Use this template to connect a new app to IC-AI usage management.

1. Create an app id (example: `harvey`, `vector-cline`, `fumadocs`, `pi-mono`).
2. Add env in app runtime:
   - `ICAI_INGEST_URL=http://localhost:3000/api/v2/ingest/usage`
   - `ICAI_INGEST_API_KEY=<same as INTEGRATION_INGEST_API_KEY>`
3. In app code, find the request-complete point (success callback / finish event).
4. Send one POST request to ingest endpoint:
   - `app_id`, `user_id`, `type`, `tokens`, `cost` are required.
   - `product`, `model`, `metadata`, `timestamp` are optional.
5. Use `Authorization: Bearer <ICAI_INGEST_API_KEY>` for auth.
6. Do not block main flow on ingest errors.
7. If ingest fails, log warning and continue business response.
8. For streaming responses, report on stream finish.
9. For non-stream responses, report right before final return.
10. Keep `product` stable for chart grouping (example: `harvey`).
11. Keep `type` normalized (`chat`, `image`, `music`, `video`, `docs`, etc.).
12. Validate with curl first, then run app flow.
13. Confirm `usage_log` has records with the expected `app_id`.
14. Check dashboard `/dashboard/usage` filter for the new app.
15. Check dashboard `/dashboard/billing` included usage card.

Example payload:

```json
{
  "app_id": "harvey",
  "user_id": "user_123",
  "product": "harvey",
  "model": "glm-5",
  "type": "chat",
  "tokens": 1024,
  "cost": 0.0312,
  "metadata": {
    "chat_id": "chat_abc",
    "request_id": "req_xyz"
  }
}
```
