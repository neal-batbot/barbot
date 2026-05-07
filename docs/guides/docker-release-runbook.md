# Docker Release Runbook

## Tag Strategy

- `main` branch: build validation only
- `v*` tag: production release candidate image
- rollback target: previous successful `v*` tag

## Standard Flow

1. Merge to `main` and pass CI (`pnpm lint` + `pnpm build`).
2. Create release tag `vX.Y.Z`.
3. Build and push image.
4. Deploy with `.env.production` only.
5. Run `./scripts/release-prod.sh`.
6. Check `/api/health`, login, and chat smoke tests.

## Rollback

1. Redeploy previous image tag.
2. Restore database from pre-release backup if migration is incompatible.
3. Recheck `/api/health` and critical routes.
