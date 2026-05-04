#!/bin/sh
set -eu

cd /app

if [ ! -f package.json ]; then
  echo "[frontend] Création React + Vite à la racine de frontend/..."
  TMP=$(mktemp -d)
  cd "$TMP"
  npm create vite@latest vitegen -- --template react
  cp -a vitegen/. /app/
  rm -rf "$TMP"
  echo "[frontend] Projet Vite copié à la racine (index.html, vite.config.*, src/, public/)."
fi

echo "[frontend] Installation des dépendances..."
npm install

exec "$@"
