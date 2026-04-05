#!/usr/bin/env bash

preflight_compose() {
  log "Validating local docker-compose.yml"
  compose_base config >/dev/null

  log "Validating production override stack"
  compose config >/dev/null
}

print_compose_diagnostics() {
  log "Collecting docker-compose diagnostics"
  compose ps || true
  compose logs --tail=120 db redis api web nginx nginx_bootstrap certbot || true
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
    if curl -kfsS \
      --resolve "${domain}:443:127.0.0.1" \
      -H "Host: ${domain}" \
      "https://${domain}/api/health" >/dev/null; then
      return
    fi

    sleep 5
    attempt=$((attempt + 1))
  done

  echo "Deployment verification failed: local nginx proxy did not expose https://${domain}/api/health in time."
  echo "Check logs with: docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=200 nginx api web"
  print_compose_diagnostics
  exit 1
}

admin_bootstrap_password_state() {
  if [[ -z "${ADMIN_BOOTSTRAP_PASSWORD_VALUE:-}" ]]; then
    printf 'missing'
    return
  fi

  compose exec -T api python - <<'PY' 2>/dev/null || printf 'unknown'
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.passwords import password_weakness_reason
from app.core.security import verify_password
from app.models.user import User

db = SessionLocal()
try:
    password = settings.admin_bootstrap_password or ""
    admin = (
        db.query(User)
        .filter((User.role == "admin") | (User.username == settings.admin_username) | (User.email == "admin@cyberguardsim.local"))
        .first()
    )
    if not password:
        print("missing")
    elif admin is None or not admin.password_hash:
        print("missing_admin")
    elif password_weakness_reason(password) is not None:
        print("weak")
    elif verify_password(password, admin.password_hash):
        print("valid")
    else:
        print("mismatch")
finally:
    db.close()
PY
}

open_site() {
  local domain="$1"
  local url="https://${domain}"
  local password_state

  touch "${DEPLOY_STATE_FILE}"

  if [[ "${EUID}" -ne 0 ]]; then
    run_root chown "${LOCAL_OWNER}:${LOCAL_OWNER}" "${DEPLOY_STATE_FILE}" >/dev/null 2>&1 || true
  fi

  log "Deployment completed: ${url}"
  password_state="$(admin_bootstrap_password_state)"
  printf '\n[deploy] Admin login: Admin\n'
  case "${password_state}" in
    valid)
      printf '[deploy] Admin password: %s\n' "${ADMIN_BOOTSTRAP_PASSWORD_VALUE}"
      ;;
    mismatch)
      printf '[deploy] Admin password: configured bootstrap password no longer matches the current admin account\n'
      printf '[deploy] Hint: sync ADMIN_BOOTSTRAP_PASSWORD in .env with the real admin password or reset the admin password explicitly.\n'
      ;;
    weak)
      printf '[deploy] Admin password: configured value exists, but fails current password policy and was not shown\n'
      ;;
    missing|missing_admin)
      printf '[deploy] Admin password: unavailable\n'
      ;;
    *)
      printf '[deploy] Admin password: could not verify current bootstrap password state\n'
      ;;
  esac

  if require_command xdg-open; then
    xdg-open "${url}" >/dev/null 2>&1 || true
  fi
}
