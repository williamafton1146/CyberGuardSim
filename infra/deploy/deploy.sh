#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

DOCKER_PREFIX=()
ADMIN_BOOTSTRAP_PASSWORD_VALUE=""

source "${ROOT_DIR}/infra/deploy/lib/common.sh"
source "${ROOT_DIR}/infra/deploy/lib/docker.sh"
source "${ROOT_DIR}/infra/deploy/lib/env.sh"
source "${ROOT_DIR}/infra/deploy/lib/tls.sh"
source "${ROOT_DIR}/infra/deploy/lib/cleanup.sh"
source "${ROOT_DIR}/infra/deploy/lib/swap.sh"
source "${ROOT_DIR}/infra/deploy/lib/health.sh"

run_auth_smoke_test() {
  local domain="$1"
  log "Running auth smoke test against production domain"
  SMOKE_RESOLVE_IP=127.0.0.1 "${ROOT_DIR}/infra/deploy/smoke-auth.sh" "https://${domain}"
}

main() {
  install_prerequisites
  ensure_docker_access
  ensure_env_file
  ensure_letsencrypt_dirs
  preflight_compose
  run_safe_cleanup_if_running
  ensure_adaptive_swap

  local domain email
  domain="$(get_env_value DOMAIN .env)"
  email="$(get_env_value LETSENCRYPT_EMAIL .env)"

  if ! ensure_certificate "${domain}" "${email}"; then
    print_compose_diagnostics
    echo "Let's Encrypt bootstrap failed."
    exit 1
  fi

  deploy_stack
  verify_deploy "${domain}"

  if ! run_auth_smoke_test "${domain}"; then
    print_compose_diagnostics
    echo "Post-deploy auth smoke test failed."
    exit 1
  fi

  post_deploy_cleanup
  open_site "${domain}"
}

main "$@"
