<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Modules\Licita\Enums\FaseLicita;
use Modules\Licita\Enums\StatusProcesso;
use Modules\Licita\Models\Processo;

final class ProcessoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * @param array{numero: string, ano: int, objeto?: string|null} $data
     */
    public function criar(array $data, User $user): Processo
    {
        if (!$this->tenantContext->hasTenant()) {
            throw new DomainException('RN-001: tenant não identificado para criação do processo.');
        }

        $processo = Processo::create([
            'numero' => $data['numero'],
            'ano' => $data['ano'],
            'objeto' => $data['objeto'] ?? null,
            'fase_atual' => FaseLicita::Dfd->value,
            'status_geral' => StatusProcesso::EmAndamento->value,
            'criado_por' => $user->id,
        ]);

        $this->audit->record('licita', 'processo.criado', "Processo #{$processo->id}", null, $processo->toArray());
        $this->outbox->publish('licita.ProcessoCriado', ['id' => $processo->id, 'numero' => $processo->numero, 'ano' => $processo->ano]);

        return $processo;
    }

    /**
     * Avança a fase do processo (ex.: dfd -> etp quando o DFD é aprovado).
     * Não valida a máquina de estados aqui — cada fase (DfdService, EtpService...)
     * decide quando é hora de empurrar o processo adiante.
     */
    public function avancarFase(Processo $processo, FaseLicita $novaFase, ?string $objeto = null): Processo
    {
        $antes = $processo->toArray();

        $processo->update([
            'fase_atual' => $novaFase->value,
            ...($objeto !== null ? ['objeto' => $objeto] : []),
        ]);
        $processo->refresh();

        $this->audit->record('licita', 'processo.fase_avancada', "Processo #{$processo->id}", $antes, $processo->toArray());
        $this->outbox->publish('licita.ProcessoFaseAvancada', ['id' => $processo->id, 'fase' => $novaFase->value]);

        return $processo;
    }
}
