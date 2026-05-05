#!/bin/bash
# Entrée conteneur backend : attendre Postgres, appliquer toutes les migrations (base vide ou non),
# puis exécuter la commande Docker (runserver par défaut).
#
# Important : aucune migration n’est jouée pendant « docker build » — seulement au démarrage du conteneur,
# lorsque Postgres est joignable (volume neuf ⇒ base créée puis schéma Django via migrate).
set -euo pipefail

cd /app

echo "[backend] Attente de PostgreSQL (${POSTGRES_HOST:-db})..."
until pg_isready -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-edunova}" -d "${POSTGRES_DB:-edunova}" >/dev/null 2>&1; do
  sleep 1
done

echo "[backend] Application des migrations Django (première fois = schéma complet, sinon idempotent)…"

max_attempts=30
attempt=0
until python manage.py migrate --noinput; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge "${max_attempts}" ]; then
    echo "[backend] Échec de migrate après ${max_attempts} tentatives." >&2
    exit 1
  fi
  echo "[backend] migrate en erreur (${attempt}/${max_attempts}), nouvel essai dans 2 s…"
  sleep 2
done

echo "[backend] Schéma PostgreSQL synchronisé avec les migrations Django."

exec "$@"
