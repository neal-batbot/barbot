# Development, Staging, and Production Workflow

> Last updated: 2026-05-19

This project uses a three-environment flow:

```text
local -> GitHub -> staging -> production
```

## Branches

| Branch | Purpose | Deploys to |
| ------ | ------- | ---------- |
| `feature/*` | Local feature work and AI coding changes | No automatic deploy |
| `staging` | Shared validation environment | `https://staging.harveycode.com` |
| `main` | Stable production release | `https://harveycode.com` |

Standard promotion path:

```text
feature/* -> staging -> main
```

## GitHub Actions

CI runs on pushes and pull requests targeting `main` or `staging`.

Docker image tags:

| Branch | Stable tag | Immutable tag |
| ------ | ---------- | ------------- |
| `staging` | `ghcr.io/neal-batbot/barbot:staging` | `ghcr.io/neal-batbot/barbot:staging-<sha>` |
| `main` | `ghcr.io/neal-batbot/barbot:latest` | `ghcr.io/neal-batbot/barbot:main-<sha>` |

Required repository secrets:

| Secret | Purpose |
| ------ | ------- |
| `VPS_HOST` | VPS hostname or IP |
| `VPS_USER` | SSH user for deployments |
| `VPS_SSH_KEY` | Private SSH key with Docker permissions |
| `GHCR_PAT` | Optional token for private GHCR image pulls on the VPS |
| `STAGING_ENV_FILE_PATH` | Absolute path to the staging env file on the VPS |
| `PRODUCTION_ENV_FILE_PATH` | Absolute path to the production env file on the VPS |

## VPS Runtime

Run two independent containers:

| Container | Host bind | Public URL |
| --------- | --------- | ---------- |
| `barbot-staging` | `127.0.0.1:3001 -> 3000` | `https://staging.harveycode.com` |
| `barbot-production` | `127.0.0.1:3000 -> 3000` | `https://harveycode.com` |

Example Nginx routing:

```nginx
server {
  server_name staging.harveycode.com;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}

server {
  server_name harveycode.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## Environment Files

Keep env files on the VPS and never commit real values. Minimum keys for both staging and production:

```bash
NEXT_PUBLIC_APP_URL=https://staging.harveycode.com
DATABASE_URL=postgresql://...
AUTH_SECRET=...
DIFY_API_URL=https://.../v1
DIFY_BASE_URL=https://.../v1
DIFY_API_KEY=app-...
BARBOT_USAGE_TOKEN=...
PI_AGENT_WEB_URL=https://...
NEXT_PUBLIC_PI_WEB_UI_URL=https://...

# Enable one provider. Use sandbox keys on staging.
DEFAULT_PAYMENT_PROVIDER=stripe
STRIPE_ENABLED=true
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_SIGNING_SECRET=whsec_...
```

For production, replace the public URLs and payment keys with production values.

## Release Gates

Before merging to `staging`:

```bash
pnpm lint
pnpm build
pnpm prod:env:check
```

After staging deploy:

```bash
curl -fsS https://staging.harveycode.com/api/health
curl -fsS https://staging.harveycode.com/api/chat/bots
```

Then verify Harvey Desktop against `https://staging.harveycode.com`:

```bash
cd /Users/neal/Downloads/Projects/AI-agent-project/craft-agents-oss
BARBOT_URL=https://staging.harveycode.com bun run barbot:verify
```

Before production deploy, merge `staging` into `main` only after staging passes Web health, login, chat, entitlement, provider-config, and usage-reporting checks.
