#!/usr/bin/env bash
set -Eeuo pipefail

BARBOT_BASE_URL="${BARBOT_BASE_URL:-http://localhost:3000}"
PI_WEB_UI_URL="${PI_WEB_UI_URL:-http://localhost:5173}"
RUN_ID="${PI_AGENT_E2E_RUN_ID:-e2e-$(date +%Y%m%d-%H%M%S)}"
SESSION_NAME="${PI_AGENT_BROWSER_SESSION:-barbot-pi-agent-browser-use-${RUN_ID}}"
ARTIFACT_DIR="${PI_AGENT_E2E_ARTIFACT_DIR:-test-results/pi-agent-browser-use/${RUN_ID}}"
EXPECTED_REPLY="${PI_AGENT_E2E_EXPECTED_REPLY:-OK}"
PROMPT="${PI_AGENT_E2E_PROMPT:-browser-use联调-${RUN_ID}，只回复 ${EXPECTED_REPLY}}"
AUTH_MODE="${PI_AGENT_BROWSER_AUTH_MODE:-auto}"
KEEP_BROWSER="${PI_AGENT_KEEP_BROWSER:-0}"
REQUIRE_REAL_AUTH="${PI_AGENT_REQUIRE_REAL_AUTH:-0}"

AB=(agent-browser --session "$SESSION_NAME")
FAILURES=()
WARNINGS=()

mkdir -p "$ARTIFACT_DIR"

log() {
  printf '[pi-agent-e2e] %s\n' "$*"
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

assert_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if ! grep -Fq "$needle" "$file"; then
    record_failure "$label: missing '${needle}' in ${file}"
  fi
}

assert_not_contains_any() {
  local file="$1"
  local label="$2"
  shift 2
  local needle
  for needle in "$@"; do
    if grep -Fq "$needle" "$file"; then
      record_failure "$label: unexpected '${needle}' in ${file}"
    fi
  done
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
    save_command "body-latest" "${AB[@]}" get text body
    if grep -Fq "$needle" "$ARTIFACT_DIR/body-latest.txt"; then
      return 0
    fi
    if (( "$(date +%s)" - started >= timeout_seconds )); then
      return 1
    fi
    sleep 1
  done
}

wait_for_occurrences() {
  local needle="$1"
  local minimum_count="$2"
  local timeout_seconds="$3"
  local started
  local count
  started="$(date +%s)"
  while true; do
    save_command "body-latest" "${AB[@]}" get text body
    count="$(grep -oF "$needle" "$ARTIFACT_DIR/body-latest.txt" | wc -l | tr -d ' ')"
    if ((count >= minimum_count)); then
      return 0
    fi
    if (( "$(date +%s)" - started >= timeout_seconds )); then
      return 1
    fi
    sleep 1
  done
}

cleanup_test_sessions() {
  "${AB[@]}" eval --stdin >/dev/null 2>&1 <<'EVALEOF' || true
(() => {
  const deleteMatching = (db) => {
    const tx = db.transaction(["sessions", "sessions-metadata"], "readwrite");
    const metaStore = tx.objectStore("sessions-metadata");
    const sessionStore = tx.objectStore("sessions");
    const req = metaStore.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const value = cursor.value || {};
      const title = String(value.title || value.preview || "");
      if (title.startsWith("browser-use联调-") || title.startsWith("e2e-")) {
        metaStore.delete(cursor.key);
        sessionStore.delete(cursor.key);
      }
      cursor.continue();
    };
  };
  const open = indexedDB.open("pi-web-ui-example");
  open.onsuccess = () => deleteMatching(open.result);
})();
EVALEOF
}

finish() {
  local exit_code=$?
  if ((exit_code != 0 && ${#FAILURES[@]} == 0)); then
    FAILURES+=("Script aborted before completing all checks; inspect console/network/final snapshot artifacts")
  fi
  save_command "console" "${AB[@]}" console
  save_command "errors" "${AB[@]}" errors
  save_command "network-requests" "${AB[@]}" network requests
  save_command "final-snapshot" "${AB[@]}" snapshot -i
  "${AB[@]}" screenshot "$ARTIFACT_DIR/final.png" >/dev/null 2>&1 || true
  cleanup_test_sessions
  if [[ "$KEEP_BROWSER" != "1" ]]; then
    "${AB[@]}" close >/dev/null 2>&1 || true
  fi

  {
    printf '# Pi Agent Browser-Use E2E Report\n\n'
    printf -- '- Run ID: `%s`\n' "$RUN_ID"
    printf -- '- Auth mode: `%s`\n' "$AUTH_MODE"
    printf -- '- Barbot URL: `%s`\n' "$BARBOT_BASE_URL"
    printf -- '- Pi Web UI URL: `%s`\n' "$PI_WEB_UI_URL"
    printf -- '- Prompt: `%s`\n' "$PROMPT"
    printf -- '- Artifact dir: `%s`\n\n' "$ARTIFACT_DIR"
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
    printf -- '- `landing.png`\n'
    printf -- '- `pi-ui.png`\n'
    printf -- '- `model-selector.txt`\n'
    printf -- '- `body-latest.txt`\n'
    printf -- '- `console.txt`\n'
    printf -- '- `errors.txt`\n'
    printf -- '- `network-requests.txt`\n'
    printf -- '- `final.png`\n'
  } >"$ARTIFACT_DIR/report.md"

  if ((${#FAILURES[@]})); then
    log "Report: $ARTIFACT_DIR/report.md"
    exit 1
  fi
  log "Report: $ARTIFACT_DIR/report.md"
  exit "$exit_code"
}
trap finish EXIT

require_command agent-browser
require_command curl
require_command grep
require_command sed

log "Artifacts: $ARTIFACT_DIR"
log "Checking local services"
curl -fsS "$BARBOT_BASE_URL/api/health" >"$ARTIFACT_DIR/barbot-health.json" || record_failure "Barbot health endpoint is not reachable"
curl -fsS "$PI_WEB_UI_URL/api/runtime" >"$ARTIFACT_DIR/pi-runtime.json" || record_failure "Pi runtime endpoint is not reachable"
assert_contains "$ARTIFACT_DIR/pi-runtime.json" '"nextOpenAIBaseUrl":"https://dragoncode.codes"' "runtime config"
assert_contains "$ARTIFACT_DIR/pi-runtime.json" '"gpt-5.5"' "runtime config"

log "Clearing browser-use session state"
"${AB[@]}" close >/dev/null 2>&1 || true

log "Opening Barbot landing page"
"${AB[@]}" open "$BARBOT_BASE_URL/zh" >/dev/null
"${AB[@]}" wait --load networkidle >/dev/null || true
"${AB[@]}" screenshot "$ARTIFACT_DIR/landing.png" >/dev/null || true
save_command "landing-snapshot" "${AB[@]}" snapshot -i -C
if ! grep -Eq '平台|Pi Agent|Pi Agent Web UI' "$ARTIFACT_DIR/landing-snapshot.txt"; then
  record_warning "Landing snapshot did not expose the platform menu text; direct platform route will still be tested"
fi

log "Checking unauthenticated Pi Agent gate"
"${AB[@]}" open "$BARBOT_BASE_URL/zh/platform/pi-agent" >/dev/null
"${AB[@]}" wait --load networkidle >/dev/null || true
save_command "unauth-pi-entry" "${AB[@]}" snapshot -i
save_command "unauth-url" "${AB[@]}" get url
if ! grep -Eq 'sign-in|Sign In|登录|Sign in required|localhost:5173' "$ARTIFACT_DIR/unauth-pi-entry.txt" "$ARTIFACT_DIR/unauth-url.txt"; then
  record_failure "Unauthenticated Pi Agent entry did not show sign-in or Pi auth gate"
fi

login_with_real_credentials() {
  if [[ -z "${E2E_TEST_EMAIL:-}" || -z "${E2E_TEST_PASSWORD:-}" ]]; then
    return 1
  fi

  log "Signing in with E2E_TEST_EMAIL"
  "${AB[@]}" open "$BARBOT_BASE_URL/zh/sign-in?callbackUrl=%2Fzh%2Fplatform%2Fpi-agent" >/dev/null
  "${AB[@]}" wait --load networkidle >/dev/null || true
  "${AB[@]}" fill '#email' "$E2E_TEST_EMAIL" >/dev/null
  "${AB[@]}" fill '#password' "$E2E_TEST_PASSWORD" >/dev/null
  "${AB[@]}" find role button click --name 'Sign In' >/dev/null || "${AB[@]}" find role button click --name '登录' >/dev/null
  if ! "${AB[@]}" wait --url "**localhost:5173**" >/dev/null 2>&1; then
    record_failure "Real auth did not redirect to Pi Web UI"
    return 1
  fi
  AUTH_MODE="real"
  return 0
}

open_dev_auth_flow() {
  log "Opening Pi Web UI with devAuth smoke mode"
  AUTH_MODE="devAuth"
  "${AB[@]}" open "$PI_WEB_UI_URL/?devAuth=1" >/dev/null
  "${AB[@]}" wait --load networkidle >/dev/null || true
}

if ! login_with_real_credentials; then
  if [[ "$REQUIRE_REAL_AUTH" == "1" ]]; then
    record_failure "Real auth is required but E2E_TEST_EMAIL/E2E_TEST_PASSWORD are missing or login failed"
  fi
  open_dev_auth_flow
fi

log "Capturing Pi UI"
"${AB[@]}" screenshot "$ARTIFACT_DIR/pi-ui.png" >/dev/null || true
save_command "pi-ui-snapshot" "${AB[@]}" snapshot -i -C
assert_contains "$ARTIFACT_DIR/pi-ui-snapshot.txt" 'gpt-5.5' "Pi UI"
assert_contains "$ARTIFACT_DIR/pi-ui-snapshot.txt" 'Type a message...' "Pi UI"

log "Verifying model selector only exposes test_dragoncode/gpt-5.5"
GPT_REF="$(extract_ref "$ARTIFACT_DIR/pi-ui-snapshot.txt" 'button "gpt-5\.5"')"
if [[ -z "$GPT_REF" ]]; then
  record_failure "Could not locate gpt-5.5 model button"
else
  "${AB[@]}" click "$GPT_REF" >/dev/null
  "${AB[@]}" wait 500 >/dev/null
fi
save_command "model-selector" "${AB[@]}" snapshot -i -C
assert_contains "$ARTIFACT_DIR/model-selector.txt" 'Select Model' "model selector"
assert_contains "$ARTIFACT_DIR/model-selector.txt" 'gpt-5.5' "model selector"
assert_contains "$ARTIFACT_DIR/model-selector.txt" 'test_dragoncode' "model selector"
assert_not_contains_any "$ARTIFACT_DIR/model-selector.txt" "model selector" 'azure-openai-responses' 'amazon-bedrock' 'vercel-ai-gateway' 'nextopenai'
CLOSE_REF="$(extract_ref "$ARTIFACT_DIR/model-selector.txt" 'button "Close"')"
if [[ -n "$CLOSE_REF" ]]; then
  "${AB[@]}" click "$CLOSE_REF" >/dev/null
  "${AB[@]}" wait 300 >/dev/null
fi

log "Sending unique Chinese prompt through the UI"
save_command "before-send" "${AB[@]}" snapshot -i -C
INPUT_REF="$(extract_ref "$ARTIFACT_DIR/before-send.txt" 'textbox "Type a message..."')"
SEND_REF="$(extract_ref "$ARTIFACT_DIR/before-send.txt" 'button "Send"')"
if [[ -z "$INPUT_REF" || -z "$SEND_REF" ]]; then
  record_failure "Could not locate chat input or Send button"
else
  "${AB[@]}" fill "$INPUT_REF" "$PROMPT" >/dev/null
  if ! "${AB[@]}" is enabled "$SEND_REF" >"$ARTIFACT_DIR/send-enabled.txt" 2>&1; then
    record_failure "Send button did not become enabled after typing"
  fi
  "${AB[@]}" network requests --clear >/dev/null || true
  "${AB[@]}" errors --clear >/dev/null || true
  "${AB[@]}" console --clear >/dev/null || true
  "${AB[@]}" click "$SEND_REF" >/dev/null
  if ! wait_for_text "$PROMPT" 20; then
    record_failure "User prompt did not appear in the chat transcript"
  fi
  if ! wait_for_occurrences "$EXPECTED_REPLY" 2 45; then
    record_failure "Assistant reply '${EXPECTED_REPLY}' did not appear in the chat transcript"
  fi
fi

save_command "after-send" "${AB[@]}" snapshot -i -C
assert_contains "$ARTIFACT_DIR/body-latest.txt" "$PROMPT" "chat transcript"
assert_contains "$ARTIFACT_DIR/body-latest.txt" "$EXPECTED_REPLY" "chat transcript"
EXPECTED_REPLY_COUNT="$(grep -oF "$EXPECTED_REPLY" "$ARTIFACT_DIR/body-latest.txt" | wc -l | tr -d ' ')"
if ((EXPECTED_REPLY_COUNT < 2)); then
  record_failure "chat transcript: expected assistant reply '${EXPECTED_REPLY}' in addition to the prompt, saw ${EXPECTED_REPLY_COUNT} occurrence(s)"
fi
if grep -Eq 'No API key|model_not_allowed|unauthorized|insufficient_credits|Loading\.\.\.' "$ARTIFACT_DIR/body-latest.txt"; then
  record_failure "Chat transcript contains a blocking error or loading state"
fi

log "Classifying network/API evidence"
save_command "post-send-network" "${AB[@]}" network requests
if grep -Eq 'POST .*/api/chat/stream .* 401' "$ARTIFACT_DIR/post-send-network.txt"; then
  record_failure "Auth layer: /api/chat/stream returned 401; use real E2E credentials or start Pi server with PI_WEB_UI_DEV_AUTH=1 for devAuth smoke"
fi
if grep -Eq 'POST .*/api/chat/stream .* (4|5)[0-9][0-9]' "$ARTIFACT_DIR/post-send-network.txt"; then
  record_failure "SSE chat request returned a 4xx/5xx status"
fi
if ! grep -Eq 'POST .*/api/chat/stream' "$ARTIFACT_DIR/post-send-network.txt"; then
  record_failure "No /api/chat/stream request was observed"
fi

save_command "post-send-errors" "${AB[@]}" errors
if grep -Eq '\\[error\\]|Error:|TypeError|ReferenceError|Unhandled|Failed to load' "$ARTIFACT_DIR/post-send-errors.txt"; then
  record_failure "Browser page errors were observed"
fi

log "Pi Agent browser-use flow completed"
