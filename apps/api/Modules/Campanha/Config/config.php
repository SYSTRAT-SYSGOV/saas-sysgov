<?php

declare(strict_types=1);

/*
 * Fontes abertas da base territorial pública (D4). Só o comando de importação as acessa.
 */
return [
    'fontes' => [
        'ibge_localidades' => env('CAMPANHA_IBGE_LOCALIDADES', 'https://servicodados.ibge.gov.br/api/v1/localidades'),
        'ibge_malhas' => env('CAMPANHA_IBGE_MALHAS', 'https://servicodados.ibge.gov.br/api/v3/malhas'),
        'ibge_sidra' => env('CAMPANHA_IBGE_SIDRA', 'https://apisidra.ibge.gov.br/values'),
        'tse_dados_abertos' => env('CAMPANHA_TSE_DADOS_ABERTOS', 'https://cdn.tse.jus.br/estatistica/sead/odsele'),
    ],
    // Qualidade da malha do IBGE: minima | intermediaria | maxima (intermediária: ~730 KB para o PR).
    'qualidade_malha' => env('CAMPANHA_QUALIDADE_MALHA', 'intermediaria'),
    // Endereço do painel do cliente: base da URL pública do formulário de captação (/cadastro-apoio/{codigo}).
    'url_painel' => rtrim((string) env('CAMPANHA_URL_PAINEL', env('FRONTEND_URL', 'http://localhost:5174')), '/'),
    // Formulário público: tempo mínimo entre abrir e enviar (proteção contra robôs) e validade do formulário aberto.
    'cadastro_tempo_minimo_segundos' => (int) env('CAMPANHA_CADASTRO_TEMPO_MINIMO', 3),
    'cadastro_validade_horas' => 12,
    // Grafias do TSE que não batem com o IBGE: nome normalizado no TSE => nome normalizado no IBGE.
    'excecoes_nomes' => [
        'MUNHOZDEMELLO' => 'MUNHOZDEMELO',
    ],
];
