<?php

return [
    'postmark' => ['token' => env('POSTMARK_TOKEN')],
    'ses' => ['key' => env('AWS_ACCESS_KEY_ID'), 'secret' => env('AWS_SECRET_ACCESS_KEY'), 'region' => env('AWS_DEFAULT_REGION', 'us-east-1')],
    'resend' => ['key' => env('RESEND_KEY')],
    'slack' => ['notifications' => ['bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'), 'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL')]],

    /**
     * Tokens demo do web-admin (somente desenvolvimento local).
     * Em produção devem ser vazios — garante que nenhum token fixo autentica o painel.
     */
    'demo_tokens' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('ADMIN_DEMO_TOKENS', 'universal-admin-session-token,demo-admin-token'))
    ))),
];
