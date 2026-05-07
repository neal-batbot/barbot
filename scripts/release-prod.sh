#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "[1/5] Create production backup"
echo "Run your provider backup command here (example):"
echo "  pg_dump \"${DATABASE_URL}\" > backup-$(date +%Y%m%d-%H%M%S).sql"

echo "[2/5] Apply schema migration"
pnpm db:migrate

echo "[3/5] Initialize RBAC defaults"
pnpm rbac:init

echo "[4/5] Health check"
curl -fsS "${NEXT_PUBLIC_APP_URL:-http://localhost:3000}/api/health" >/dev/null

echo "[5/5] Rollback drill reminder"
echo "Validate rollback using last backup and previous image tag before declaring success."
