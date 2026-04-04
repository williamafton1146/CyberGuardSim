#!/usr/bin/env bash

docker_ok() {
  "${DOCKER_PREFIX[@]}" docker info >/dev/null 2>&1
}

compose_base() {
  if require_command docker && "${DOCKER_PREFIX[@]}" docker compose version >/dev/null 2>&1; then
    "${DOCKER_PREFIX[@]}" docker compose -f docker-compose.yml "$@"
  else
    "${DOCKER_PREFIX[@]}" docker-compose -f docker-compose.yml "$@"
  fi
}

compose() {
  if require_command docker && "${DOCKER_PREFIX[@]}" docker compose version >/dev/null 2>&1; then
    "${DOCKER_PREFIX[@]}" docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"
  else
    "${DOCKER_PREFIX[@]}" docker-compose -f docker-compose.yml -f docker-compose.prod.yml "$@"
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
