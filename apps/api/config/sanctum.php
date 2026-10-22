<?php

// Mescla com os padrões do pacote (Laravel Sanctum): aqui só endurecemos a validade dos tokens.
return [
    // Minutos até expirar um token pessoal (padrão do pacote é nunca expirar).
    'expiration' => (int) env('SANCTUM_TOKEN_EXPIRATION', 720),
];
