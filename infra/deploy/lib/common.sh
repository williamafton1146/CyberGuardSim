#!/usr/bin/env bash

if [[ -z "${ROOT_DIR:-}" ]]; then
  ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
fi

if ! declare -p DOCKER_PREFIX >/dev/null 2>&1; then
  DOCKER_PREFIX=()
fi

PROJECT_NAME="${PROJECT_NAME:-$(basename "${ROOT_DIR}" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')}"
DEPLOY_STATE_FILE="${DEPLOY_STATE_FILE:-.deploy.production.ready}"
LOCAL_OWNER="${LOCAL_OWNER:-${SUDO_USER:-${USER:-root}}}"

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
