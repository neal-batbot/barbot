#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
CHAT_ID="${CHAT_ID:-}"
OPS_SIMULATE_TOKEN="${OPS_SIMULATE_TOKEN:-}"

echo "[1/4] Health check"
curl -fsS "${BASE_URL}/api/health" | head -c 400 && echo

if [[ -z "${AUTH_TOKEN}" || -z "${CHAT_ID}" ]]; then
  echo "[2/4] Skip chat smoke (AUTH_TOKEN or CHAT_ID missing)"
  echo "Set AUTH_TOKEN and CHAT_ID to run authenticated chat checks."
  exit 0
fi

echo "[2/4] Normal chat request"
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"chatId\":\"${CHAT_ID}\",\"model\":\"dify/default\",\"webSearch\":false,\"message\":{\"id\":\"smoke-1\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"hello\"}]}}" \
  | head -c 400 && echo

echo "[3/4] Trigger rate-limit (best effort)"
for i in $(seq 1 80); do
  curl -s -o /dev/null -X POST "${BASE_URL}/api/chat" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"chatId\":\"${CHAT_ID}\",\"model\":\"dify/default\",\"webSearch\":false,\"message\":{\"id\":\"smoke-${i}\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"ping\"}]}}"
done

echo "[4/4] Check latest response status/body"
curl -i -sS -X POST "${BASE_URL}/api/chat" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"chatId\":\"${CHAT_ID}\",\"model\":\"dify/default\",\"webSearch\":false,\"message\":{\"id\":\"smoke-final\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"rate limit check\"}]}}" \
  | head -c 700 && echo

if [[ -n "${OPS_SIMULATE_TOKEN}" ]]; then
  echo "[extra] Trigger synthetic 5xx for alert pipeline"
  curl -i -sS -X POST "${BASE_URL}/api/ops/simulate-error" \
    -H "x-ops-token: ${OPS_SIMULATE_TOKEN}" \
    | head -c 400 && echo
fi

echo "Smoke done. Verify Sentry/webhook alerts."
