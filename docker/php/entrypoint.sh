#!/bin/bash
set -e

cd /var/www/html

if [ ! -f .env ] && [ -f .env.example ]; then
    echo "No .env found, copying .env.example..."
    cp .env.example .env
fi

if [ ! -f vendor/autoload.php ]; then
    echo "vendor/ missing, running composer install..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

if [ "${DB_CONNECTION:-mysql}" = "mysql" ]; then
    echo "Waiting for MySQL at ${DB_HOST:-mysql}:${DB_PORT:-3306}..."
    tries=0
    until php -r "
        try {
            new PDO('mysql:host=${DB_HOST:-mysql};port=${DB_PORT:-3306}', '${DB_USERNAME:-root}', '${DB_PASSWORD:-}');
            exit(0);
        } catch (Throwable \$e) {
            exit(1);
        }
    " 2>/dev/null; do
        tries=$((tries + 1))
        if [ "$tries" -ge 60 ]; then
            echo "MySQL did not become available in time." >&2
            break
        fi
        sleep 2
    done
    echo "MySQL is available."
fi

if grep -q "^APP_KEY=$" .env 2>/dev/null; then
    echo "Generating application key..."
    php artisan key:generate --ansi --force
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache

# Keep the cached package manifest (bootstrap/cache) in sync with whatever
# is actually installed in vendor/ (its own isolated volume).
php artisan package:discover --ansi || true

if [ ! -e public/storage ]; then
    php artisan storage:link || true
fi

echo "Starting: $*"

if [ "$1" = "php-fpm" ]; then
    # php-fpm's master process must stay root; its pool config (www.conf)
    # already drops worker processes to www-data.
    exec "$@"
fi

exec su-exec www-data "$@"
