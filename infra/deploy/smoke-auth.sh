#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

source "${ROOT_DIR}/infra/deploy/lib/common.sh"
source "${ROOT_DIR}/infra/deploy/lib/env.sh"

DOMAIN="$(get_env_value DOMAIN .env || true)"

BASE_URL="${1:-}"
if [[ -z "${BASE_URL}" ]]; then
  if [[ -z "${DOMAIN}" ]]; then
    echo "Pass base URL explicitly, for example: ./infra/deploy/smoke-auth.sh https://example.com"
    exit 1
  fi
  BASE_URL="https://${DOMAIN}"
fi

BASE_HOST="$(python3 - "${BASE_URL}" <<'PY'
import sys
from urllib.parse import urlparse

parsed = urlparse(sys.argv[1])
print(parsed.hostname or "")
PY
)"
BASE_SCHEME="$(python3 - "${BASE_URL}" <<'PY'
import sys
from urllib.parse import urlparse

parsed = urlparse(sys.argv[1])
print(parsed.scheme or "https")
PY
)"
SMOKE_RESOLVE_IP="${SMOKE_RESOLVE_IP:-}"

curl_with_base() {
  if [[ -n "${SMOKE_RESOLVE_IP}" && "${BASE_SCHEME}" == "https" && -n "${BASE_HOST}" ]]; then
    curl --resolve "${BASE_HOST}:443:${SMOKE_RESOLVE_IP}" "$@"
  else
    curl "$@"
  fi
}

EMAIL="s$(date +%s)@x.ru"
PASSWORD="Qz!7$(openssl rand -hex 8)Lm#9"
DISPLAY_NAME="Smoke Analyst"

register_response="$(mktemp)"
login_response="$(mktemp)"
me_response="$(mktemp)"
leaderboard_response="$(mktemp)"
session_response="$(mktemp)"
certificate_response="$(mktemp)"
verify_response="$(mktemp)"

cleanup() {
  rm -f \
    "${register_response}" \
    "${login_response}" \
    "${me_response}" \
    "${leaderboard_response}" \
    "${session_response}" \
    "${certificate_response}" \
    "${verify_response}"
}

trap cleanup EXIT

echo "[smoke-auth] Registering ${EMAIL} via ${BASE_URL}"
register_status="$(curl_with_base -sS -o "${register_response}" -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST "${BASE_URL}/auth/register" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"display_name\":\"${DISPLAY_NAME}\"}")"

if [[ "${register_status}" != "201" ]]; then
  echo "[smoke-auth] Registration failed with status ${register_status}"
  cat "${register_response}"
  exit 1
fi

echo "[smoke-auth] Logging in ${EMAIL}"
login_status="$(curl_with_base -sS -o "${login_response}" -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST "${BASE_URL}/auth/login" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")"

if [[ "${login_status}" != "200" ]]; then
  echo "[smoke-auth] Login failed with status ${login_status}"
  cat "${login_response}"
  exit 1
fi

token="$(python3 - "${login_response}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
print(payload.get("access_token", ""))
PY
)"

if [[ -z "${token}" ]]; then
  echo "[smoke-auth] Login succeeded but no access token was returned"
  cat "${login_response}"
  exit 1
fi

echo "[smoke-auth] Checking /users/me"
me_status="$(curl_with_base -sS -o "${me_response}" -w "%{http_code}" \
  -H "Authorization: Bearer ${token}" \
  "${BASE_URL}/users/me")"

if [[ "${me_status}" != "200" ]]; then
  echo "[smoke-auth] /users/me failed with status ${me_status}"
  cat "${me_response}"
  exit 1
fi

returned_email="$(python3 - "${me_response}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
print(payload.get("email", ""))
PY
)"

if [[ "${returned_email}" != "${EMAIL}" ]]; then
  echo "[smoke-auth] Unexpected user profile response"
  cat "${me_response}"
  exit 1
fi

echo "[smoke-auth] Checking /leaderboard frontend route"
leaderboard_page_headers="$(curl_with_base -sSI "${BASE_URL}/leaderboard")"
if ! grep -qi "Content-Type: text/html" <<<"${leaderboard_page_headers}"; then
  echo "[smoke-auth] /leaderboard did not return an HTML page"
  printf '%s\n' "${leaderboard_page_headers}"
  exit 1
fi

echo "[smoke-auth] Checking /api/leaderboard auth contract"
leaderboard_unauthorized_status="$(curl_with_base -sS -o "${leaderboard_response}" -w "%{http_code}" "${BASE_URL}/api/leaderboard")"
if [[ "${leaderboard_unauthorized_status}" != "401" ]]; then
  echo "[smoke-auth] Expected /api/leaderboard without auth to return 401, got ${leaderboard_unauthorized_status}"
  cat "${leaderboard_response}"
  exit 1
fi

leaderboard_authorized_status="$(curl_with_base -sS -o "${leaderboard_response}" -w "%{http_code}" \
  -H "Authorization: Bearer ${token}" \
  "${BASE_URL}/api/leaderboard")"

if [[ "${leaderboard_authorized_status}" != "200" ]]; then
  echo "[smoke-auth] Authorized /api/leaderboard failed with status ${leaderboard_authorized_status}"
  cat "${leaderboard_response}"
  exit 1
fi

run_scenario() {
  local slug="$1"
  shift
  local labels=("$@")
  local status_code=""

  echo "[smoke-auth] Starting scenario ${slug}"
  status_code="$(curl_with_base -sS -o "${session_response}" -w "%{http_code}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -X POST "${BASE_URL}/sessions" \
    -d "{\"scenario_slug\":\"${slug}\"}")"

  if [[ "${status_code}" != "200" ]]; then
    echo "[smoke-auth] Failed to start scenario ${slug}"
    cat "${session_response}"
    exit 1
  fi

  session_id="$(python3 - "${session_response}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
print(payload.get("session_id", ""))
PY
)"

  if [[ -z "${session_id}" ]]; then
    echo "[smoke-auth] Scenario ${slug} did not return session_id"
    cat "${session_response}"
    exit 1
  fi

  for expected_label in "${labels[@]}"; do
    option_id="$(python3 - "${session_response}" "${expected_label}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
current_step = payload.get("current_step") or {}
for option in current_step.get("options", []):
    if option.get("label") == sys.argv[2]:
        print(option.get("id", ""))
        break
else:
    print("")
PY
)"

    if [[ -z "${option_id}" ]]; then
      echo "[smoke-auth] Could not find expected option for scenario ${slug}: ${expected_label}"
      cat "${session_response}"
      exit 1
    fi

    status_code="$(curl_with_base -sS -o "${session_response}" -w "%{http_code}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -X POST "${BASE_URL}/sessions/${session_id}/answers" \
      -d "{\"option_id\":${option_id}}")"

    if [[ "${status_code}" != "200" ]]; then
      echo "[smoke-auth] Failed to submit answer for scenario ${slug}"
      cat "${session_response}"
      exit 1
    fi
  done
}

run_scenario \
  "office" \
  "Проверить адрес отправителя и сообщить о письме в ИБ/ИТ через официальный канал" \
  "Самостоятельно открыть корпоративный портал по сохраненной закладке и проверить уведомления там" \
  "Позвонить руководителю по известному номеру и проверить запрос вне мессенджера" \
  "Сменить пароль через официальный портал, выйти из сессий и оформить инцидент"

run_scenario \
  "home" \
  "Сменить пароль на уникальный и завершить все активные сессии" \
  "Создать уникальные пароли для связанных сервисов и сохранить их в менеджере паролей" \
  "Проверить издателя и отказаться от приложения, если его нет в доверенном магазине или права избыточны" \
  "Включить 2FA, проверить связанные почтовые ящики и обновить пароли на смежных сервисах"

run_scenario \
  "public-wifi" \
  "Уточнить точное имя сети у сотрудника и при сомнениях использовать мобильный интернет" \
  "Отключиться и выбрать другой способ подключения, если портал просит лишние чувствительные данные" \
  "Прекратить ввод данных и перейти на доверенную сеть или мобильный интернет" \
  "Игнорировать QR-код и пользоваться только официальными каналами заведения или мобильным интернетом"

echo "[smoke-auth] Checking certificate eligibility"
certificate_status_code="$(curl_with_base -sS -o "${certificate_response}" -w "%{http_code}" \
  -H "Authorization: Bearer ${token}" \
  "${BASE_URL}/users/me/certificate")"

if [[ "${certificate_status_code}" != "200" ]]; then
  echo "[smoke-auth] Failed to load certificate status"
  cat "${certificate_response}"
  exit 1
fi

certificate_state="$(python3 - "${certificate_response}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
print(payload.get("status", ""))
PY
)"

if [[ "${certificate_state}" != "eligible" ]]; then
  echo "[smoke-auth] Expected certificate status to be eligible after completing all scenarios"
  cat "${certificate_response}"
  exit 1
fi

echo "[smoke-auth] Issuing certificate"
certificate_issue_code="$(curl_with_base -sS -o "${certificate_response}" -w "%{http_code}" \
  -H "Authorization: Bearer ${token}" \
  -X POST "${BASE_URL}/users/me/certificate")"

if [[ "${certificate_issue_code}" != "200" ]]; then
  echo "[smoke-auth] Failed to issue certificate"
  cat "${certificate_response}"
  exit 1
fi

certificate_code="$(python3 - "${certificate_response}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
certificate = payload.get("certificate") or {}
print(certificate.get("code", ""))
PY
)"

if [[ -z "${certificate_code}" ]]; then
  echo "[smoke-auth] Certificate was issued but code is missing"
  cat "${certificate_response}"
  exit 1
fi

verify_status="$(curl_with_base -sS -o "${verify_response}" -w "%{http_code}" "${BASE_URL}/api/certificates/${certificate_code}")"
if [[ "${verify_status}" != "200" ]]; then
  echo "[smoke-auth] Public certificate verification API failed"
  cat "${verify_response}"
  exit 1
fi

certificate_page_headers="$(curl_with_base -sSI "${BASE_URL}/certificates/${certificate_code}")"
if ! grep -qi "Content-Type: text/html" <<<"${certificate_page_headers}"; then
  echo "[smoke-auth] Public certificate page did not return HTML"
  printf '%s\n' "${certificate_page_headers}"
  exit 1
fi

echo "[smoke-auth] OK: auth, leaderboard contract, all scenarios, and certificate verification passed for ${EMAIL}"
