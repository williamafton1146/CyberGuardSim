#!/usr/bin/env bash

project_stack_running() {
  local services=""

  services="$(compose ps --status running --services 2>/dev/null || true)"
  grep -Eq '^(api|web|nginx)$' <<<"${services}"
}

run_safe_cleanup_if_running() {
  if ! project_stack_running; then
    return
  fi

  log "Detected running project stack; cleaning safe project/system artifacts before rebuild"
  bash "${ROOT_DIR}/infra/deploy/cleanup-system-artifacts.sh" || true
}

post_deploy_cleanup() {
  log "Cleaning temporary deploy artifacts and safe system caches"
  bash "${ROOT_DIR}/infra/deploy/cleanup-system-artifacts.sh" || true
}
