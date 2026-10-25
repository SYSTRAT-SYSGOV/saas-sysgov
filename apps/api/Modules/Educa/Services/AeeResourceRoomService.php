<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaAeeEnrollment;
use Modules\Educa\Models\EducaAeeResourceRoom;
use Modules\Educa\Models\EducaAeeStudentProfile;
use Modules\Educa\Models\EducaEnrollment;

/**
 * Gestão de Salas de Recursos Multifuncionais (SRM) e Matrícula de Dupla Entrada no Contraturno.
 */
final class AeeResourceRoomService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     tipo_sala?: string|null,
     *     is_polo?: bool|null
     * } $filtros
     * @return Collection<int, EducaAeeResourceRoom>
     */
    public function listarSalas(array $filtros = []): Collection
    {
        $query = EducaAeeResourceRoom::query()
            ->with(['school', 'enrollments.studentProfile.pessoa'])
            ->where('is_active', true)
            ->orderBy('nome');

        if (! empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (! empty($filtros['tipo_sala'])) {
            $query->where('tipo_sala', $filtros['tipo_sala']);
        }

        if (isset($filtros['is_polo'])) {
            $query->where('is_polo', (bool) $filtros['is_polo']);
        }

        return $query->get();
    }

    public function obterSala(string $id): EducaAeeResourceRoom
    {
        return EducaAeeResourceRoom::with([
            'school',
            'enrollments.studentProfile.pessoa',
            'enrollments.regularEnrollment.school',
        ])->findOrFail($id);
    }

    /**
     * @param array{
     *     school_id: string,
     *     nome: string,
     *     tipo_sala?: string|null,
     *     capacidade_atendimento?: int|null,
     *     equipamentos_disponiveis?: array<int, string>|null,
     *     horarios_disponiveis?: array<int, string>|null,
     *     is_polo?: bool|null
     * } $dados
     */
    public function criarSala(array $dados, int $userId = 1): EducaAeeResourceRoom
    {
        return DB::transaction(function () use ($dados): EducaAeeResourceRoom {
            $sala = new EducaAeeResourceRoom();
            $sala->school_id = $dados['school_id'];
            $sala->nome = $dados['nome'];
            $sala->tipo_sala = $dados['tipo_sala'] ?? 'tipo_1_generica';
            $sala->capacidade_atendimento = (int) ($dados['capacidade_atendimento'] ?? 15);
            $sala->equipamentos_disponiveis = $dados['equipamentos_disponiveis'] ?? [];
            $sala->horarios_disponiveis = $dados['horarios_disponiveis'] ?? [];
            $sala->is_polo = (bool) ($dados['is_polo'] ?? false);
            $sala->is_active = true;
            $sala->save();

            $this->audit->record(
                'educa',
                'educa.aee.resource_room.created',
                "educa_aee_resource_room:{$sala->id}",
                null,
                $sala->toArray()
            );

            return $sala;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizarSala(string $id, array $dados, int $userId = 1): EducaAeeResourceRoom
    {
        return DB::transaction(function () use ($id, $dados): EducaAeeResourceRoom {
            $sala = EducaAeeResourceRoom::findOrFail($id);
            $sala->fill($dados);
            $sala->save();

            $this->audit->record(
                'educa',
                'educa.aee.resource_room.updated',
                "educa_aee_resource_room:{$sala->id}",
                null,
                $dados
            );

            return $sala;
        });
    }

    /**
     * Realiza enturmação de dupla entrada garantindo contraturno.
     *
     * @param array{
     *     student_profile_id: string,
     *     regular_enrollment_id: string,
     *     turno_atendimento: string,
     *     dias_semana?: array<int, string>|null,
     *     horario_inicio?: string|null,
     *     horario_fim?: string|null,
     *     frequencia_semanal?: int|null
     * } $dados
     */
    public function enturmarContraturno(string $resourceRoomId, array $dados, int $userId = 1): EducaAeeEnrollment
    {
        return DB::transaction(function () use ($resourceRoomId, $dados): EducaAeeEnrollment {
            $sala = EducaAeeResourceRoom::findOrFail($resourceRoomId);
            $perfil = EducaAeeStudentProfile::findOrFail($dados['student_profile_id']);
            $matriculaRegular = EducaEnrollment::with('enturmacaoAtiva.turma')->findOrFail($dados['regular_enrollment_id']);

            $turnoAee = strtolower(trim($dados['turno_atendimento']));

            // Validação de Contraturno Obrigatória (Fundeb / Censo Inep)
            $turnoRegular = null;
            if ($matriculaRegular->enturmacaoAtiva?->turma !== null) {
                $turnoRegular = strtolower(trim((string) $matriculaRegular->enturmacaoAtiva->turma->turno));
            }

            if ($turnoRegular !== null && $turnoRegular !== '') {
                $isRegularManha = str_contains($turnoRegular, 'manh') || str_contains($turnoRegular, 'matutino');
                $isRegularTarde = str_contains($turnoRegular, 'tard') || str_contains($turnoRegular, 'vespertino');
                $isAeeManha = str_contains($turnoAee, 'manh') || str_contains($turnoAee, 'matutino');
                $isAeeTarde = str_contains($turnoAee, 'tard') || str_contains($turnoAee, 'vespertino');

                if (($isRegularManha && $isAeeManha) || ($isRegularTarde && $isAeeTarde)) {
                    throw new LogicException("Conflito de contraturno: O estudante já estuda na classe regular no turno {$turnoRegular}. O AEE deve ocorrer no contraturno.");
                }
            }

            // Validação de Capacidade da Sala de Recursos
            $matriculasAtivas = EducaAeeEnrollment::where('resource_room_id', $sala->id)
                ->where('status', 'ativo')
                ->count();

            if ($matriculasAtivas >= $sala->capacidade_atendimento) {
                throw new LogicException("A Sala de Recursos '{$sala->nome}' atingiu sua capacidade máxima de {$sala->capacidade_atendimento} atendimentos.");
            }

            $matriculaAee = new EducaAeeEnrollment();
            $matriculaAee->student_profile_id = $perfil->id;
            $matriculaAee->resource_room_id = $sala->id;
            $matriculaAee->regular_enrollment_id = $matriculaRegular->id;
            $matriculaAee->turno_atendimento = $turnoAee;
            $matriculaAee->dias_semana = $dados['dias_semana'] ?? ['segunda', 'quarta'];
            $matriculaAee->horario_inicio = $dados['horario_inicio'] ?? null;
            $matriculaAee->horario_fim = $dados['horario_fim'] ?? null;
            $matriculaAee->frequencia_semanal = (int) ($dados['frequencia_semanal'] ?? 2);
            $matriculaAee->status = 'ativo';
            $matriculaAee->save();

            $this->audit->record(
                'educa',
                'educa.aee.enrollment.created',
                "educa_aee_enrollment:{$matriculaAee->id}",
                null,
                $matriculaAee->toArray()
            );

            return $matriculaAee;
        });
    }

    public function encerrarMatriculaAee(string $enrollmentAeeId, int $userId = 1): void
    {
        $matricula = EducaAeeEnrollment::findOrFail($enrollmentAeeId);
        $matricula->status = 'transferido';
        $matricula->save();

        $this->audit->record(
            'educa',
            'educa.aee.enrollment.closed',
            "educa_aee_enrollment:{$matricula->id}",
            null,
            ['status' => $matricula->status]
        );
    }
}
