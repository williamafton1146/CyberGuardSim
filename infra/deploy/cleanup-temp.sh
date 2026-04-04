#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

shopt -s nullglob

tmp_targets=(/tmp/cybersim-* /tmp/cyberguard*)
repo_targets=(
  "cybersec.db"
  "test_cybersim.db"
  "apps/api/cybersec.db"
  "apps/api/test_cybersim.db"
  "apps/web/.next"
  "apps/web/tsconfig.tsbuildinfo"
  "apps/api/.pytest_cache"
  ".pytest_cache"
)

removed=()

for target in "${tmp_targets[@]}"; do
  if [[ -e "${target}" ]]; then
    rm -rf "${target}"
    removed+=("${target}")
  fi
done

for target in "${repo_targets[@]}"; do
  if [[ -e "${target}" ]]; then
    rm -rf "${target}"
    removed+=("${ROOT_DIR}/${target}")
  fi
done

if [[ "${#removed[@]}" -eq 0 ]]; then
  echo "[cleanup-temp] Нечего удалять"
  exit 0
fi

echo "[cleanup-temp] Удалено:"
printf ' - %s\n' "${removed[@]}"
