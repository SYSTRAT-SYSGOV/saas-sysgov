<?php

return [
    'default' => env('DB_CONNECTION', 'mysql'),
    'connections' => [
        'mysql' => ['driver' => 'mysql', 'url' => env('DATABASE_URL'), 'host' => env('DB_HOST', '127.0.0.1'), 'port' => env('DB_PORT', '3306'), 'database' => env('DB_DATABASE', 'forge'), 'username' => env('DB_USERNAME', 'forge'), 'password' => env('DB_PASSWORD', ''), 'unix_socket' => env('DB_SOCKET', ''), 'charset' => 'utf8mb4', 'collation' => 'utf8mb4_unicode_ci', 'prefix' => '', 'prefix_indexes' => true, 'strict' => true, 'engine' => null, 'options' => extension_loaded('pdo_mysql') ? array_filter([
            // PHP 8.4+ deprecou PDO::MYSQL_ATTR_SSL_CA em favor de Pdo\Mysql::ATTR_SSL_CA;
            // no PHP 8.5 esse aviso de depreciação é impresso (display_errors) ANTES do
            // corpo de toda resposta JSON da API, quebrando o parse no front-end. Usa a
            // constante nova quando disponível, sem exigir um piso de PHP 8.4 no composer.json.
            (class_exists(\Pdo\Mysql::class) ? \Pdo\Mysql::ATTR_SSL_CA : PDO::MYSQL_ATTR_SSL_CA) => env('MYSQL_ATTR_SSL_CA'),
        ]) : [],],
    ],
    'migrations' => ['table' => 'migrations', 'update_date_on_publish' => true],
    'redis' => ['client' => env('REDIS_CLIENT', 'phpredis'), 'default' => ['url' => env('REDIS_URL'), 'host' => env('REDIS_HOST', '127.0.0.1'), 'password' => env('REDIS_PASSWORD'), 'port' => env('REDIS_PORT', 6379), 'database' => env('REDIS_DB', 0)]],
];
