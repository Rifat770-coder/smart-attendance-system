#!/usr/bin/env bash
# ==============================================================================
# AttendX — Automated PostgreSQL Database Backup Script
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/workspace/smart-attendance-system/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/attendx_backup_${TIMESTAMP}.sql.gz"

DB_HOST="${POSTGRES_SERVER:-127.0.0.1}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-attendx}"
DB_USER="${POSTGRES_USER:-attendx}"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup for '${DB_NAME}' at ${TIMESTAMP}..."

export PGPASSWORD="${POSTGRES_PASSWORD:-attendx_secure_pass_2026}"

pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip > "${BACKUP_FILE}"

if [[ -s "${BACKUP_FILE}" ]]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[SUCCESS] Backup completed successfully: ${BACKUP_FILE} (${SIZE})"
else
    echo "[ERROR] Backup failed: File is empty or was not created." >&2
    exit 1
fi

# Retention policy: Purge backups older than 30 days
echo "[INFO] Cleaning backups older than 30 days..."
find "${BACKUP_DIR}" -name "attendx_backup_*.sql.gz" -mtime +30 -delete

echo "[SUCCESS] Backup workflow completed."
