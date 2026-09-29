<?php

/**
 * Mapa event_type (Outbox) → lista de classes App\Notificacoes\Tratador (design D1). Tipo sem
 * tratador aqui é ignorado pelo ouvinte (o evento do Outbox termina 'done', como hoje). Módulos
 * acrescentam seus próprios tratadores nesta config no boot() do ServiceProvider
 * (`config(['notificacoes.cursos.InscricaoCriada' => [...]]);` ou mesclando um array), para o
 * núcleo (app/) não depender de nenhum módulo.
 */
return [
];
