<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaAeeStudentProfile;
use Modules\Educa\Models\EducaAeeSupportAllocation;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaSchool;

/**
 * Gestão e Alocação de Profissionais de Apoio Escolar com Trava de Sobrecarga.
 */
final class AeeSupportAllocationService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     caregiver_employee_id?: string|null,
     *     status?: string|null
     * } $filtros
     * @return Collection<int, EducaAeeSupportAllocation>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaAeeSupportAllocation::query()
            ->with(['studentProfile.pessoa', 'school', 'caregiverEmployee.pessoa'])
            ->orderBy('created_at', 'desc');

        if (! empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (! empty($filtros['caregiver_employee_id'])) {
            $query->where('caregiver_employee_id', $filtros['caregiver_employee_id']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        return $query->get();
    }

    /**
     * Aloca profissional de apoio com trava anti-sobrecarga.
     *
     * @param array{
     *     student_profile_id: string,
     *     school_id: string,
     *     caregiver_employee_id: string,
     *     tipo_apoio: string,
     *     turno: string,
     *     carga_horaria_semanal?: int|null,
     *     data_inicio: string,
     *     data_fim?: string|null,
     *     observacoes?: string|null
     * } $dados
     */
    public function alocar(array $dados, int $userId = 1, int $limiteAlunosPorCuidador = 3): EducaAeeSupportAllocation
    {
        return DB::transaction(function () use ($dados, $limiteAlunosPorCuidador): EducaAeeSupportAllocation {
            $perfil = EducaAeeStudentProfile::findOrFail($dados['student_profile_id']);
            $escola = EducaSchool::findOrFail($dados['school_id']);
            $profissional = EducaEmployee::findOrFail($dados['caregiver_employee_id']);

            $tipoApoio = $dados['tipo_apoio'];
            $turno = $dados['turno'];

            // Trava de Sobrecarga de Cuidador (LBI e Segurança do Aluno Dependente)
            if ($tipoApoio === 'cuidador_alimentacao_higiene') {
                $alocacoesAtivas = EducaAeeSupportAllocation::where('caregiver_employee_id', $profissional->id)
                    ->where('turno', $turno)
                    ->where('status', 'ativo')
                    ->count();

                if ($alocacoesAtivas >= $limiteAlunosPorCuidador) {
                    throw new LogicException("Limite de sobrecarga atingido: O cuidador escolar já possui {$alocacoesAtivas} estudantes dependentes alocados no turno {$turno} (limite municipal: {$limiteAlunosPorCuidador}).");
                }
            }

            $alocacao = new EducaAeeSupportAllocation();
            $alocacao->student_profile_id = $perfil->id;
            $alocacao->school_id = $escola->id;
            $alocacao->caregiver_employee_id = $profissional->id;
            $alocacao->tipo_apoio = $tipoApoio;
            $alocacao->turno = $turno;
            $alocacao->carga_horaria_semanal = (int) ($dados['carga_horaria_semanal'] ?? 20);
            $alocacao->data_inicio = $dados['data_inicio'];
            $alocacao->data_fim = $dados['data_fim'] ?? null;
            $alocacao->observacoes = $dados['observacoes'] ?? null;
            $alocacao->status = 'ativo';
            $alocacao->save();

            $this->audit->record(
                'educa',
                'educa.aee.support_allocation.created',
                "educa_aee_support_allocation:{$alocacao->id}",
                null,
                $alocacao->toArray()
            );

            return $alocacao;
        });
    }

    public function encerrar(string $id, int $userId = 1): void
    {
        $alocacao = EducaAeeSupportAllocation::findOrFail($id);
        $alocacao->status = 'finalizado';
        $alocacao->data_fim = date('Y-m-d');
        $alocacao->save();

        $this->audit->record(
            'educa',
            'educa.aee.support_allocation.closed',
            "educa_aee_support_allocation:{$alocacao->id}",
            null,
            ['status' => $alocacao->status, 'data_fim' => $alocacao->data_fim]
        );
    }
}
