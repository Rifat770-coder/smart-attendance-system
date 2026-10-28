#!/usr/bin/env bash
# ==============================================================================
# AttendX — PostgreSQL Database Restore Script
# ==============================================================================
set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <path_to_backup.sql.gz>" >&2
    exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo "[ERROR] Backup file not found: ${BACKUP_FILE}" >&2
    exit 1
fi

DB_HOST="${POSTGRES_SERVER:-127.0.0.1}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-attendx}"
DB_USER="${POSTGRES_USER:-attendx}"

echo "[WARNING] This operation will overwrite existing data in '${DB_NAME}'."
read -p "Are you sure you want to proceed? (y/N): " CONFIRM
if [[ "${CONFIRM}" != [yY] && "${CONFIRM}" != [yY][eE][sS] ]]; then
    echo "[INFO] Restore operation cancelled."
    exit 0
fi

echo "[INFO] Restoring database '${DB_NAME}' from ${BACKUP_FILE}..."
export PGPASSWORD="${POSTGRES_PASSWORD:-attendx_secure_pass_2026}"

gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

echo "[SUCCESS] Database restoration completed successfully."
