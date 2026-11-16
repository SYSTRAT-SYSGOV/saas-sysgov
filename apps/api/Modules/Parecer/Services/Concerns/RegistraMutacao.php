<?php

declare(strict_types=1);

namespace Modules\Parecer\Services\Concerns;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;

/**
 * Auditoria + evento de domínio de toda mutação do módulo (chamar dentro da DB::transaction).
 * Ação no AuditLog: <recurso>.<acao> (ex.: avaliacao.salva); recurso: "<recurso>:<id>".
 * O "depois" leva a descrição legível usada na tela de auditoria (como no PHP).
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
    private function auditar(string $recurso, string $acao, ?int $id, string $descricao, ?array $antes = null, ?array $depois = null): void
    {
        $this->audit->record('parecer', "{$recurso}.{$acao}", $recurso . ':' . ($id ?? '-'), $antes, ['descricao' => mb_substr($descricao, 0, 500), ...($depois ?? [])]);
        $this->outbox->publish("parecer.{$recurso}.{$acao}", ['id' => $id]);
    }
}
