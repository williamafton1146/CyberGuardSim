#!/usr/bin/env bash

get_env_value() {
  local key="$1"
  local env_file="${2:-.env}"

  if [[ ! -f "${env_file}" ]]; then
    return 1
  fi

  grep "^${key}=" "${env_file}" | cut -d '=' -f2- || true
}

set_env_var() {
  local key="$1"
  local value="$2"
  local tmp_file=""
  local found="false"

  ensure_file_writable ".env"
  tmp_file="$(mktemp)"

  if grep -q "^${key}=" .env 2>/dev/null; then
    while IFS= read -r line || [[ -n "${line}" ]]; do
      if [[ -n "${line}" && "${line%%=*}" == "${key}" ]]; then
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

validate_env_file() {
  local line_number=0
  local line=""

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line_number=$((line_number + 1))

    if [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]]; then
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
  current_domain="$(get_env_value DOMAIN .env || true)"
  current_email="$(get_env_value LETSENCRYPT_EMAIL .env || true)"
  current_secret="$(get_env_value SECRET_KEY .env || true)"
  current_db_password="$(get_env_value POSTGRES_PASSWORD .env || true)"

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

  set_env_var ENVIRONMENT "production"
  set_env_var DOMAIN "${domain}"
  set_env_var LETSENCRYPT_EMAIL "${email}"
  set_env_var SECRET_KEY "${secret}"
  set_env_var POSTGRES_DB "$(get_env_value POSTGRES_DB .env || printf 'cyber_sim')"
  set_env_var POSTGRES_USER "$(get_env_value POSTGRES_USER .env || printf 'cyber')"
  set_env_var POSTGRES_PASSWORD "${db_password}"
  set_env_var DATABASE_URL "postgresql+psycopg://$(get_env_value POSTGRES_USER .env):${db_password}@db:5432/$(get_env_value POSTGRES_DB .env)"
  set_env_var REDIS_URL "redis://redis:6379/0"
  set_env_var FRONTEND_ORIGIN "https://${domain}"
  set_env_var NEXT_PUBLIC_API_URL "https://${domain}"
  set_env_var NEXT_PUBLIC_WS_URL "wss://${domain}"
  set_env_var ADMIN_USERNAME "Admin"
  ADMIN_BOOTSTRAP_PASSWORD_VALUE="$(generate_admin_password)"
  set_env_var ADMIN_BOOTSTRAP_PASSWORD "${ADMIN_BOOTSTRAP_PASSWORD_VALUE}"
  validate_env_file
}
