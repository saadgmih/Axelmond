#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${HOME}/domains/axelmond.com/public_html/.builds/config/.env"
RESTART_FILE="${HOME}/domains/axelmond.com/nodejs/tmp/restart.txt"

append_if_missing() {
  local key="$1"
  local value="$2"
  if ! grep -q "^${key}=" "$ENV_FILE"; then
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

append_if_missing "HEALTH_CHECK_TOKEN" "$1"
append_if_missing "CACHE_MAX_ENTRIES" "100"
append_if_missing "CACHE_MAX_VALUE_BYTES" "512000"
append_if_missing "AUTH_USER_CACHE_MAX_ENTRIES" "200"
append_if_missing "PERF_MONITOR_INTERVAL_MS" "120000"

grep -E '^(HEALTH_CHECK_TOKEN|CACHE_MAX_ENTRIES|CACHE_MAX_VALUE_BYTES|AUTH_USER_CACHE_MAX_ENTRIES|PERF_MONITOR_INTERVAL_MS)=' "$ENV_FILE"
date +%s > "$RESTART_FILE"
echo "restart_triggered"
