<?php

declare(strict_types=1);

namespace App\Notificacoes;

use App\Models\OutboxEvent;

/**
 * Traduz um evento do Outbox nas mensagens a enviar (design D1). O `TenantContext` já está
 * definido quando o ouvinte chama `tratar()` (se o evento tiver tenant), então o tratador pode
 * usar os models `TenantAware` normalmente.
 */
interface Tratador
{
    /** @return list<Mensagem> */
    public function tratar(OutboxEvent $evento): array;
}
