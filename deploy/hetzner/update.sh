#!/usr/bin/env bash
# Update an installed OpenReply server.
#   bash /opt/openreply/deploy/hetzner/update.sh        git pull and rebuild
#   bash /opt/openreply/deploy/hetzner/update.sh env    set Meta secrets, then recreate containers
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/openreply}"
BRANCH="${BRANCH:-main}"
ENV_FILE="$APP_DIR/deploy/hetzner/.env"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Bitte als root starten."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Keine $ENV_FILE. Zuerst install.sh ausführen."
  exit 1
fi

trim() {
  local value="$1"
  value="${value%$'\r'}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

set_env() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp)"
  grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
  chmod 600 "$ENV_FILE"
}

current_env() {
  local key="$1"
  grep "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2- || true
}

if [[ "${1:-}" == "env" ]]; then
  if [[ ! -t 0 ]]; then
    echo "env braucht die Tastatur."
    exit 1
  fi
  echo "Enter lässt den bisherigen Wert stehen."
  read -r -p "INSTAGRAM_APP_ID [$(current_env INSTAGRAM_APP_ID)]: " app_id
  app_id="$(trim "$app_id")"
  app_id="${app_id:-$(current_env INSTAGRAM_APP_ID)}"
  read -r -p "INSTAGRAM_APP_SECRET (Enter behält den alten Wert): " app_secret
  app_secret="$(trim "$app_secret")"
  if [[ -z "$app_secret" ]]; then
    app_secret="$(current_env INSTAGRAM_APP_SECRET)"
  fi
  read -r -p "FACEBOOK_APP_SECRET (Enter behält den alten Wert): " fb_secret
  fb_secret="$(trim "$fb_secret")"
  if [[ -z "$fb_secret" ]]; then
    fb_secret="$(current_env FACEBOOK_APP_SECRET)"
  fi
  set_env INSTAGRAM_APP_ID "$app_id"
  set_env INSTAGRAM_APP_SECRET "$app_secret"
  set_env FACEBOOK_APP_SECRET "$fb_secret"
  cd "$APP_DIR/deploy/hetzner"
  docker compose --env-file .env up -d --force-recreate web worker
  echo "Meta-Werte gespeichert. Web und Worker neu gestartet."
  echo "WEBHOOK_VERIFY_TOKEN steht unverändert in $ENV_FILE"
  exit 0
fi

git -C "$APP_DIR" fetch origin "$BRANCH"
git -C "$APP_DIR" checkout -B "$BRANCH" "origin/$BRANCH"

cd "$APP_DIR/deploy/hetzner"
# Recreate the app containers. Web runs `npm run db:migrate` (prisma migrate
# deploy) before it listens. Worker and cron wait until that healthcheck
# passes, so a new migration is applied before the comment poll runs again.
# Postgres, Redis, and Caddy are started too, and recreated only when their
# own config changed — their data volumes stay.
docker compose --env-file .env up -d --build --force-recreate web worker cron
docker compose --env-file .env up -d
echo "Aktualisiert. Datenbank-Änderungen laufen beim Start der Webseite."
echo "Prüfe https://$(current_env DOMAIN)/api/health"
