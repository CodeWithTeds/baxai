# ---------- Stage 1: app build (Composer + Vite) ----------
# Single stage because Wayfinder's Vite plugin shells out to
# `php artisan wayfinder:generate` during `npm run build`.
FROM php:8.3-cli AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends \
        nodejs \
        libpng-dev \
        libzip-dev \
        libonig-dev \
    && docker-php-ext-install -j"$(nproc)" mbstring xml zip pdo_sqlite bcmath \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-plugins \
    --no-scripts \
    --prefer-dist

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# ---------- Stage 2: runtime (PHP + Apache) ----------
FROM php:8.3-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

# System deps + PHP extensions (mysql + pgsql for Railway plugins, sqlite as fallback)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        unzip \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
        libzip-dev \
        libicu-dev \
        libxml2-dev \
        libpq-dev \
        libsqlite3-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql pdo_pgsql pdo_sqlite \
        bcmath intl zip gd pcntl opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite headers

# Point Apache at Laravel's public dir
RUN sed -ri 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
        /etc/apache2/sites-available/*.conf /etc/apache2/apache2.conf

# Production OPcache defaults
RUN printf '%s\n' \
        'opcache.enable=1' \
        'opcache.memory_consumption=128' \
        'opcache.interned_strings_buffer=8' \
        'opcache.max_accelerated_files=10000' \
        'opcache.validate_timestamps=0' \
    > /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html

COPY . .
COPY --from=build /app/vendor ./vendor
COPY --from=build /app/public/build ./public/build

RUN chmod +x docker/entrypoint.sh \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["docker/entrypoint.sh"]
