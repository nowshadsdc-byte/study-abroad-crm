# syntax=docker/dockerfile:1

##
## ---- Stage: vendor (installs Composer dependencies) ----
##
FROM composer:2 AS vendor
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --no-interaction \
    --prefer-dist

##
## ---- Stage: base (PHP-FPM + extensions + full app source + vendor) ----
## Node's Wayfinder Vite plugin shells out to `php artisan`, so every stage
## that runs Vite needs PHP, vendor/ and the app source available too.
##
FROM php:8.4-fpm-alpine AS base

RUN apk add --no-cache \
        bash \
        curl \
        icu-libs \
        libjpeg-turbo \
        libpng \
        libzip \
        freetype \
        oniguruma \
        shadow \
        su-exec \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        libzip-dev \
        freetype-dev \
        oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-app.ini
COPY docker/php/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /var/www/html

COPY . .
COPY --from=vendor /var/www/html/vendor ./vendor
RUN composer dump-autoload --no-interaction

##
## ---- Stage: node_tools (adds Node.js on top of base; used by asset build & the dev "node" service) ----
##
FROM base AS node_tools
RUN apk add --no-cache nodejs npm
RUN npm install --package-lock=false --ignore-scripts

##
## ---- Stage: frontend (compiles production Vite assets) ----
##
FROM node_tools AS frontend
RUN npm run build

##
## ---- Stage: app (final production PHP-FPM image, no Node.js) ----
##
FROM base AS app

COPY --from=frontend /var/www/html/public/build ./public/build

RUN composer dump-autoload --optimize --no-dev --no-interaction \
    && mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R ug+rwx storage bootstrap/cache

EXPOSE 9000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php-fpm"]
