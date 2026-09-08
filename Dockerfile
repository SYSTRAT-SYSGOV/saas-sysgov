FROM php:8.4-cli
WORKDIR /var/www/html
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*
RUN docker-php-ext-install pdo_mysql
COPY apps/api .
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" && php composer-setup.php --install-dir=/usr/local/bin --filename=composer && rm composer-setup.php
RUN composer install --optimize-autoloader
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
