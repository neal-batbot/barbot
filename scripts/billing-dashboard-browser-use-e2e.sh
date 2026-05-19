#!/usr/bin/env bash
set -Eeuo pipefail

BARBOT_BASE_URL="${BARBOT_BASE_URL:-http://localhost:3000}"
PI_WEB_UI_URL="${PI_WEB_UI_URL:-http://localhost:5173}"
RUN_ID="${BILLING_E2E_RUN_ID:-e2e-billing-$(date +%Y%m%d-%H%M%S)}"
ARTIFACT_DIR="${BILLING_E2E_ARTIFACT_DIR:-test-results/billing-dashboard-browser-use/${RUN_ID}}"
USER_EMAIL="${E2E_BILLING_EMAIL:-billing-e2e@example.com}"
ADMIN_EMAIL="${E2E_BILLING_ADMIN_EMAIL:-billing-admin-e2e@example.com}"
USER_PASSWORD="${E2E_BILLING_PASSWORD:-Test@123456}"
USAGE_TOKEN="${E2E_BILLING_API_KEY:-sk_e2e_billing_local}"
PROMPT="${BILLING_E2E_PROMPT:-${RUN_ID} 你好，请用一句话回复并保留这个编号。}"
RUN_SEED="${BILLING_E2E_RUN_SEED:-1}"
KEEP_BROWSER="${BILLING_E2E_KEEP_BROWSER:-0}"

USER_SESSION="barbot-billing-user-${RUN_ID}"
ADMIN_SESSION="barbot-billing-admin-${RUN_ID}"
USER_BROWSER=(agent-browser --session "$USER_SESSION")
ADMIN_BROWSER=(agent-browser --session "$ADMIN_SESSION")
FAILURES=()
WARNINGS=()

mkdir -p "$ARTIFACT_DIR"

log() {
  printf '[billing-e2e] %s\n' "$*"
}

record_failure() {
  FAILURES+=("$1")
  log "FAIL: $1"
}

record_warning() {
  WARNINGS+=("$1")
  log "WARN: $1"
}

save_command() {
  local name="$1"
  shift
  "$@" >"$ARTIFACT_DIR/${name}.txt" 2>&1 || true
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 127
  fi
}

session_cookie_for() {
  local email="$1"
  curl -i -sS -X POST "$BARBOT_BASE_URL/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    --data-binary "{
      \"email\":\"$email\",
      \"password\":\"$USER_PASSWORD\",
      \"callbackURL\":\"/zh/dashboard\"
    }" |
    awk 'BEGIN{IGNORECASE=1}/^set-cookie: (__Secure-)?better-auth.session_token=/{sub(/^set-cookie: /,""); sub(/;.*/,""); print; exit}'
}

cookie_name() {
  printf '%s' "$1" | cut -d '=' -f 1
}

cookie_value() {
  printf '%s' "$1" | cut -d '=' -f 2-
}

set_auth_cookie() {
  local browser_name="$1"
  local cookie="$2"
  shift 2

  local name
  name="$(cookie_name "$cookie")"
  local value
  value="$(cookie_value "$cookie")"
  local secure_flag=()
  if [[ "$name" == __Secure-* ]]; then
    secure_flag=(--secure)
  fi

  "$@" cookies set "$name" "$value" \
    --url "$BARBOT_BASE_URL" --domain localhost --path / --httpOnly "${secure_flag[@]}" --sameSite Lax >/dev/null || {
    record_failure "Could not set ${browser_name} auth cookie"
    return 1
  }
}

assert_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if ! grep -Fq "$needle" "$file"; then
    record_failure "$label: missing '${needle}' in ${file}"
  fi
}

extract_ref() {
  local file="$1"
  local pattern="$2"
  grep -E "$pattern" "$file" | head -1 | sed -E 's/.*ref=([^]]+).*/@\1/'
}

wait_for_text() {
  local needle="$1"
  local timeout_seconds="$2"
  local started
  started="$(date +%s)"
  while true; do
    save_command "body-latest" "${USER_BROWSER[@]}" get text body
    if grep -Fq "$needle" "$ARTIFACT_DIR/body-latest.txt"; then
      return 0
    fi
    if (( "$(date +%s)" - started >= timeout_seconds )); then
      return 1
    fi
    sleep 1
  done
}

finish() {
  local exit_code=$?
  if ((exit_code != 0 && ${#FAILURES[@]} == 0)); then
    FAILURES+=("E2E command exited before completing all checks")
  fi
  save_command "user-console" "${USER_BROWSER[@]}" console
  save_command "user-errors" "${USER_BROWSER[@]}" errors
  save_command "user-network" "${USER_BROWSER[@]}" network requests
  save_command "user-final" "${USER_BROWSER[@]}" snapshot -i -C
  "${USER_BROWSER[@]}" screenshot "$ARTIFACT_DIR/user-final.png" >/dev/null 2>&1 || true
  save_command "admin-console" "${ADMIN_BROWSER[@]}" console
  save_command "admin-errors" "${ADMIN_BROWSER[@]}" errors
  save_command "admin-final" "${ADMIN_BROWSER[@]}" snapshot -i -C
  "${ADMIN_BROWSER[@]}" screenshot "$ARTIFACT_DIR/admin-final.png" >/dev/null 2>&1 || true

  if [[ "$KEEP_BROWSER" != "1" ]]; then
    "${USER_BROWSER[@]}" close >/dev/null 2>&1 || true
    "${ADMIN_BROWSER[@]}" close >/dev/null 2>&1 || true
  fi

  {
    printf '# Billing Dashboard Browser-Use E2E Report\n\n'
    printf -- '- Run ID: `%s`\n' "$RUN_ID"
    printf -- '- Barbot URL: `%s`\n' "$BARBOT_BASE_URL"
    printf -- '- Pi Web UI URL: `%s`\n' "$PI_WEB_UI_URL"
    printf -- '- User: `%s`\n' "$USER_EMAIL"
    printf -- '- Admin: `%s`\n' "$ADMIN_EMAIL"
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
    printf -- '- `user-dashboard.png`\n'
    printf -- '- `user-billing.png`\n'
    printf -- '- `user-usage.png`\n'
    printf -- '- `pi-agent.png`\n'
    printf -- '- `admin-payments.png`\n'
    printf -- '- `admin-subscriptions.png`\n'
    printf -- '- `admin-credits.png`\n'
    printf -- '- `usage-report.json`\n'
    printf -- '- `usage-summary.txt`\n'
  } >"$ARTIFACT_DIR/report.md"

  log "Report: $ARTIFACT_DIR/report.md"
  if ((${#FAILURES[@]})); then
    exit 1
  fi
  exit "$exit_code"
}
trap finish EXIT

require_command agent-browser
require_command curl
require_command grep
require_command pnpm

if [[ "$RUN_SEED" == "1" ]]; then
  log "Seeding deterministic billing data"
  E2E_BILLING_EMAIL="$USER_EMAIL" \
    E2E_BILLING_ADMIN_EMAIL="$ADMIN_EMAIL" \
    E2E_BILLING_PASSWORD="$USER_PASSWORD" \
    E2E_BILLING_API_KEY="$USAGE_TOKEN" \
    pnpm exec tsx scripts/seed-test-data.ts >"$ARTIFACT_DIR/seed.txt" 2>&1 || record_failure "Billing seed failed"
fi

log "Checking services"
curl -fsS "$BARBOT_BASE_URL/api/health" >"$ARTIFACT_DIR/barbot-health.json" || record_failure "Barbot health is not reachable"
curl -fsS "$PI_WEB_UI_URL" >"$ARTIFACT_DIR/pi-root.html" || record_failure "Pi Web UI is not reachable"

log "Checking usage report idempotency via API token"
REQUEST_ID="${RUN_ID}:api-idempotent"
for _ in 1 2; do
  curl -fsS "$BARBOT_BASE_URL/api/v1/usage/report" \
    -H "Authorization: Bearer $USAGE_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary "{
      \"app_id\":\"pi-web-ui\",
      \"product\":\"pi-web-ui\",
      \"type\":\"chat\",
      \"provider\":\"dify\",
      \"model\":\"mcuAgent_v2\",
      \"tokens\":120,
      \"input_tokens\":90,
      \"output_tokens\":30,
      \"request_id\":\"$REQUEST_ID\",
      \"metadata\":{\"source\":\"billing-browser-use-e2e\"}
    }" >"$ARTIFACT_DIR/usage-report.json" || record_failure "Usage report API failed"
done
assert_contains "$ARTIFACT_DIR/usage-report.json" '"code":0' "usage report"

login_user() {
  local who="$1"
  local email="$2"
  local cookie
  log "Signing in ${who}"
  cookie="$(session_cookie_for "$email")"
  if [[ -z "$cookie" ]]; then
    record_failure "Could not mint session cookie for ${email}"
    return
  fi
  "${USER_BROWSER[@]}" close >/dev/null 2>&1 || true
  set_auth_cookie "$who" "$cookie" "${USER_BROWSER[@]}" || return
  "${USER_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/dashboard" >/dev/null
  "${USER_BROWSER[@]}" wait --load networkidle >/dev/null || true
}

login_admin() {
  local who="$1"
  local email="$2"
  local cookie
  log "Signing in ${who}"
  cookie="$(session_cookie_for "$email")"
  if [[ -z "$cookie" ]]; then
    record_failure "Could not mint session cookie for ${email}"
    return
  fi
  "${ADMIN_BROWSER[@]}" close >/dev/null 2>&1 || true
  set_auth_cookie "$who" "$cookie" "${ADMIN_BROWSER[@]}" || return
  "${ADMIN_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/admin/payments" >/dev/null
  "${ADMIN_BROWSER[@]}" wait --load networkidle >/dev/null || true
}

login_user "billing user" "$USER_EMAIL"

log "Validating user dashboard"
"${USER_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/dashboard" >/dev/null
"${USER_BROWSER[@]}" wait --load networkidle >/dev/null || true
"${USER_BROWSER[@]}" screenshot "$ARTIFACT_DIR/user-dashboard.png" >/dev/null || true
save_command "user-dashboard" "${USER_BROWSER[@]}" snapshot -C
assert_contains "$ARTIFACT_DIR/user-dashboard.txt" 'Pi Agent Pro' "user dashboard"
assert_contains "$ARTIFACT_DIR/user-dashboard.txt" 'pi-web-ui' "user dashboard"

"${USER_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/dashboard/billing" >/dev/null
"${USER_BROWSER[@]}" wait --load networkidle >/dev/null || true
"${USER_BROWSER[@]}" screenshot "$ARTIFACT_DIR/user-billing.png" >/dev/null || true
save_command "user-billing" "${USER_BROWSER[@]}" snapshot -C
assert_contains "$ARTIFACT_DIR/user-billing.txt" 'Pi Agent Pro' "billing page"
assert_contains "$ARTIFACT_DIR/user-billing.txt" 'pi-web-ui' "billing page"

"${USER_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/dashboard/usage" >/dev/null
"${USER_BROWSER[@]}" wait --load networkidle >/dev/null || true
wait_for_text "pi-web-ui" 20 || true
"${USER_BROWSER[@]}" screenshot "$ARTIFACT_DIR/user-usage.png" >/dev/null || true
save_command "user-usage" "${USER_BROWSER[@]}" snapshot -C
assert_contains "$ARTIFACT_DIR/user-usage.txt" 'Pi Agent' "usage page"
assert_contains "$ARTIFACT_DIR/user-usage.txt" 'pi-web-ui' "usage page"

log "Opening Pi Agent through Barbot platform entry"
"${USER_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/platform/pi-agent" >/dev/null
"${USER_BROWSER[@]}" wait --load networkidle >/dev/null || true
save_command "platform-entry-url" "${USER_BROWSER[@]}" get url
if ! grep -Fq "localhost:5173" "$ARTIFACT_DIR/platform-entry-url.txt"; then
  record_warning "Platform entry did not redirect to Pi URL; opening Pi Web UI directly"
  "${USER_BROWSER[@]}" open "$PI_WEB_UI_URL" >/dev/null
fi
"${USER_BROWSER[@]}" wait --load networkidle >/dev/null || true
"${USER_BROWSER[@]}" screenshot "$ARTIFACT_DIR/pi-agent.png" >/dev/null || true
save_command "pi-agent" "${USER_BROWSER[@]}" snapshot -C
assert_contains "$ARTIFACT_DIR/pi-agent.txt" 'Type a message...' "Pi Agent"

INPUT_REF="$(extract_ref "$ARTIFACT_DIR/pi-agent.txt" 'textbox "Type a message..."')"
if [[ -z "$INPUT_REF" ]]; then
  record_failure "Could not locate Pi chat input"
else
  "${USER_BROWSER[@]}" network requests --clear >/dev/null || true
  "${USER_BROWSER[@]}" errors --clear >/dev/null || true
  "${USER_BROWSER[@]}" fill "$INPUT_REF" "$PROMPT" >/dev/null
  "${USER_BROWSER[@]}" press Enter >/dev/null
  wait_for_text "$PROMPT" 20 || record_failure "Pi prompt did not appear"
  if ! wait_for_text "Progress" 90 && ! wait_for_text "检索" 90; then
    record_failure "Pi/Dify assistant stream did not show progress or reply text"
  fi
fi
save_command "pi-network" "${USER_BROWSER[@]}" network requests
if ! grep -Eq 'POST .*/api/chat' "$ARTIFACT_DIR/pi-network.txt"; then
  record_failure "No Pi /api/chat SSE request observed"
fi
if grep -Eq 'POST .*/api/chat .* (4|5)[0-9][0-9]' "$ARTIFACT_DIR/pi-network.txt"; then
  record_failure "Pi /api/chat returned 4xx/5xx"
fi

log "Rechecking usage dashboard after Pi chat"
"${USER_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/dashboard/usage" >/dev/null
"${USER_BROWSER[@]}" wait --load networkidle >/dev/null || true
wait_for_text "pi-web-ui" 20 || true
save_command "usage-summary" "${USER_BROWSER[@]}" snapshot -C
assert_contains "$ARTIFACT_DIR/usage-summary.txt" 'pi-web-ui' "usage dashboard after Pi chat"

login_admin "admin user" "$ADMIN_EMAIL"

log "Validating admin billing surfaces"
"${ADMIN_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/admin/payments" >/dev/null
"${ADMIN_BROWSER[@]}" wait --load networkidle >/dev/null || true
"${ADMIN_BROWSER[@]}" screenshot "$ARTIFACT_DIR/admin-payments.png" >/dev/null || true
save_command "admin-payments" "${ADMIN_BROWSER[@]}" snapshot -C
assert_contains "$ARTIFACT_DIR/admin-payments.txt" 'e2e-order-pi-web-ui-paid' "admin payments"

"${ADMIN_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/admin/subscriptions" >/dev/null
"${ADMIN_BROWSER[@]}" wait --load networkidle >/dev/null || true
"${ADMIN_BROWSER[@]}" screenshot "$ARTIFACT_DIR/admin-subscriptions.png" >/dev/null || true
save_command "admin-subscriptions" "${ADMIN_BROWSER[@]}" snapshot -C
assert_contains "$ARTIFACT_DIR/admin-subscriptions.txt" 'e2e-sub-pi-web-ui' "admin subscriptions"

"${ADMIN_BROWSER[@]}" open "$BARBOT_BASE_URL/zh/admin/credits" >/dev/null
"${ADMIN_BROWSER[@]}" wait --load networkidle >/dev/null || true
"${ADMIN_BROWSER[@]}" screenshot "$ARTIFACT_DIR/admin-credits.png" >/dev/null || true
save_command "admin-credits" "${ADMIN_BROWSER[@]}" snapshot -C
assert_contains "$ARTIFACT_DIR/admin-credits.txt" 'e2e-credit-grant-pi-web-ui' "admin credits"

log "Billing dashboard browser-use flow completed"
