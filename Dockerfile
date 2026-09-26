FROM php:8.4-cli
WORKDIR /var/www/html
RUN apt-get update && apt-get install -y unzip libpng-dev libjpeg62-turbo-dev libfreetype6-dev && rm -rf /var/lib/apt/lists/*
# gd: exigido pelo dompdf para imagens PNG/JPEG nos certificados do módulo Cursos
RUN docker-php-ext-configure gd --with-jpeg --with-freetype && docker-php-ext-install pdo_mysql bcmath gd
COPY apps/api .
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" && php composer-setup.php --install-dir=/usr/local/bin --filename=composer && rm composer-setup.php
RUN composer install --optimize-autoloader
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
