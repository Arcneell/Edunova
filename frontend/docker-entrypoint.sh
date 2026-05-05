#!/bin/sh
# npm ci uniquement si le lock a changé (évite plusieurs minutes à chaque `compose up`).
set -eu

cd /app

stamp="/app/node_modules/.edunova_lock_stamp"
desired="$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1 || echo "")"
previous="$(cat "$stamp" 2>/dev/null || echo "")"

if [ -z "$desired" ]; then
  echo "[frontend] package-lock.json manquant ou illisible, npm install..." >&2
  npm install --no-audit --fund=false
elif [ "$desired" != "$previous" ] || [ ! -x node_modules/.bin/vite ]; then
  echo "[frontend] npm ci (premier run ou lock modifié)..."
  npm ci --no-audit --fund=false
  mkdir -p /app/node_modules
  printf %s "$desired" >"$stamp"
else
  echo "[frontend] node_modules déjà à jour, pas de téléchargement."
fi

exec "$@"
