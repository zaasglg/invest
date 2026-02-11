#!/bin/bash
set -e

echo "Starting container..."

if [ -n "$RENDER_EXTERNAL_URL" ]; then
    export APP_URL="$RENDER_EXTERNAL_URL"
    echo "Set APP_URL to $APP_URL"
fi

if [ "$APP_ENV" = "production" ]; then
    echo "Running migrations..."
    php artisan migrate --force

    echo "Optimizing application..."
    php artisan optimize
fi

exec "$@"
