#!/usr/bin/env bash
set -Eeuo pipefail

BARBOT_BASE_URL="${BARBOT_BASE_URL:-http://localhost:3000}"
RUN_ID="${MODEL_SUPPLY_E2E_RUN_ID:-model-supply-$(date +%Y%m%d-%H%M%S)}"
ARTIFACT_DIR="${MODEL_SUPPLY_E2E_ARTIFACT_DIR:-test-results/model-supply-e2e/${RUN_ID}}"
USER_EMAIL="${MODEL_SUPPLY_E2E_EMAIL:-model-supply-e2e@example.com}"
USER_PASSWORD="${MODEL_SUPPLY_E2E_PASSWORD:-Test@123456}"
PROMPT="${MODEL_SUPPLY_E2E_PROMPT:-${RUN_ID} 请用一句话回复并保留这个编号。}"
RUN_BROWSER="${MODEL_SUPPLY_E2E_BROWSER:-1}"
FAILURES=()
WARNINGS=()

mkdir -p "$ARTIFACT_DIR"

log() {
  printf '[model-supply-e2e] %s\n' "$*"
}

record_failure() {
  FAILURES+=("$1")
  log "FAIL: $1"
}

record_warning() {
  WARNINGS+=("$1")
  log "WARN: $1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 127
  fi
}

session_cookie_for() {
  curl -i -sS -X POST "$BARBOT_BASE_URL/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    --data-binary "{
      \"email\":\"$USER_EMAIL\",
      \"password\":\"$USER_PASSWORD\",
      \"callbackURL\":\"/zh/chat\"
    }" |
    awk 'BEGIN{IGNORECASE=1}/^set-cookie: better-auth.session_token=/{sub(/^set-cookie: better-auth.session_token=/,""); sub(/;.*/,""); print; exit}'
}

assert_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if ! grep -Fq "$needle" "$file"; then
    record_failure "$label: missing '${needle}' in ${file}"
  fi
}

json_field() {
  local file="$1"
  local path="$2"
  node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync('$file','utf8')); const value='$path'.split('.').reduce((a,k)=>a&&a[k], obj); if (value == null) process.exit(1); process.stdout.write(String(value));"
}

api_post_chat() {
  local label="$1"
  local chat_id="$2"
  local text="$3"
  curl -sS -D "$ARTIFACT_DIR/${label}-headers.txt" \
    -o "$ARTIFACT_DIR/${label}-body.txt" \
    -w "%{http_code}" \
    -X POST "$BARBOT_BASE_URL/api/chat" \
    -H "Cookie: better-auth.session_token=$SESSION_COOKIE" \
    -H "Content-Type: application/json" \
    --data-binary "{
      \"chatId\":\"$chat_id\",
      \"model\":\"auto\",
      \"provider\":\"auto\",
      \"webSearch\":false,
      \"reasoning\":false,
      \"message\":{
        \"id\":\"${label}\",
        \"role\":\"user\",
        \"parts\":[{\"type\":\"text\",\"text\":\"$text\"}]
      }
    }"
}

finish() {
  {
    printf '# Model Supply E2E Report\n\n'
    printf -- '- Run ID: `%s`\n' "$RUN_ID"
    printf -- '- Barbot URL: `%s`\n' "$BARBOT_BASE_URL"
    printf -- '- User: `%s`\n' "$USER_EMAIL"
    printf -- '- Prompt: `%s`\n\n' "$PROMPT"
    if ((${#WARNINGS[@]})); then
      printf '## Warnings\n'
      printf -- '- %s\n' "${WARNINGS[@]}"
      printf '\n'
    fi
    if ((${#FAILURES[@]})); then
      printf '## Failures\n'
      printf -- '- %s\n' "${FAILURES[@]}"
      printf '\n'
    else
      printf '## Result\nPASS\n\n'
    fi
    printf '## Evidence\n'
    printf -- '- `plan.json`\n'
    printf -- '- `chat-normal-body.txt`\n'
    printf -- '- `chat-fallback-body.txt`\n'
    printf -- '- `chat-restored-body.txt`\n'
    printf -- '- `usage-logs.json`\n'
    printf -- '- `usage-summary.json`\n'
    printf -- '- `browser-chat.png`, `browser-usage.png`, `browser-billing.png` when browser capture is enabled\n'
  } >"$ARTIFACT_DIR/report.md"

  log "Report: $ARTIFACT_DIR/report.md"
  if ((${#FAILURES[@]})); then
    exit 1
  fi
}
trap finish EXIT

require_command curl
require_command grep
require_command node
require_command pnpm

log "Seeding model supply plans, providers, and E2E user"
MODEL_SUPPLY_SEED_MODE=e2e \
  MODEL_SUPPLY_E2E_EMAIL="$USER_EMAIL" \
  MODEL_SUPPLY_E2E_PASSWORD="$USER_PASSWORD" \
  pnpm exec tsx scripts/seed-model-supply.ts >"$ARTIFACT_DIR/seed.txt" 2>&1 || record_failure "seed failed"

log "Checking health"
curl -fsS "$BARBOT_BASE_URL/api/health" >"$ARTIFACT_DIR/health.json" || record_failure "health check failed"

log "Signing in"
SESSION_COOKIE="$(session_cookie_for)"
if [[ -z "${SESSION_COOKIE:-}" ]]; then
  record_failure "could not mint session cookie"
fi

log "Checking plan menu data"
curl -fsS "$BARBOT_BASE_URL/api/chat/plan" \
  -H "Cookie: better-auth.session_token=$SESSION_COOKIE" \
  >"$ARTIFACT_DIR/plan.json" || record_failure "plan API failed"
assert_contains "$ARTIFACT_DIR/plan.json" '"auto"' "plan allows Auto"
assert_contains "$ARTIFACT_DIR/plan.json" '"kimi-*"' "plan allows basic models"

log "Creating chat"
curl -fsS -X POST "$BARBOT_BASE_URL/api/chat/new" \
  -H "Cookie: better-auth.session_token=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  --data-binary "{
    \"message\":{\"text\":\"$PROMPT\"},
    \"body\":{\"model\":\"auto\",\"provider\":\"auto\"}
  }" >"$ARTIFACT_DIR/chat-new.json" || record_failure "chat creation failed"
CHAT_ID="$(json_field "$ARTIFACT_DIR/chat-new.json" "data.id" || true)"
if [[ -z "${CHAT_ID:-}" ]]; then
  record_failure "could not parse chat id"
fi

log "Sending normal chat request"
HTTP_CODE="$(api_post_chat "chat-normal" "$CHAT_ID" "$PROMPT normal")"
[[ "$HTTP_CODE" == 2* ]] || record_failure "normal chat returned HTTP $HTTP_CODE"
assert_contains "$ARTIFACT_DIR/chat-normal-body.txt" "mock-primary" "normal chat uses primary"

log "Degrading primary provider and sending fallback request"
MODEL_SUPPLY_SEED_MODE=e2e MODEL_SUPPLY_SEED_ACTION=degrade-primary \
  pnpm exec tsx scripts/seed-model-supply.ts >"$ARTIFACT_DIR/degrade-primary.txt" 2>&1 || record_failure "degrade action failed"
HTTP_CODE="$(api_post_chat "chat-fallback" "$CHAT_ID" "$PROMPT fallback")"
[[ "$HTTP_CODE" == 2* ]] || record_failure "fallback chat returned HTTP $HTTP_CODE"
assert_contains "$ARTIFACT_DIR/chat-fallback-body.txt" "mock-fallback" "fallback chat uses backup"

log "Restoring primary provider and sending recovery request"
MODEL_SUPPLY_SEED_MODE=e2e MODEL_SUPPLY_SEED_ACTION=restore-primary \
  pnpm exec tsx scripts/seed-model-supply.ts >"$ARTIFACT_DIR/restore-primary.txt" 2>&1 || record_failure "restore action failed"
HTTP_CODE="$(api_post_chat "chat-restored" "$CHAT_ID" "$PROMPT restored")"
[[ "$HTTP_CODE" == 2* ]] || record_failure "restored chat returned HTTP $HTTP_CODE"
assert_contains "$ARTIFACT_DIR/chat-restored-body.txt" "mock-primary" "restored chat returns to primary"

log "Collecting usage and billing evidence"
curl -fsS "$BARBOT_BASE_URL/api/v1/usage/logs?product=chat&limit=20" \
  -H "Cookie: better-auth.session_token=$SESSION_COOKIE" \
  >"$ARTIFACT_DIR/usage-logs.json" || record_failure "usage logs API failed"
curl -fsS "$BARBOT_BASE_URL/api/v1/usage/summary?group_by=model" \
  -H "Cookie: better-auth.session_token=$SESSION_COOKIE" \
  >"$ARTIFACT_DIR/usage-summary.json" || record_failure "usage summary API failed"
assert_contains "$ARTIFACT_DIR/usage-logs.json" "mock-primary" "usage logs include primary"
assert_contains "$ARTIFACT_DIR/usage-logs.json" "mock-fallback" "usage logs include fallback"
assert_contains "$ARTIFACT_DIR/usage-logs.json" "requested_model" "usage logs include requested model metadata"
assert_contains "$ARTIFACT_DIR/usage-logs.json" "actual_provider" "usage logs include actual provider metadata"

if [[ "$RUN_BROWSER" == "1" ]]; then
  if command -v agent-browser >/dev/null 2>&1; then
    SESSION_NAME="model-supply-${RUN_ID}"
    BROWSER=(agent-browser --session "$SESSION_NAME")
    log "Capturing browser pages"
    "${BROWSER[@]}" close >/dev/null 2>&1 || true
    "${BROWSER[@]}" cookies set better-auth.session_token "$SESSION_COOKIE" \
      --url "$BARBOT_BASE_URL" --domain localhost --path / --httpOnly --sameSite Lax >/dev/null || record_warning "browser cookie injection failed"
    "${BROWSER[@]}" open "$BARBOT_BASE_URL/zh/chat" >/dev/null || record_warning "browser chat open failed"
    "${BROWSER[@]}" wait --load networkidle >/dev/null 2>&1 || true
    "${BROWSER[@]}" get text body >"$ARTIFACT_DIR/browser-chat.txt" 2>&1 || true
    "${BROWSER[@]}" screenshot "$ARTIFACT_DIR/browser-chat.png" >/dev/null 2>&1 || true
    "${BROWSER[@]}" open "$BARBOT_BASE_URL/zh/dashboard/usage" >/dev/null || record_warning "browser usage open failed"
    "${BROWSER[@]}" wait --load networkidle >/dev/null 2>&1 || true
    "${BROWSER[@]}" get text body >"$ARTIFACT_DIR/browser-usage.txt" 2>&1 || true
    "${BROWSER[@]}" screenshot "$ARTIFACT_DIR/browser-usage.png" >/dev/null 2>&1 || true
    "${BROWSER[@]}" open "$BARBOT_BASE_URL/zh/dashboard/billing" >/dev/null || record_warning "browser billing open failed"
    "${BROWSER[@]}" wait --load networkidle >/dev/null 2>&1 || true
    "${BROWSER[@]}" get text body >"$ARTIFACT_DIR/browser-billing.txt" 2>&1 || true
    "${BROWSER[@]}" screenshot "$ARTIFACT_DIR/browser-billing.png" >/dev/null 2>&1 || true
    "${BROWSER[@]}" close >/dev/null 2>&1 || true
  else
    record_warning "agent-browser not installed; API E2E completed without screenshots"
  fi
fi
