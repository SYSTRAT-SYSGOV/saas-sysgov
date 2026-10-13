<?php

declare(strict_types=1);

/*
 * Assistente IA da ata (D3): Gemini com a chave só no .env do servidor — nunca no código nem no repositório.
 * Sem GEMINI_API_KEY o Assistente fica desativado (o endpoint responde 503).
 */
return [
    // Endereço do painel do cliente: base do link de validação impresso no QR Code do PDF.
    'url_portal' => rtrim((string) env('ATA_URL_PORTAL', env('CURSOS_URL_PORTAL', 'http://localhost:5174')), '/'),
    'ia' => [
        'chave' => env('GEMINI_API_KEY'),
        'modelo' => env('ATA_IA_MODELO', 'gemini-2.5-flash'),
        'timeout' => (int) env('ATA_IA_TIMEOUT', 180),
    ],
];
