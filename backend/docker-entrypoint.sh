#!/bin/sh
set -e

python - <<'PY'
import os
import socket
import time

host = os.environ.get("POSTGRES_SERVER", "db")
port = int(os.environ.get("POSTGRES_PORT", "5432"))

deadline = time.time() + 60
last_err = None
while time.time() < deadline:
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError as e:
        last_err = e
        time.sleep(1)
else:
    raise SystemExit(f"Postgres not reachable at {host}:{port}: {last_err}")
PY

alembic upgrade head

exec "$@"

