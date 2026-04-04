#!/usr/bin/env bash

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

certificate_files_present() {
  local domain="$1"
  local live_dir="infra/letsencrypt/conf/live/${domain}"

  [[ -f "${live_dir}/fullchain.pem" && -f "${live_dir}/privkey.pem" ]]
}

request_certificate() {
  local domain="$1"
  local email="$2"

  if certificate_files_present "${domain}"; then
    log "Existing TLS certificate files found for ${domain}; reusing current certificate without requesting a new one"
    return
  fi

  trap cleanup_bootstrap_nginx EXIT

  log "Starting bootstrap nginx for ACME challenge"
  compose --profile bootstrap up -d --no-deps nginx_bootstrap

  log "Requesting Let's Encrypt certificate for ${domain}"
  compose run --rm --entrypoint certbot certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "${domain}" \
    --cert-name "${domain}" \
    --keep-until-expiring \
    --email "${email}" \
    --agree-tos \
    --no-eff-email

  trap - EXIT
  cleanup_bootstrap_nginx
}

ensure_certificate() {
  local domain="$1"
  local email="$2"

  request_certificate "${domain}" "${email}"
}
