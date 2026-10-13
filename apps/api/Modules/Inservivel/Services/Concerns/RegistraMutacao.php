<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services\Concerns;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;

/**
 * Auditoria de toda mutação do módulo e eventos de domínio (chamar dentro da DB::transaction).
 *
 * @property-read AuditLogger $audit
 * @property-read OutboxPublisher $outbox
 */
trait RegistraMutacao
{
    /**
     * @param array<string, mixed>|null $antes
     * @param array<string, mixed>|null $depois
     */
    private function auditar(string $recurso, string $acao, int $id, ?array $antes, ?array $depois): void
    {
        $this->audit->record('inservivel', "{$recurso}.{$acao}", "{$recurso}:{$id}", $antes, $depois);
    }

    /** @param array<string, mixed> $payload Evento de domínio: inservivel.<Evento> (spec: Auditoria e eventos). */
    private function publicar(string $evento, array $payload): void
    {
        $this->outbox->publish("inservivel.{$evento}", $payload);
    }
}
