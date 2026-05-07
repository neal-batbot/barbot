# Cloudflare `/api/chat` Protection Baseline

## Goals

- Challenge suspicious bot traffic before it reaches origin
- Add edge rate controls for abuse spikes
- Preserve normal signed-in user traffic

## Rule Set (Recommended)

1. **Managed WAF + Bot Fight Mode**
   - Enable Managed WAF
   - Enable Bot Fight Mode

2. **Challenge Rule for `/api/chat`**
   - Expression:
     - `(http.request.uri.path eq "/api/chat" and not cf.client.bot and cf.threat_score gt 10)`
   - Action: `Managed Challenge`

3. **Rate Limiting Rule: `/api/chat`**
   - Match: `http.request.uri.path eq "/api/chat"`
   - Characteristics: IP + JA3 fingerprint
   - Threshold: `120 requests / 1 minute`
   - Action: `Block` for `1 minute`

4. **Country / ASN Blocklist (Optional)**
   - Add only if you have verified abuse patterns in logs.

## Validation Checklist

- Healthy users can chat continuously.
- Repeated scripted requests trigger challenge or block.
- Origin `/api/chat` 5xx rate decreases during attack windows.
