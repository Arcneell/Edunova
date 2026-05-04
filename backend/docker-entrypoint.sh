#!/bin/bash
set -euo pipefail

if [[ ! -f manage.py ]]; then
  echo "[backend] Création Django à la racine de backend/ (sans sous-dossier projet)..."
  TMP=$(mktemp -d)
  (
    cd "$TMP"
    django-admin startproject core .
    mv manage.py /app/
    mv core/* /app/
    rm -rf core
  )
  rm -rf "$TMP"

  cd /app
  sed -i 's/core\.settings/settings/g' manage.py wsgi.py asgi.py

  python3 << 'PY'
from pathlib import Path
import re

p = Path("settings.py")
t = p.read_text(encoding="utf-8")
t = re.sub(
    r"ROOT_URLCONF\s*=\s*['\"]core\.urls['\"]",
    "ROOT_URLCONF = 'urls'",
    t,
)
t = re.sub(
    r"WSGI_APPLICATION\s*=\s*['\"]core\.wsgi\.application['\"]",
    "WSGI_APPLICATION = 'wsgi.application'",
    t,
)
t = re.sub(
    r"ASGI_APPLICATION\s*=\s*['\"]core\.asgi\.application['\"]",
    "ASGI_APPLICATION = 'asgi.application'",
    t,
)
t = t.replace(
    "Path(__file__).resolve().parent.parent",
    "Path(__file__).resolve().parent",
)
p.write_text(t, encoding="utf-8")
PY

  cat >> settings.py << 'SETTINGS_APPEND'

# --- PostgreSQL (docker-entrypoint) ---
import os

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "edunova"),
        "USER": os.environ.get("POSTGRES_USER", "edunova"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "edunova"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

ALLOWED_HOSTS = ["*", "localhost", "127.0.0.1", "backend"]
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://frontend:5173",
]
SETTINGS_APPEND

  echo "[backend] Django prêt à la racine."
fi

cd /app

echo "[backend] Attente de PostgreSQL (${POSTGRES_HOST:-db})..."
until pg_isready -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-edunova}" -d "${POSTGRES_DB:-edunova}" >/dev/null 2>&1; do
  sleep 1
done

echo "[backend] Migrations..."
python manage.py migrate --noinput

exec "$@"
