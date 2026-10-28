#!/usr/bin/env bash
# ==============================================================================
# AttendX — Robust Persistent Daemon Manager
# ==============================================================================
set -euo pipefail

ROOT_DIR="/workspace/smart-attendance-system"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

echo "[1/4] Checking Redis & PostgreSQL..."
# Clean stale IPC files
rm -f /tmp/.sysv_ipc_table /tmp/.shm_* 2>/dev/null || true

if ! redis-cli ping &>/dev/null; then
    echo "Starting Redis..."
    /etc/init.d/redis-server start || true
fi

if ! pg_isready -h 127.0.0.1 -p 5432 -U attendx &>/dev/null; then
    echo "Starting PostgreSQL..."
    rm -f /var/lib/postgresql/12/main/postmaster.pid 2>/dev/null || true
    runuser -u postgres -- /usr/lib/postgresql/12/bin/pg_ctl -D /var/lib/postgresql/12/main -l /var/lib/postgresql/12/main/logfile start || true
fi

# 2. Check and start Backend API (port 8000)
echo "[2/4] Checking Backend API..."
if ! curl -s http://127.0.0.1:8000/api/v1/admin/health &>/dev/null; then
    echo "Launching FastAPI Backend via start-stop-daemon..."
    rm -f "${BACKEND_DIR}/uvicorn.pid" 2>/dev/null || true
    start-stop-daemon --start --background \
        --make-pidfile --pidfile "${BACKEND_DIR}/uvicorn.pid" \
        --chdir "${BACKEND_DIR}" \
        --exec "${BACKEND_DIR}/venv/bin/uvicorn" -- \
        app.main:app --host 0.0.0.0 --port 8000 --log-level info
    sleep 2
fi

# 3. Check and start Frontend Next.js (port 3000)
echo "[3/4] Checking Frontend Web Server..."
if ! curl -s -I http://127.0.0.1:3000/login &>/dev/null; then
    echo "Launching Next.js Frontend via start-stop-daemon..."
    rm -f "${FRONTEND_DIR}/next.pid" 2>/dev/null || true
    NODE_BIN=$(which node)
    start-stop-daemon --start --background \
        --make-pidfile --pidfile "${FRONTEND_DIR}/next.pid" \
        --chdir "${FRONTEND_DIR}" \
        --exec "${NODE_BIN}" -- \
        ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000

    sleep 3
fi

# 4. Verification
echo "[4/4] Verifying entire service chain..."
for i in {1..10}; do
    if curl -s http://127.0.0.1:3000/api/v1/admin/health &>/dev/null; then
        echo "SUCCESS: Next.js + FastAPI proxy is HEALTHY!"
        curl -s http://127.0.0.1:3000/api/v1/admin/health
        echo ""
        exit 0
    fi
    sleep 1
done

echo "WARNING: Services took longer than expected to respond. Checking statuses:"
curl -I http://127.0.0.1:8000/api/v1/admin/health || true
curl -I http://127.0.0.1:3000/login || true
