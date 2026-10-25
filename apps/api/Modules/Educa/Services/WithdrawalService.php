<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaEmployeeAbsence;
use Modules\Educa\Models\EducaEmployeeAllocation;
use Modules\Educa\Models\EducaEmployeeWithdrawal;
use Modules\Educa\Models\EducaSchool;

/**
 * Serviço de Gestão de Afastamentos, Licenças e Faltas Funcionais.
 */
final class WithdrawalService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Registra afastamento temporário ou licença com suspensão de alocações ativas.
     *
     * @param array<string, mixed> $dados
     */
    public function registrarAfastamento(string $servidorId, array $dados, int $tenantId): EducaEmployeeWithdrawal
    {
        /** @var EducaEmployee $servidor */
        $servidor = EducaEmployee::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $servidorId)
            ->firstOrFail();

        return DB::transaction(function () use ($servidor, $dados, $tenantId): EducaEmployeeWithdrawal {
            /** @var EducaEmployeeWithdrawal $afastamento */
            $afastamento = EducaEmployeeWithdrawal::create([
                'tenant_id' => $tenantId,
                'employee_id' => $servidor->id,
                'tipo_afastamento' => $dados['tipo_afastamento'],
                'data_inicio' => $dados['data_inicio'],
                'data_fim' => $dados['data_fim'] ?? null,
                'motivo' => $dados['motivo'] ?? null,
            ]);

            // Suspende alocações ativas do servidor durante o afastamento
            EducaEmployeeAllocation::query()
                ->where('tenant_id', $tenantId)
                ->where('employee_id', $servidor->id)
                ->where('status', EducaEmployeeAllocation::STATUS_ATIVA)
                ->update(['status' => EducaEmployeeAllocation::STATUS_SUSPENSA]);

            $this->audit->record('educa', 'employee_withdrawal.created', "EducaEmployeeWithdrawal #{$afastamento->id}", null, $afastamento->toArray());

            return $afastamento;
        });
    }

    /**
     * Registra falta ou atraso funcional.
     *
     * @param array<string, mixed> $dados
     */
    public function registrarFalta(string $servidorId, array $dados, int $tenantId): EducaEmployeeAbsence
    {
        /** @var EducaEmployee $servidor */
        $servidor = EducaEmployee::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $servidorId)
            ->firstOrFail();

        EducaSchool::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $dados['school_id'])
            ->firstOrFail();

        /** @var EducaEmployeeAbsence $falta */
        $falta = EducaEmployeeAbsence::create([
            'tenant_id' => $tenantId,
            'employee_id' => $servidor->id,
            'school_id' => $dados['school_id'],
            'data_falta' => $dados['data_falta'],
            'tipo' => $dados['tipo'] ?? 'falta',
            'minutos' => $dados['minutos'] ?? 50,
            'justificada' => (bool) ($dados['justificada'] ?? false),
            'motivo_justificativa' => $dados['motivo_justificativa'] ?? null,
        ]);

        $this->audit->record('educa', 'employee_absence.created', "EducaEmployeeAbsence #{$falta->id}", null, $falta->toArray());

        return $falta->load(['escola']);
    }
}
