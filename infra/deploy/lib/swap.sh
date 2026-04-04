#!/usr/bin/env bash

SWAPFILE_PATH="${SWAPFILE_PATH:-/swapfile-cybersim}"

_bytes_to_mib() {
  local bytes="${1:-0}"
  echo $((bytes / 1024 / 1024))
}

get_total_memory_mib() {
  awk '/MemTotal:/ {print int($2 / 1024)}' /proc/meminfo
}

get_total_swap_mib() {
  awk '/SwapTotal:/ {print int($2 / 1024)}' /proc/meminfo
}

get_swapfile_size_mib() {
  if [[ ! -f "${SWAPFILE_PATH}" ]]; then
    echo 0
    return
  fi

  local size_bytes
  size_bytes="$(stat -c '%s' "${SWAPFILE_PATH}" 2>/dev/null || echo 0)"
  echo $((size_bytes / 1024 / 1024))
}

calculate_target_swap_mib() {
  local mem_mib="$1"

  if (( mem_mib >= 8192 )); then
    echo 0
    return
  fi

  if (( mem_mib < 2048 )); then
    echo 2048
    return
  fi

  if (( mem_mib > 4096 )); then
    echo 4096
    return
  fi

  echo "${mem_mib}"
}

ensure_fstab_swap_entry() {
  if grep -qF "${SWAPFILE_PATH} none swap sw 0 0" /etc/fstab 2>/dev/null; then
    return
  fi

  printf '%s\n' "${SWAPFILE_PATH} none swap sw 0 0" | run_root tee -a /etc/fstab >/dev/null
}

create_or_resize_swapfile() {
  local size_mib="$1"

  if [[ -f "${SWAPFILE_PATH}" ]]; then
    run_root swapoff "${SWAPFILE_PATH}" >/dev/null 2>&1 || true
  fi

  if run_root fallocate -l "${size_mib}M" "${SWAPFILE_PATH}" >/dev/null 2>&1; then
    :
  else
    run_root dd if=/dev/zero of="${SWAPFILE_PATH}" bs=1M count="${size_mib}" status=none || return 1
  fi

  run_root chmod 600 "${SWAPFILE_PATH}" || return 1
  run_root mkswap "${SWAPFILE_PATH}" >/dev/null || return 1
  run_root swapon "${SWAPFILE_PATH}" || return 1
  ensure_fstab_swap_entry || return 1
}

ensure_adaptive_swap() {
  local mem_mib current_swap_mib target_swap_mib current_swapfile_mib non_project_swap_mib desired_swapfile_mib

  if ! require_command swapon || ! require_command mkswap; then
    log_stderr "Skipping adaptive swap: required swap tools are unavailable"
    return 0
  fi

  mem_mib="$(get_total_memory_mib)"
  current_swap_mib="$(get_total_swap_mib)"
  target_swap_mib="$(calculate_target_swap_mib "${mem_mib}")"

  if (( target_swap_mib == 0 )); then
    log "Adaptive swap not required: detected ${mem_mib} MiB RAM"
    return 0
  fi

  if (( current_swap_mib >= target_swap_mib )); then
    log "Adaptive swap already sufficient: ${current_swap_mib} MiB present for ${mem_mib} MiB RAM"
    return 0
  fi

  current_swapfile_mib="$(get_swapfile_size_mib)"
  non_project_swap_mib=$((current_swap_mib - current_swapfile_mib))
  desired_swapfile_mib=$((target_swap_mib - non_project_swap_mib))

  if (( desired_swapfile_mib <= 0 )); then
    log "Adaptive swap already satisfied by existing system swap"
    return 0
  fi

  log "Ensuring adaptive swap: RAM=${mem_mib} MiB, current swap=${current_swap_mib} MiB, target swap=${target_swap_mib} MiB"

  if ! create_or_resize_swapfile "${desired_swapfile_mib}"; then
    log_stderr "Adaptive swap setup failed; continuing deployment without extra swap"
    return 0
  fi

  log "Adaptive swap ready: ${SWAPFILE_PATH} sized to ${desired_swapfile_mib} MiB"
}
