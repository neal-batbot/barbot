# Docker Release Runbook

## Tag Strategy

- `staging` branch: builds and deploys `ghcr.io/neal-batbot/barbot:staging`
- `main` branch: builds and deploys `ghcr.io/neal-batbot/barbot:latest`
- Immutable rollback targets: `staging-<sha>` and `main-<sha>`

## Standard Flow

1. Merge feature work to `staging` and pass CI (`pnpm lint` + `pnpm build`).
2. Let GitHub Actions build and deploy `barbot-staging`.
3. Check `https://staging.harveycode.com/api/health`, login, chat, and Harvey Desktop account linking.
4. Merge `staging` to `main` only after staging passes.
5. Let GitHub Actions build and deploy `barbot-production`.
6. Run `./scripts/release-prod.sh` on the production host when migrations/RBAC initialization are required.
7. Check `https://harveycode.com/api/health`, login, and chat smoke tests.

## Rollback

1. Redeploy the previous `main-<sha>` image tag for production or `staging-<sha>` for staging.
2. Restore database from pre-release backup if migration is incompatible.
3. Recheck `/api/health` and critical routes.
