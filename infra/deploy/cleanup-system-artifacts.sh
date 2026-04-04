#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

DOCKER_PREFIX=()
AGGRESSIVE_CLEANUP="${1:-}"

source "${ROOT_DIR}/infra/deploy/lib/common.sh"
source "${ROOT_DIR}/infra/deploy/lib/docker.sh"

echo "[cleanup-system] Cleaning project temp artifacts"
bash "${ROOT_DIR}/infra/deploy/cleanup-temp.sh" || true

ensure_docker_access

if docker_ok; then
  echo "[cleanup-system] Removing stopped containers"
  "${DOCKER_PREFIX[@]}" docker container prune -f >/dev/null || true

  echo "[cleanup-system] Removing dangling images"
  "${DOCKER_PREFIX[@]}" docker image prune -f >/dev/null || true

  echo "[cleanup-system] Removing unused networks"
  "${DOCKER_PREFIX[@]}" docker network prune -f >/dev/null || true

  if [[ "${AGGRESSIVE_CLEANUP}" == "--aggressive" ]]; then
    echo "[cleanup-system] Removing unused build cache"
    "${DOCKER_PREFIX[@]}" docker builder prune -af >/dev/null || true
  fi
fi

if command -v apt-get >/dev/null 2>&1; then
  echo "[cleanup-system] Cleaning apt package cache"
  run_root apt-get clean >/dev/null || true
fi

echo "[cleanup-system] Done"
