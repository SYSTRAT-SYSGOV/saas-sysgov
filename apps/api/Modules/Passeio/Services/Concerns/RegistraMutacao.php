<?php

declare(strict_types=1);

namespace Modules\Passeio\Services\Concerns;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;

/**
 * Auditoria + evento de domínio de toda mutação do módulo (chamar dentro da DB::transaction).
 * Evento: passeio.<recurso>.<acao> (ex.: passeio.passeio.atualizado).
 *
 * @property-read AuditLogger $audit
 * @property-read OutboxPublisher $outbox
 */
trait RegistraMutacao
{
    /**
     * @param array<string, mixed>|null $antes
     * @param array<string, mixed>|null $depois
     * @param array<string, mixed> $payload
     */
    private function auditar(string $recurso, string $acao, int $id, ?array $antes, ?array $depois, array $payload = []): void
    {
        $this->audit->record('passeio', "{$recurso}.{$acao}", "{$recurso}:{$id}", $antes, $depois);
        $this->outbox->publish("passeio.{$recurso}.{$acao}", ['id' => $id, ...$payload]);
    }
}
