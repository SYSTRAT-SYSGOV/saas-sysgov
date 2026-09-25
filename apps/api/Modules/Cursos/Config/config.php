<?php

declare(strict_types=1);

return [
    // Endereço do Painel do Cliente (apps/web-client): base do link de validação
    // pública que vai no QR code do certificado.
    // @phpstan-ignore larastan.noEnvCallsOutsideOfConfig (é um arquivo de config — do módulo, que o larastan não reconhece)
    'url_portal' => rtrim((string) env('CURSOS_URL_PORTAL', 'http://localhost:5174'), '/'),
];
