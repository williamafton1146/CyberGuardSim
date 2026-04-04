#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"
DOCKER_PREFIX=()
PROJECT_NAME="$(basename "${ROOT_DIR}" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')"
DEPLOY_STATE_FILE=".deploy.production.ready"
LOCAL_OWNER="${SUDO_USER:-${USER}}"
ADMIN_BOOTSTRAP_PASSWORD_VALUE=""

log() {
  printf '\n[deploy] %s\n' "$1"
}

log_stderr() {
  printf '\n[deploy] %s\n' "$1" >&2
}

require_command() {
  command -v "$1" >/dev/null 2>&1
}

read_from_tty() {
  local __var_name="$1"
  shift
  local read_value=""
  local -n out_var="${__var_name}"

  if [[ ! -r /dev/tty ]]; then
    echo "Interactive input requires a TTY." >&2
    exit 1
  fi

  read "$@" read_value < /dev/tty
  out_var="${read_value}"
}

prompt_yes_no() {
  local prompt="$1"
  local default_answer="${2:-y}"
  local suffix="[Y/n]"
  local input=""

  if [[ "${default_answer}" == "n" ]]; then
    suffix="[y/N]"
  fi

  read_from_tty input -r -p "${prompt} ${suffix}: "
  input="${input,,}"

  if [[ -z "${input}" ]]; then
    input="${default_answer}"
  fi

  [[ "${input}" == "y" || "${input}" == "yes" ]]
}

is_valid_domain() {
  local domain="$1"
  [[ "${domain}" =~ ^[A-Za-z0-9.-]+$ ]] && [[ "${domain}" == *.* ]] && [[ "${domain}" != .* ]] && [[ "${domain}" != *. ]]
}

is_valid_email() {
  local email="$1"
  [[ "${email}" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]
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

ensure_path_writable() {
  local target_path="$1"

  mkdir -p "${target_path}" 2>/dev/null || true

  if [[ -w "${target_path}" ]]; then
    return
  fi

  if [[ "${EUID}" -eq 0 ]]; then
    return
  fi

  run_root mkdir -p "${target_path}"
  run_root chown -R "${LOCAL_OWNER}:${LOCAL_OWNER}" "${target_path}"
}

ensure_file_writable() {
  local target_file="$1"
  local target_dir
  target_dir="$(dirname "${target_file}")"

  ensure_path_writable "${target_dir}"

  if [[ -f "${target_file}" ]]; then
    if [[ -w "${target_file}" ]]; then
      return
    fi
    if [[ "${EUID}" -ne 0 ]]; then
      run_root chown "${LOCAL_OWNER}:${LOCAL_OWNER}" "${target_file}"
    fi
    return
  fi

  : > "${target_file}" 2>/dev/null || run_root touch "${target_file}"
  if [[ "${EUID}" -ne 0 ]]; then
    run_root chown "${LOCAL_OWNER}:${LOCAL_OWNER}" "${target_file}"
  fi
}

postgres_volume_exists() {
  local volume_name="${PROJECT_NAME}_postgres_data"

  if ! docker_ok; then
    return 1
  fi

  "${DOCKER_PREFIX[@]}" docker volume inspect "${volume_name}" >/dev/null 2>&1
}

reset_postgres_volume() {
  local volume_name="${PROJECT_NAME}_postgres_data"

  log "Stopping running stack before PostgreSQL reset"
  compose down --remove-orphans >/dev/null 2>&1 || true

  log "Removing PostgreSQL volume ${volume_name}"
  "${DOCKER_PREFIX[@]}" docker volume rm -f "${volume_name}" >/dev/null
  rm -f "${DEPLOY_STATE_FILE}"
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
  local tmp_file=""
  local found="false"
  tmp_file="$(mktemp)"

  if grep -q "^${key}=" .env; then
    while IFS= read -r line || [[ -n "${line}" ]]; do
      if [[ "${line%%=*}" == "${key}" ]]; then
        printf '%s=%s\n' "${key}" "${value}" >> "${tmp_file}"
        found="true"
      else
        printf '%s\n' "${line}" >> "${tmp_file}"
      fi
    done < .env

    if [[ "${found}" != "true" ]]; then
      printf '%s=%s\n' "${key}" "${value}" >> "${tmp_file}"
    fi

    mv "${tmp_file}" .env
  else
    rm -f "${tmp_file}"
    printf '%s=%s\n' "${key}" "${value}" >> .env
  fi
}

prompt_value() {
  local prompt="$1"
  local default_value="$2"
  local secret="${3:-false}"
  local input=""

  if [[ "${secret}" == "true" ]]; then
    read_from_tty input -r -s -p "${prompt} [leave empty to use generated value]: "
    printf '\n' >&2
    if [[ -z "${input}" ]]; then
      input="$(openssl rand -hex 24)"
      log_stderr "generated secure value for ${prompt}"
    fi
  else
    read_from_tty input -r -p "${prompt} [${default_value}]: "
    if [[ -z "${input}" ]]; then
      input="${default_value}"
    fi
  fi

  printf '%s' "${input}"
}

generate_admin_password() {
  local generated=""

  while [[ ${#generated} -lt 12 ]]; do
    generated="$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 12)"
  done

  printf '%s' "${generated}"
}

validate_env_file() {
  local line_number=0
  local line=""

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line_number=$((line_number + 1))

    if [[ -z "${line}" ]]; then
      continue
    fi

    if [[ "${line}" != *=* ]]; then
      echo "Invalid .env line ${line_number}: expected KEY=value format"
      echo "Line content: ${line}"
      exit 1
    fi

    if [[ "${line%%=*}" =~ [[:space:]] ]]; then
      echo "Invalid .env line ${line_number}: key cannot contain spaces"
      echo "Line content: ${line}"
      exit 1
    fi
  done < .env
}

ensure_env_file() {
  local env_created="false"
  local postgres_volume_present="false"
  local require_db_reconciliation="false"

  ensure_file_writable ".env"

  if postgres_volume_exists; then
    postgres_volume_present="true"
  fi

  if [[ ! -s .env ]]; then
    cp .env.example .env
    env_created="true"
  fi

  if [[ "${postgres_volume_present}" == "true" && ! -f "${DEPLOY_STATE_FILE}" ]]; then
    require_db_reconciliation="true"
  fi

  local domain current_domain email current_email secret current_secret db_password current_db_password
  current_domain="$(grep '^DOMAIN=' .env | cut -d '=' -f2- || true)"
  current_email="$(grep '^LETSENCRYPT_EMAIL=' .env | cut -d '=' -f2- || true)"
  current_secret="$(grep '^SECRET_KEY=' .env | cut -d '=' -f2- || true)"
  current_db_password="$(grep '^POSTGRES_PASSWORD=' .env | cut -d '=' -f2- || true)"

  domain="$(prompt_value 'Domain for production deploy' "${current_domain:-example.com}")"
  email="$(prompt_value "Email for Let's Encrypt notices" "${current_email:-admin@${domain}}")"

  if ! is_valid_domain "${domain}"; then
    echo "Invalid domain: ${domain}"
    exit 1
  fi

  if ! is_valid_email "${email}"; then
    echo "Invalid email: ${email}"
    exit 1
  fi

  if [[ -z "${current_secret}" || "${current_secret}" == "change-me" ]]; then
    secret="$(prompt_value 'SECRET_KEY' '' true)"
  else
    secret="${current_secret}"
  fi

  if [[ "${postgres_volume_present}" == "true" && "${require_db_reconciliation}" == "true" ]]; then
    echo "Detected existing PostgreSQL volume (${PROJECT_NAME}_postgres_data)."

    if [[ -n "${current_db_password}" && "${current_db_password}" != "change-me-db-password" ]]; then
      if prompt_yes_no "Use POSTGRES_PASSWORD from current .env for the existing database?" "n"; then
        db_password="${current_db_password}"
      elif prompt_yes_no "Enter the current POSTGRES_PASSWORD for the existing database manually?" "y"; then
        read_from_tty db_password -r -s -p "POSTGRES_PASSWORD for existing database: "
        printf '\n' >&2
        if [[ -z "${db_password}" ]]; then
          echo "POSTGRES_PASSWORD is required when reusing an existing PostgreSQL volume."
          if [[ "${env_created}" == "true" ]]; then
            rm -f .env
          fi
          exit 1
        fi
      else
        if ! prompt_yes_no "Reset PostgreSQL volume and lose existing database data?" "n"; then
          echo "Deployment cancelled to avoid accidental data loss."
          if [[ "${env_created}" == "true" ]]; then
            rm -f .env
          fi
          exit 1
        fi

        reset_postgres_volume
        db_password="$(prompt_value 'POSTGRES_PASSWORD' '' true)"
      fi
    else
      if prompt_yes_no "Enter the current POSTGRES_PASSWORD for the existing database manually?" "y"; then
        read_from_tty db_password -r -s -p "POSTGRES_PASSWORD for existing database: "
        printf '\n' >&2
        if [[ -z "${db_password}" ]]; then
          echo "POSTGRES_PASSWORD is required when reusing an existing PostgreSQL volume."
          if [[ "${env_created}" == "true" ]]; then
            rm -f .env
          fi
          exit 1
        fi
      else
        if ! prompt_yes_no "Reset PostgreSQL volume and lose existing database data?" "n"; then
          echo "Deployment cancelled to avoid accidental data loss."
          if [[ "${env_created}" == "true" ]]; then
            rm -f .env
          fi
          exit 1
        fi

        reset_postgres_volume
        db_password="$(prompt_value 'POSTGRES_PASSWORD' '' true)"
      fi
    fi
  elif [[ -z "${current_db_password}" || "${current_db_password}" == "change-me-db-password" ]]; then
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
  set_env_var ADMIN_USERNAME "Admin"
  ADMIN_BOOTSTRAP_PASSWORD_VALUE="$(generate_admin_password)"
  set_env_var ADMIN_BOOTSTRAP_PASSWORD "${ADMIN_BOOTSTRAP_PASSWORD_VALUE}"
  validate_env_file
}

preflight_compose() {
  log "Validating docker-compose.prod.yml with current .env"
  compose config >/dev/null
}

ensure_letsencrypt_dirs() {
  ensure_path_writable "infra/letsencrypt/conf/live"
  ensure_path_writable "infra/letsencrypt/conf/archive"
  ensure_path_writable "infra/letsencrypt/conf/renewal"
  ensure_path_writable "infra/letsencrypt/www"
}

cleanup_bootstrap_nginx() {
  compose --profile bootstrap stop nginx_bootstrap >/dev/null 2>&1 || true
  compose --profile bootstrap rm -sf nginx_bootstrap >/dev/null 2>&1 || true
}

print_compose_diagnostics() {
  log "Collecting docker-compose diagnostics"
  compose ps || true
  compose logs --tail=120 db api web nginx nginx_bootstrap certbot || true
}

ensure_certificate() {
  local domain="$1"
  local live_dir="infra/letsencrypt/conf/live/${domain}"
  local renewal_file="infra/letsencrypt/conf/renewal/${domain}.conf"

  if [[ -f "${live_dir}/fullchain.pem" && -f "${live_dir}/privkey.pem" ]]; then
    if [[ -f "${renewal_file}" ]]; then
      log "Existing Let's Encrypt certificate found for ${domain}"
    else
      log "Existing TLS certificate files found for ${domain}; reusing current certificate without requesting a new one"
    fi
    return
  fi

  log "Starting bootstrap nginx for ACME challenge"
  if ! compose --profile bootstrap up -d --no-deps nginx_bootstrap; then
    print_compose_diagnostics
    echo "Failed to start bootstrap nginx for certificate issuance."
    exit 1
  fi

  log "Requesting Let's Encrypt certificate for ${domain}"
  if ! ./infra/deploy/init-letsencrypt.sh; then
    print_compose_diagnostics
    echo "Let's Encrypt bootstrap failed."
    exit 1
  fi
}

deploy_stack() {
  log "Starting production stack"
  cleanup_bootstrap_nginx
  if ! compose up --build -d; then
    print_compose_diagnostics
    echo "Production stack failed to start."
    exit 1
  fi

  log "Reloading nginx to refresh upstream targets after container recreation"
  if ! compose up -d --force-recreate --no-deps nginx; then
    print_compose_diagnostics
    echo "Failed to recreate nginx after app update."
    exit 1
  fi
}

verify_deploy() {
  local domain="$1"
  local attempt=1
  local max_attempts=18

  log "Verifying deployed services"

  while (( attempt <= max_attempts )); do
    if curl -kfsS "https://${domain}/api/health" >/dev/null; then
      return
    fi

    sleep 5
    attempt=$((attempt + 1))
  done

  echo "Deployment verification failed: https://${domain}/api/health did not become ready in time."
  echo "Check logs with: docker-compose -f docker-compose.prod.yml logs --tail=200 nginx api web"
  print_compose_diagnostics
  exit 1
}

post_deploy_cleanup() {
  log "Cleaning temporary deploy artifacts and safe system caches"
  bash ./infra/deploy/cleanup-system-artifacts.sh || true
}

smoke_test_registration() {
  local domain="$1"
  local nonce
  local email
  local password="SmokePass123!"
  local register_response=""
  local login_response=""
  local token=""

  nonce="$(date +%s)-$(openssl rand -hex 3)"
  email="smoke-${nonce}@example.com"

  log "Running auth smoke test against production domain"

  register_response="$(
    curl -kfsS "https://${domain}/auth/register" \
      -H "Content-Type: application/json" \
      --data "{\"email\":\"${email}\",\"password\":\"${password}\",\"display_name\":\"Deploy Smoke\"}"
  )"

  token="$(printf '%s' "${register_response}" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  if [[ -z "${token}" ]]; then
    echo "Smoke test failed: register response did not contain access_token."
    echo "Response: ${register_response}"
    print_compose_diagnostics
    exit 1
  fi

  curl -kfsS "https://${domain}/users/me" \
    -H "Authorization: Bearer ${token}" >/dev/null

  login_response="$(
    curl -kfsS "https://${domain}/auth/login" \
      -H "Content-Type: application/json" \
      --data "{\"email\":\"${email}\",\"password\":\"${password}\"}"
  )"

  token="$(printf '%s' "${login_response}" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  if [[ -z "${token}" ]]; then
    echo "Smoke test failed: login response did not contain access_token."
    echo "Response: ${login_response}"
    print_compose_diagnostics
    exit 1
  fi

  curl -kfsS "https://${domain}/users/me" \
    -H "Authorization: Bearer ${token}" >/dev/null
}

open_site() {
  local domain="$1"
  local url="https://${domain}"
  touch "${DEPLOY_STATE_FILE}"

  if [[ "${EUID}" -ne 0 ]]; then
    run_root chown "${LOCAL_OWNER}:${LOCAL_OWNER}" "${DEPLOY_STATE_FILE}" >/dev/null 2>&1 || true
  fi

  log "Deployment completed: ${url}"
  if [[ -n "${ADMIN_BOOTSTRAP_PASSWORD_VALUE}" ]]; then
    printf '\n[deploy] Admin login: Admin\n'
    printf '[deploy] Admin password: %s\n' "${ADMIN_BOOTSTRAP_PASSWORD_VALUE}"
  fi

  if require_command xdg-open; then
    xdg-open "${url}" >/dev/null 2>&1 || true
  fi
}

main() {
  install_prerequisites
  ensure_docker_access
  ensure_env_file
  ensure_letsencrypt_dirs
  preflight_compose

  local domain
  domain="$(grep '^DOMAIN=' .env | cut -d '=' -f2-)"

  ensure_certificate "${domain}"
  deploy_stack
  verify_deploy "${domain}"
  smoke_test_registration "${domain}"
  post_deploy_cleanup
  open_site "${domain}"
}

main "$@"
