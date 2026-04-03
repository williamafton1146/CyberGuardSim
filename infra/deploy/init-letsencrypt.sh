#!/usr/bin/env bash
set -euo pipefail
DOCKER_PREFIX=()

docker_ok() {
  "${DOCKER_PREFIX[@]}" docker info >/dev/null 2>&1
}

run_root() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

compose() {
  if docker_ok && "${DOCKER_PREFIX[@]}" docker compose version >/dev/null 2>&1; then
    "${DOCKER_PREFIX[@]}" docker compose -f docker-compose.prod.yml "$@"
  else
    "${DOCKER_PREFIX[@]}" docker-compose -f docker-compose.prod.yml "$@"
  fi
}

if [[ ! -f .env ]]; then
  echo ".env file not found. Copy .env.example to .env and set DOMAIN / LETSENCRYPT_EMAIL first."
  exit 1
fi

DOMAIN="$(grep '^DOMAIN=' .env | cut -d '=' -f2-)"
EMAIL="$(grep '^LETSENCRYPT_EMAIL=' .env | cut -d '=' -f2-)"
BOOTSTRAP_MARKER="infra/letsencrypt/conf/live/${DOMAIN}/.bootstrap"
ARCHIVE_DIR="infra/letsencrypt/conf/archive/${DOMAIN}"

if [[ -z "${DOMAIN}" || -z "${EMAIL}" ]]; then
  echo "DOMAIN or LETSENCRYPT_EMAIL is empty in .env"
  exit 1
fi

if ! docker_ok && run_root docker info >/dev/null 2>&1; then
  DOCKER_PREFIX=(sudo)
fi

compose up -d --no-deps nginx_bootstrap
compose run --rm --entrypoint certbot certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email

if [[ -f "${BOOTSTRAP_MARKER}" ]]; then
  rm -f "${BOOTSTRAP_MARKER}"
fi

if [[ -d "${ARCHIVE_DIR}" && ! -f "infra/letsencrypt/conf/renewal/${DOMAIN}.conf" ]]; then
  rm -rf "${ARCHIVE_DIR}"
fi

compose stop nginx_bootstrap >/dev/null 2>&1 || true
compose rm -sf nginx_bootstrap >/dev/null 2>&1 || true
