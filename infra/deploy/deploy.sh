#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"
DOCKER_PREFIX=()

log() {
  printf '\n[deploy] %s\n' "$1"
}

require_command() {
  command -v "$1" >/dev/null 2>&1
}

run_root() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

docker_ok() {
  "${DOCKER_PREFIX[@]}" docker info >/dev/null 2>&1
}

compose() {
  if require_command docker && "${DOCKER_PREFIX[@]}" docker compose version >/dev/null 2>&1; then
    "${DOCKER_PREFIX[@]}" docker compose -f docker-compose.prod.yml "$@"
  else
    "${DOCKER_PREFIX[@]}" docker-compose -f docker-compose.prod.yml "$@"
  fi
}

ensure_apt_package() {
  local package="$1"
  if dpkg -s "${package}" >/dev/null 2>&1; then
    return
  fi

  if [[ -z "${APT_UPDATED:-}" ]]; then
    log "Updating apt package index"
    run_root apt-get update
    APT_UPDATED=1
  fi

  log "Installing package: ${package}"
  run_root apt-get install -y "${package}"
}

install_prerequisites() {
  if ! require_command apt-get; then
    echo "This deploy script currently supports Debian/Ubuntu servers only."
    exit 1
  fi

  ensure_apt_package ca-certificates
  ensure_apt_package curl
  ensure_apt_package openssl
  ensure_apt_package docker.io

  if ! docker compose version >/dev/null 2>&1 && ! require_command docker-compose; then
    if apt-cache show docker-compose-plugin >/dev/null 2>&1; then
      ensure_apt_package docker-compose-plugin
    elif apt-cache show docker-compose-v2 >/dev/null 2>&1; then
      ensure_apt_package docker-compose-v2
    else
      ensure_apt_package docker-compose
    fi
  fi

  log "Enabling and starting Docker daemon"
  run_root systemctl enable --now docker
}

ensure_docker_access() {
  if docker_ok; then
    return
  fi

  if [[ "${EUID}" -ne 0 ]]; then
    log "Adding ${USER} to docker group"
    run_root usermod -aG docker "${USER}" || true
  fi

  if run_root docker info >/dev/null 2>&1; then
    DOCKER_PREFIX=(sudo)
    return
  fi

  echo "Docker is installed but neither the current user nor sudo can access docker."
  exit 1
}

set_env_var() {
  local key="$1"
  local value="$2"
  local escaped_value=""

  escaped_value="$(printf '%s' "${value}" | sed 's/[&|\\]/\\&/g')"

  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" .env
  else
    printf '%s=%s\n' "${key}" "${value}" >> .env
  fi
}

prompt_value() {
  local prompt="$1"
  local default_value="$2"
  local secret="${3:-false}"
  local input=""

  if [[ "${secret}" == "true" ]]; then
    read -r -s -p "${prompt} [leave empty to use generated value]: " input
    printf '\n'
    if [[ -z "${input}" ]]; then
      input="$(openssl rand -hex 24)"
      printf '[deploy] generated secure value\n'
    fi
  else
    read -r -p "${prompt} [${default_value}]: " input
    if [[ -z "${input}" ]]; then
      input="${default_value}"
    fi
  fi

  printf '%s' "${input}"
}

ensure_env_file() {
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi

  local domain current_domain email current_email secret current_secret db_password current_db_password
  current_domain="$(grep '^DOMAIN=' .env | cut -d '=' -f2- || true)"
  current_email="$(grep '^LETSENCRYPT_EMAIL=' .env | cut -d '=' -f2- || true)"
  current_secret="$(grep '^SECRET_KEY=' .env | cut -d '=' -f2- || true)"
  current_db_password="$(grep '^POSTGRES_PASSWORD=' .env | cut -d '=' -f2- || true)"

  domain="$(prompt_value 'Domain for production deploy' "${current_domain:-example.com}")"
  email="$(prompt_value "Email for Let's Encrypt notices" "${current_email:-admin@${domain}}")"

  if [[ -z "${current_secret}" || "${current_secret}" == "change-me" ]]; then
    secret="$(prompt_value 'SECRET_KEY' '' true)"
  else
    secret="${current_secret}"
  fi

  if [[ -z "${current_db_password}" || "${current_db_password}" == "change-me-db-password" ]]; then
    db_password="$(prompt_value 'POSTGRES_PASSWORD' '' true)"
  else
    db_password="${current_db_password}"
  fi

  set_env_var DOMAIN "${domain}"
  set_env_var LETSENCRYPT_EMAIL "${email}"
  set_env_var SECRET_KEY "${secret}"
  set_env_var POSTGRES_DB "$(grep '^POSTGRES_DB=' .env | cut -d '=' -f2- || printf 'cyber_sim')"
  set_env_var POSTGRES_USER "$(grep '^POSTGRES_USER=' .env | cut -d '=' -f2- || printf 'cyber')"
  set_env_var POSTGRES_PASSWORD "${db_password}"
  set_env_var FRONTEND_ORIGIN "https://${domain}"
  set_env_var NEXT_PUBLIC_API_URL "https://${domain}"
  set_env_var NEXT_PUBLIC_WS_URL "wss://${domain}"
}

ensure_letsencrypt_dirs() {
  mkdir -p infra/letsencrypt/conf/live
  mkdir -p infra/letsencrypt/conf/archive
  mkdir -p infra/letsencrypt/conf/renewal
  mkdir -p infra/letsencrypt/www
}

ensure_bootstrap_certificate() {
  local domain="$1"
  local live_dir="infra/letsencrypt/conf/live/${domain}"

  if [[ -f "${live_dir}/fullchain.pem" && -f "${live_dir}/privkey.pem" ]]; then
    return
  fi

  log "Creating temporary self-signed certificate for nginx bootstrap"
  mkdir -p "${live_dir}"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "${live_dir}/privkey.pem" \
    -out "${live_dir}/fullchain.pem" \
    -subj "/CN=${domain}" >/dev/null 2>&1
  touch "${live_dir}/.bootstrap"
}

ensure_certificate() {
  local domain="$1"
  local live_dir="infra/letsencrypt/conf/live/${domain}"
  local renewal_file="infra/letsencrypt/conf/renewal/${domain}.conf"

  if [[ -f "${live_dir}/fullchain.pem" && -f "${live_dir}/privkey.pem" && -f "${renewal_file}" ]]; then
    log "Existing Let's Encrypt certificate found for ${domain}"
    return
  fi

  ensure_bootstrap_certificate "${domain}"

  log "Starting nginx for ACME challenge"
  compose up -d nginx

  if [[ -f "${live_dir}/.bootstrap" ]]; then
    rm -rf "${live_dir}"
    rm -rf "infra/letsencrypt/conf/archive/${domain}"
    rm -f "${renewal_file}"
  fi

  log "Requesting Let's Encrypt certificate for ${domain}"
  ./infra/deploy/init-letsencrypt.sh
}

deploy_stack() {
  log "Starting production stack"
  compose up --build -d
}

verify_deploy() {
  local domain="$1"
  log "Verifying deployed services"
  curl -fsS "http://127.0.0.1:80" >/dev/null 2>&1 || true
  curl -kfsS "https://${domain}/api/health" >/dev/null
}

open_site() {
  local domain="$1"
  local url="https://${domain}"
  log "Deployment completed: ${url}"

  if require_command xdg-open; then
    xdg-open "${url}" >/dev/null 2>&1 || true
  fi
}

main() {
  install_prerequisites
  ensure_docker_access
  ensure_env_file
  ensure_letsencrypt_dirs

  local domain
  domain="$(grep '^DOMAIN=' .env | cut -d '=' -f2-)"

  ensure_certificate "${domain}"
  deploy_stack
  verify_deploy "${domain}"
  open_site "${domain}"
}

main "$@"
