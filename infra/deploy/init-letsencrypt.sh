#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

DOCKER_PREFIX=()

source "${ROOT_DIR}/infra/deploy/lib/common.sh"
source "${ROOT_DIR}/infra/deploy/lib/docker.sh"
source "${ROOT_DIR}/infra/deploy/lib/env.sh"
source "${ROOT_DIR}/infra/deploy/lib/tls.sh"

main() {
  if [[ ! -f .env ]]; then
    echo ".env file not found. Copy .env.example to .env and set DOMAIN / LETSENCRYPT_EMAIL first."
    exit 1
  fi

  ensure_docker_access
  ensure_letsencrypt_dirs

  local domain email
  domain="$(get_env_value DOMAIN .env)"
  email="$(get_env_value LETSENCRYPT_EMAIL .env)"

  if [[ -z "${domain}" || -z "${email}" ]]; then
    echo "DOMAIN or LETSENCRYPT_EMAIL is empty in .env"
    exit 1
  fi

  request_certificate "${domain}" "${email}"
}

main "$@"
