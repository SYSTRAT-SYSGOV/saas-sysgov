<?php

declare(strict_types=1);

return [
    // Chave dedicada do HMAC de CPF (hash de unicidade), mesmo padrão do módulo Cemiterios.
    'hash_key' => env('PESSOAS_HASH_KEY', env('APP_KEY')),
];
