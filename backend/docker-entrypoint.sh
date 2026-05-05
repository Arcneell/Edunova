#!/bin/bash
# Au démarrage : port Postgres joignable puis migrate (pas pendant le docker build).
set -euo pipefail

cd /app

echo "[backend] Attente de PostgreSQL (${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432})…"
python - <<'PY'
import os, socket, time

host = os.environ.get("POSTGRES_HOST", "db")
port = int(os.environ.get("POSTGRES_PORT", "5432"))
timeout_s = 2
max_wait_s = 120
deadline = time.monotonic() + max_wait_s
last_msg = 0.0

while time.monotonic() < deadline:
    try:
        with socket.create_connection((host, port), timeout=timeout_s):
            break
    except OSError:
        now = time.monotonic()
        if now - last_msg > 10:
            print(f"[backend] Postgres pas encore joignable ({host}:{port}), nouvel essai…", flush=True)
            last_msg = now
        time.sleep(1)
else:
    raise SystemExit(f"[backend] Timeout après {max_wait_s}s : PostgreSQL injoignable sur {host}:{port}")
PY

echo "[backend] Migrations…"
attempt=0
max_attempts=12
until python manage.py migrate --noinput; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge "${max_attempts}" ]; then
    echo "[backend] migrate a échoué après ${max_attempts} essais." >&2
    exit 1
  fi
  sleep 2
done

exec "$@"
