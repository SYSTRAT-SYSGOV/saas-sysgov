<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaAeePei;
use Modules\Educa\Models\EducaAeePeiGoal;
use Modules\Educa\Models\EducaAeeStudentProfile;

/**
 * Gestão do Plano Educacional Individualizado (PEI) e Metas Pedagógicas Adaptadas.
 */
final class AeePeiService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     student_profile_id?: string|null,
     *     academic_year_id?: string|null,
     *     status?: string|null
     * } $filtros
     * @return Collection<int, EducaAeePei>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaAeePei::query()
            ->with(['studentProfile.pessoa', 'studentProfile.school', 'academicYear', 'goals'])
            ->orderBy('ano_letivo', 'desc')
            ->orderBy('semestre', 'desc');

        if (! empty($filtros['student_profile_id'])) {
            $query->where('student_profile_id', $filtros['student_profile_id']);
        }

        if (! empty($filtros['academic_year_id'])) {
            $query->where('academic_year_id', $filtros['academic_year_id']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        return $query->get();
    }

    public function obter(string $id): EducaAeePei
    {
        return EducaAeePei::with([
            'studentProfile.pessoa',
            'studentProfile.school',
            'academicYear',
            'goals',
            'elaboradoPor',
            'aprovadoPor',
        ])->findOrFail($id);
    }

    /**
     * @param array{
     *     student_profile_id: string,
     *     academic_year_id?: string|null,
     *     ano_letivo?: int|null,
     *     semestre?: int|null,
     *     habilidades_atuais?: string|null,
     *     necessidades_especificas?: string|null,
     *     adequacoes_curriculares?: string|null,
     *     adaptacoes_avaliativas?: string|null,
     *     metodologias_especificas?: string|null,
     *     status?: string|null
     * } $dados
     */
    public function criar(array $dados, int $userId = 1): EducaAeePei
    {
        return DB::transaction(function () use ($dados, $userId): EducaAeePei {
            $perfil = EducaAeeStudentProfile::findOrFail($dados['student_profile_id']);

            $academicYearId = $dados['academic_year_id'] ?? null;
            $anoLetivo = $dados['ano_letivo'] ?? null;

            if ($academicYearId !== null && $anoLetivo === null) {
                $anoLetivo = (int) EducaAcademicYear::findOrFail($academicYearId)->year;
            } elseif ($academicYearId === null) {
                $anoAtivo = EducaAcademicYear::where('status', 'ativo')->first()
                    ?? EducaAcademicYear::latest('year')->first();
                if ($anoAtivo !== null) {
                    $academicYearId = $anoAtivo->id;
                    $anoLetivo = (int) $anoAtivo->year;
                } else {
                    $anoLetivo = (int) date('Y');
                }
            }

            $pei = new EducaAeePei();
            $pei->student_profile_id = $perfil->id;
            $pei->academic_year_id = $academicYearId;
            $pei->ano_letivo = $anoLetivo;
            $pei->semestre = (int) ($dados['semestre'] ?? 1);
            $pei->habilidades_atuais = $dados['habilidades_atuais'] ?? null;
            $pei->necessidades_especificas = $dados['necessidades_especificas'] ?? null;
            $pei->adequacoes_curriculares = $dados['adequacoes_curriculares'] ?? null;
            $pei->adaptacoes_avaliativas = $dados['adaptacoes_avaliativas'] ?? null;
            $pei->metodologias_especificas = $dados['metodologias_especificas'] ?? null;
            $pei->status = $dados['status'] ?? 'ativo';
            $pei->elaborado_por_user_id = $userId;
            $pei->save();

            $this->audit->record(
                'educa',
                'educa.aee.pei.created',
                "educa_aee_pei:{$pei->id}",
                null,
                $pei->toArray()
            );

            return $pei;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(string $id, array $dados, int $userId = 1): EducaAeePei
    {
        return DB::transaction(function () use ($id, $dados): EducaAeePei {
            $pei = EducaAeePei::findOrFail($id);
            $pei->fill($dados);
            $pei->save();

            $this->audit->record(
                'educa',
                'educa.aee.pei.updated',
                "educa_aee_pei:{$pei->id}",
                null,
                $dados
            );

            return $pei;
        });
    }

    /**
     * @param array{
     *     goal_id?: string|null,
     *     area_desenvolvimento: string,
     *     objetivo: string,
     *     estrategias?: string|null,
     *     recursos?: string|null,
     *     indicadores_sucesso?: string|null,
     *     prazo_previsto?: string|null,
     *     status?: string|null,
     *     avaliacao_resultado?: string|null
     * } $metaDados
     */
    public function salvarMeta(string $peiId, array $metaDados, int $userId = 1): EducaAeePeiGoal
    {
        return DB::transaction(function () use ($peiId, $metaDados): EducaAeePeiGoal {
            $pei = EducaAeePei::findOrFail($peiId);

            if (! empty($metaDados['goal_id'])) {
                $meta = EducaAeePeiGoal::where('pei_id', $pei->id)->findOrFail($metaDados['goal_id']);
            } else {
                $meta = new EducaAeePeiGoal();
                $meta->pei_id = $pei->id;
            }

            $meta->area_desenvolvimento = $metaDados['area_desenvolvimento'];
            $meta->objetivo = $metaDados['objetivo'];
            $meta->estrategias = $metaDados['estrategias'] ?? $meta->estrategias;
            $meta->recursos = $metaDados['recursos'] ?? $meta->recursos;
            $meta->indicadores_sucesso = $metaDados['indicadores_sucesso'] ?? $meta->indicadores_sucesso;
            $meta->prazo_previsto = $metaDados['prazo_previsto'] ?? $meta->prazo_previsto;
            $meta->status = $metaDados['status'] ?? $meta->status ?? 'em_andamento';
            $meta->avaliacao_resultado = $metaDados['avaliacao_resultado'] ?? $meta->avaliacao_resultado;
            $meta->save();

            $this->audit->record(
                'educa',
                'educa.aee.pei.goal_saved',
                "educa_aee_pei_goal:{$meta->id}",
                null,
                $meta->toArray()
            );

            return $meta;
        });
    }

    public function registrarParecer(string $peiId, string $parecer, string $status = 'concluido', int $userId = 1): EducaAeePei
    {
        return DB::transaction(function () use ($peiId, $parecer, $status, $userId): EducaAeePei {
            $pei = EducaAeePei::findOrFail($peiId);
            $pei->parecer_descritivo = $parecer;
            $pei->status = $status;
            $pei->aprovado_por_user_id = $userId;
            $pei->save();

            $this->audit->record(
                'educa',
                'educa.aee.pei.parecer_registered',
                "educa_aee_pei:{$pei->id}",
                null,
                [
                    'status' => $pei->status,
                    'parecer' => $parecer,
                ]
            );

            return $pei;
        });
    }
}
