<?php

return [
    'default' => env('QUEUE_CONNECTION', 'database'),
    'connections' => [
        'sync' => ['driver' => 'sync'],
        'database' => ['driver' => 'database', 'connection' => env('DB_QUEUE_CONNECTION'), 'table' => env('DB_QUEUE_TABLE', 'jobs'), 'queue' => env('DB_QUEUE', 'default'), 'retry_after' => (int) env('QUEUE_RETRY_AFTER', 90), 'after_commit' => false],
        'redis' => ['driver' => 'redis', 'connection' => env('REDIS_QUEUE_CONNECTION', 'default'), 'queue' => env('REDIS_QUEUE', 'default'), 'retry_after' => (int) env('REDIS_QUEUE_RETRY_AFTER', 90), 'block_for' => null, 'after_commit' => false],
    ],
    // Importações do Transporte (CSV e Educacenso): conexão própria, para rodar em segundo plano sem mudar os demais jobs.
    // Sem TRANSPORTE_IMPORTACAO_CONEXAO usa a conexão padrão (`sync` roda dentro da requisição).
    'transporte_importacao' => ['conexao' => env('TRANSPORTE_IMPORTACAO_CONEXAO'), 'fila' => env('TRANSPORTE_IMPORTACAO_FILA', 'importacoes')],
    'batching' => ['database' => env('DB_CONNECTION', 'sqlite'), 'table' => 'job_batches'],
    'failed' => ['driver' => 'database-uuids', 'database' => env('DB_CONNECTION', 'sqlite'), 'table' => 'failed_jobs'],
];
