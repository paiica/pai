#!/bin/bash
set -e

BENCH_DIR="/home/frappe/frappe-bench"
SITE_NAME="${SITE_NAME:-lms.professionalaiinstitute.com}"

if [ -d "$BENCH_DIR/apps/frappe" ]; then
    echo "Bench already exists, starting..."
    cd "$BENCH_DIR"
    bench start
    exit 0
fi

echo "Initialising frappe-bench for production..."

export PATH="${NVM_DIR}/versions/node/v${NODE_VERSION_DEVELOP}/bin/:${PATH}"

bench init --skip-redis-config-generation "$BENCH_DIR"
cd "$BENCH_DIR"

# Point to Docker service hostnames
bench set-mariadb-host mariadb
bench set-redis-cache-host redis://redis:6379
bench set-redis-queue-host redis://redis:6379
bench set-redis-socketio-host redis://redis:6379

# Remove redis and watch from Procfile (handled by Docker services)
sed -i '/redis/d' ./Procfile
sed -i '/watch/d' ./Procfile

# Install apps
bench get-app payments
bench get-app lms

# Create production site
bench new-site "$SITE_NAME" \
    --force \
    --mariadb-root-password "${DB_ROOT_PASSWORD}" \
    --admin-password "${ADMIN_PASSWORD}" \
    --no-mariadb-socket

bench --site "$SITE_NAME" install-app payments
bench --site "$SITE_NAME" install-app lms

# Production settings
bench --site "$SITE_NAME" set-config developer_mode 0
bench --site "$SITE_NAME" set-config server_script_enabled 1
bench --site "$SITE_NAME" clear-cache

bench use "$SITE_NAME"

# Build frontend assets
bench build --app lms

bench start
