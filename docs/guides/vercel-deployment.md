# Vercel Deployment Guide (Sanitized)

## Required Environment Variables

Set all secrets in Vercel Dashboard, never in Git:

```bash
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
DATABASE_PROVIDER=postgresql
DB_SINGLETON_ENABLED=false
DB_MAX_CONNECTIONS=5

AUTH_SECRET=<generated-by-openssl-rand-base64-32>
NEXT_PUBLIC_APP_URL=https://<your-domain>
NEXT_PUBLIC_APP_NAME=IC-AI
NEXT_PUBLIC_THEME=default
NEXT_PUBLIC_APPEARANCE=system

# Optional Dify fallback (bot-specific keys should live in config table)
DIFY_API_URL=https://<your-dify-host>/v1
DIFY_API_KEY=app-<redacted>
```

## Deployment Checklist

1. Add environment variables for `Production` and `Preview`.
2. Redeploy the latest build.
3. Validate:
   - `GET /api/health` returns `status: ok` or expected `degraded` details.
   - `GET /api/chat/bots` returns 200.
   - Login and chat flow succeeds.

## Security Notes

- Do not commit real values to `.env*`, docs, or workflow files.
- Rotate secrets immediately if they are ever exposed.
- Keep `DB_SINGLETON_ENABLED=false` on serverless runtimes.
