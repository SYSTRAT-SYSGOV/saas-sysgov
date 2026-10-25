<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaEmployeeAllocation;
use Modules\Educa\Models\EducaSchool;

/**
 * Serviço de Lotação Escolar Semanal e Fiscalização da Lei do Piso (Lei 11.738/2008).
 */
final class AllocationService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Registra uma alocação semanal com verificação da Lei do Piso e do teto de carga horária.
     *
     * @param array<string, mixed> $dados
     */
    public function alocar(array $dados, int $tenantId): EducaEmployeeAllocation
    {
        /** @var EducaEmployee $servidor */
        $servidor = EducaEmployee::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $dados['employee_id'])
            ->firstOrFail();

        // Valida se a escola e o ano letivo existem no tenant
        EducaSchool::query()->where('tenant_id', $tenantId)->where('id', $dados['school_id'])->firstOrFail();
        EducaAcademicYear::query()->where('tenant_id', $tenantId)->where('id', $dados['academic_year_id'])->firstOrFail();

        $horasRegencia = (float) ($dados['horas_regencia'] ?? 0.0);
        $horasAtividade = (float) ($dados['horas_atividade'] ?? 0.0);
        $horasExcedentes = (float) ($dados['horas_excedentes'] ?? 0.0);
        $jornadaAlocada = $horasRegencia + $horasAtividade;

        // 1. Validação Obrigatória da Lei do Piso (Lei 11.738/2008) para funções docentes
        if ($servidor->isDocente() && $jornadaAlocada > 0) {
            $minimoHoraAtividade = round($jornadaAlocada / 3, 2);

            if ($horasAtividade < $minimoHoraAtividade) {
                $erro = ValidationException::withMessages([
                    'horas_atividade' => [
                        "A alocação descumpre a Lei Federal nº 11.738/2008 (Lei do Piso Nacional do Magistério): " .
                        "para uma jornada de {$jornadaAlocada}h semanais, é obrigatório no mínimo {$minimoHoraAtividade}h " .
                        "dedicadas a horas-atividade (1/3 da jornada). Foram informadas apenas {$horasAtividade}h.",
                    ],
                ]);
                $erro->status = 422;
                $erro->errorBag = 'LEI_DO_PISO_VIOLATION';
                throw $erro;
            }
        }

        // 2. Validação do Teto da Carga Horária Contratual Semanal
        $horasAlocadasAtivas = (float) EducaEmployeeAllocation::query()
            ->where('tenant_id', $tenantId)
            ->where('employee_id', $servidor->id)
            ->where('academic_year_id', $dados['academic_year_id'])
            ->where('status', EducaEmployeeAllocation::STATUS_ATIVA)
            ->selectRaw('COALESCE(SUM(horas_regencia + horas_atividade + horas_excedentes), 0) as total')
            ->value('total');

        $novaCargaAcumulada = $horasAlocadasAtivas + $jornadaAlocada + $horasExcedentes;

        if ($novaCargaAcumulada > (float) $servidor->carga_horaria_semanal) {
            throw ValidationException::withMessages([
                'carga_horaria' => [
                    "A alocação ultrapassa a carga horária contratual global do servidor. " .
                    "Contrato: {$servidor->carga_horaria_semanal}h/sem, já alocado: {$horasAlocadasAtivas}h, " .
                    "tentativa de alocar mais " . ($jornadaAlocada + $horasExcedentes) . "h (totalizaria {$novaCargaAcumulada}h).",
                ],
            ]);
        }

        /** @var EducaEmployeeAllocation $alocacao */
        $alocacao = EducaEmployeeAllocation::create([
            'tenant_id' => $tenantId,
            'employee_id' => $servidor->id,
            'school_id' => $dados['school_id'],
            'academic_year_id' => $dados['academic_year_id'],
            'turno' => $dados['turno'],
            'dia_semana' => $dados['dia_semana'] ?? null,
            'horas_regencia' => $horasRegencia,
            'horas_atividade' => $horasAtividade,
            'horas_excedentes' => $horasExcedentes,
            'status' => EducaEmployeeAllocation::STATUS_ATIVA,
        ]);

        $this->audit->record('educa', 'employee_allocation.created', "EducaEmployeeAllocation #{$alocacao->id}", null, $alocacao->toArray());

        return $alocacao->load(['escola', 'anoLetivo']);
    }

    /**
     * Cancela ou desativa uma alocação.
     */
    public function desativar(string $alocacaoId, int $tenantId): void
    {
        /** @var EducaEmployeeAllocation $alocacao */
        $alocacao = EducaEmployeeAllocation::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $alocacaoId)
            ->firstOrFail();

        $dados = $alocacao->toArray();
        $alocacao->delete();

        $this->audit->record('educa', 'employee_allocation.deleted', "EducaEmployeeAllocation #{$alocacaoId}", $dados, null);
    }

    /**
     * Lista alocações com filtros.
     *
     * @param array<string, mixed> $filtros
     * @return Collection<int, EducaEmployeeAllocation>
     */
    public function listar(array $filtros, int $tenantId): Collection
    {
        $query = EducaEmployeeAllocation::with(['servidor.pessoa', 'escola', 'anoLetivo'])
            ->where('tenant_id', $tenantId);

        if (!empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }
        if (!empty($filtros['employee_id'])) {
            $query->where('employee_id', $filtros['employee_id']);
        }
        if (!empty($filtros['academic_year_id'])) {
            $query->where('academic_year_id', $filtros['academic_year_id']);
        }
        if (!empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }
}
