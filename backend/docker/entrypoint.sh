#!/bin/sh
# Railway entrypoint: bind Apache to $PORT, boot Laravel, then serve.
set -e

PORT="${PORT:-80}"

# --- Apache on Railway's port ---
sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# --- Map Railway plugin vars to Laravel's DB_* (only when DB_HOST not set) ---
if [ -z "${DB_HOST}" ]; then
    if [ -n "${MYSQLHOST}" ]; then
        export DB_CONNECTION=mysql
        export DB_HOST="${MYSQLHOST}"
        export DB_PORT="${MYSQLPORT:-3306}"
        export DB_DATABASE="${MYSQLDATABASE}"
        export DB_USERNAME="${MYSQLUSER}"
        export DB_PASSWORD="${MYSQLPASSWORD}"
    elif [ -n "${PGHOST}" ]; then
        export DB_CONNECTION=pgsql
        export DB_HOST="${PGHOST}"
        export DB_PORT="${PGPORT:-5432}"
        export DB_DATABASE="${PGDATABASE}"
        export DB_USERNAME="${PGUSER}"
        export DB_PASSWORD="${PGPASSWORD}"
    fi
fi

# --- SQLite fallback (no plugin vars and no DB_HOST): ensure the file exists ---
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    mkdir -p database
    touch database/database.sqlite
fi

# --- Writable dirs (Railway runs as root by default, Apache as www-data) ---
chown -R www-data:www-data storage bootstrap/cache

# --- Laravel boot ---
php artisan storage:link --force || true
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec apache2-foreground
