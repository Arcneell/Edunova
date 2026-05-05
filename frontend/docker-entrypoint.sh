#!/bin/sh
set -eu

cd /app

echo "[frontend] Installation des dépendances..."
npm install

exec "$@"
