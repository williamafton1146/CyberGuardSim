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

cleanup_bootstrap_nginx() {
  compose --profile bootstrap stop nginx_bootstrap >/dev/null 2>&1 || true
  compose --profile bootstrap rm -sf nginx_bootstrap >/dev/null 2>&1 || true
}

if [[ ! -f .env ]]; then
  echo ".env file not found. Copy .env.example to .env and set DOMAIN / LETSENCRYPT_EMAIL first."
  exit 1
fi

DOMAIN="$(grep '^DOMAIN=' .env | cut -d '=' -f2-)"
EMAIL="$(grep '^LETSENCRYPT_EMAIL=' .env | cut -d '=' -f2-)"
BOOTSTRAP_MARKER="infra/letsencrypt/conf/live/${DOMAIN}/.bootstrap"
LIVE_DIR="infra/letsencrypt/conf/live/${DOMAIN}"

if [[ -z "${DOMAIN}" || -z "${EMAIL}" ]]; then
  echo "DOMAIN or LETSENCRYPT_EMAIL is empty in .env"
  exit 1
fi

if ! docker_ok && run_root docker info >/dev/null 2>&1; then
  DOCKER_PREFIX=(sudo)
fi

if [[ -f "${LIVE_DIR}/fullchain.pem" && -f "${LIVE_DIR}/privkey.pem" ]]; then
  echo "Existing certificate files detected for ${DOMAIN}; skipping new Let's Encrypt request."
  exit 0
fi

trap cleanup_bootstrap_nginx EXIT

compose --profile bootstrap up -d --no-deps nginx_bootstrap
compose run --rm --entrypoint certbot certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "${DOMAIN}" \
  --cert-name "${DOMAIN}" \
  --keep-until-expiring \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email

if [[ -f "${BOOTSTRAP_MARKER}" ]]; then
  rm -f "${BOOTSTRAP_MARKER}"
fi
