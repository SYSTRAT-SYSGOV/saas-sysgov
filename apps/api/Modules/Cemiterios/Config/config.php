<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Módulo Cemitério (SIGCM)
|--------------------------------------------------------------------------
| Faixas legais e valores de REFERÊNCIA do DRS. Os valores efetivos de cada
| município ficam em cemetery_settings (ADR-003) — nenhuma regra lê daqui
| diretamente, exceto a validação de faixa e o seed inicial do tenant.
*/

return [
    // Faixas legais usadas na validação dos parâmetros (RN-01, RN-10).
    'faixas' => [
        'prazo_exumacao_adulto_anos' => [3, 5],
        'edital_prazo_dias' => [10, 30],
    ],

    // Valores de referência do DRS, gravados na primeira versão de parâmetros do tenant.
    'referencia' => [
        'prazo_exumacao_adulto_anos' => 3,
        'prazo_exumacao_crianca_anos' => 2,
        'idade_limite_crianca' => 6,
        'distanciamento_min_m' => 0.50,
        'tumulo_max_comprimento_m' => 3.00,
        'tumulo_max_largura_m' => 2.10,
        'edital_prazo_dias' => 30,
        'obras_simultaneas_max' => 2,
        'notificacao_antecedencia_dias' => 30,
        'suspensoes_para_cancelamento' => 2,
        'concessao_temporaria_anos' => 5,
        'concessao_transferencia_permitida' => false,
        'concessao_base_legal_transferencia' => null,
        'concessao_vigencia_manifestacao_dias' => 30,
        'instrucoes_pagamento' => 'Pagamento na tesouraria municipal ou via PIX.',
        'chave_pix' => null,
        'portal_habilitado' => false,
    ],

    // Sucessão Hereditária (RF-SUCESSAO) — configuração parametrizável por tenant.
    'sucessao' => [
        // Ordem de prioridade dos parentescos (padrão: companheiro, filhos, pais, irmãos, etc.)
        'ordem_prioridade' => [
            'companheiro',
            'filho',
            'pai',
            'mae',
            'irmao',
            'neto',
            'avo',
            'tio',
            'sobrinho',
            'outro',
        ],
        // Prazo de regularização após falecimento (dias)
        'prazo_regularizacao_dias' => 120,
        // Documentos obrigatórios por via de sucessão
        'documentos_por_via' => [
            'inventario_judicial' => ['certidao_obito', 'inventario', 'formal_partilha', 'alvara'],
            'inventario_extrajudicial' => ['certidao_obito', 'escritura'],
            'alvara_judicial' => ['certidao_obito', 'alvara'],
            'arrolamento' => ['certidao_obito', 'outro', 'alvara'],
        ],
        // Habilita direito de representação (herdeiro pré-morto)
        'direito_representacao_habilitado' => true,
        // Base legal municipal
        'base_legal' => '[LEI/DECRETO MUNICIPAL DE SUCESSÃO DE JAZIGOS — CONFIRMAR]',
        // Retenção de documentos (dias) - padrão 10 anos
        'retencao_documentos_dias' => 3650,
        // Dias de antecedência para notificações de prazo
        'notificacao_antecedencia_dias' => [30, 7, 1],
    ],

    // Mapa base (D4). Provedor configurável por ambiente; a chave nunca vem do usuário.
    'mapa_base' => [
        'provedor' => env('CEMITERIO_MAPA_PROVEDOR', 'esri'), // google | esri
        'google_api_key' => env('CEMITERIO_GOOGLE_MAPS_KEY'),
    ],

    // Índice de reajuste (RF-21): API SGS do Banco Central, série 433 (IPCA mensal).
    'ipca_url' => env('CEMITERIO_IPCA_URL', 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json'),

    // Gov.br (RF-27) — OIDC.
    'govbr' => [
        'issuer' => env('GOVBR_ISSUER', 'https://sso.acesso.gov.br'),
        'client_id' => env('GOVBR_CLIENT_ID'),
        'client_secret' => env('GOVBR_CLIENT_SECRET'),
        'redirect_uri' => env('GOVBR_REDIRECT_URI'),
    ],

    // Chave dedicada do HMAC de documentos (CPF/CNPJ) — D11.
    'hash_key' => env('CEMITERIO_HASH_KEY', env('APP_KEY')),
];
