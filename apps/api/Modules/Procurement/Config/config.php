<?php

declare(strict_types=1);

return [
    'name' => 'Procurement',
    
    // RN-013: Intervalo mínimo entre lances do mesmo concorrente (em segundos)
    'bidding_anti_spam_seconds' => 3,

    // RN-004: Pesquisa de mercado - número mínimo de fontes válidas e percentual de outlier
    'market_research' => [
        'min_sources' => 3,
        'outlier_threshold_percentage' => 25.0, // Acima de 25% da média é considerado outlier
    ],

    // RN-009: Limites legais cumulativos para termos aditivos (Art. 125 da Lei 14.133/2021)
    'addendum_limits' => [
        'general_percentage' => 25.0, // Compras e serviços comuns
        'engineering_works_percentage' => 50.0, // Reformas de edifícios ou equipamentos
    ],

    // RN-008: Limite máximo para pagamento a contar do vencimento
    'payment_max_days_after_due' => 30,

    // RN-017: Prazos mínimos legais de abertura conforme Art. 55 da Lei 14.133/2021 (dias úteis)
    'legal_deadlines' => [
        'pregao_menor_preco' => 8, // Aquisição de bens comuns
        'pregao_servicos_comuns' => 10,
        'concorrencia_menor_preco' => 10,
        'concorrencia_maior_desconto' => 15,
        'concorrencia_melhor_tecnica' => 35,
        'concorrencia_tecnica_preco' => 35,
        'leilao' => 15,
        'dialogo_competitivo' => 25,
    ],

    // Integração PNCP
    'pncp' => [
        'base_url' => '',
        'api_key' => '',
        'auto_sync' => true,
    ],
];
