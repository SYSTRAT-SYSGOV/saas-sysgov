<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;

/**
 * Serviço de Negócio para Unidades Escolares e Capacidade de Atendimento.
 */
final class SchoolService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Lista escolas aplicando filtros de busca, zona e situação.
     *
     * @param array{busca?: string|null, zona?: string|null, situacao?: string|null} $filtros
     * @return Collection<int, EducaSchool>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaSchool::query()->with('orgUnit');

        if (!empty($filtros['busca'])) {
            $busca = (string) $filtros['busca'];
            $query->where(function ($q) use ($busca): void {
                $q->where('sigla', 'like', "%{$busca}%")
                    ->orWhere('codigo_inep', 'like', "%{$busca}%")
                    ->orWhereHas('orgUnit', function ($oq) use ($busca): void {
                        $oq->where('name', 'like', "%{$busca}%");
                    });
            });
        }

        if (!empty($filtros['zona'])) {
            $query->where('zona', $filtros['zona']);
        }

        if (!empty($filtros['situacao'])) {
            $query->where('situacao_funcionamento', $filtros['situacao']);
        }

        return $query->orderBy('sigla')->get();
    }

    /**
     * Cadastra extensão educacional para uma OrgUnit.
     *
     * @param array{
     *     tenant_id: int,
     *     org_unit_id: int,
     *     codigo_inep?: string|null,
     *     sigla: string,
     *     situacao_funcionamento: string,
     *     dependencia_administrativa: string,
     *     zona: string,
     *     regulamentada?: bool
     * } $dados
     */
    public function criar(array $dados): EducaSchool
    {
        $tenantId = $dados['tenant_id'];
        $orgUnitId = $dados['org_unit_id'];
        $inep = $dados['codigo_inep'] ?? null;

        if (EducaSchool::where('org_unit_id', $orgUnitId)->exists()) {
            throw new LogicException('A unidade organizacional informada já possui extensão educacional cadastrada.');
        }

        if ($inep !== null && EducaSchool::where('codigo_inep', $inep)->exists()) {
            throw new LogicException("Já existe uma escola com o código INEP {$inep} cadastrada neste município.");
        }

        return DB::transaction(function () use ($dados): EducaSchool {
            $school = EducaSchool::create($dados);
            $school->load('orgUnit');

            $this->audit->record('educa', 'school.created', "EducaSchool #{$school->id}", null, $school->toArray());

            return $school;
        });
    }

    /**
     * Atualiza dados e parâmetros educacionais da escola.
     *
     * @param array{
     *     codigo_inep?: string|null,
     *     sigla?: string,
     *     situacao_funcionamento?: string,
     *     zona?: string,
     *     regulamentada?: bool
     * } $dados
     */
    public function atualizar(EducaSchool $school, array $dados): EducaSchool
    {
        if (array_key_exists('codigo_inep', $dados) && $dados['codigo_inep'] !== null) {
            $conflito = EducaSchool::where('codigo_inep', $dados['codigo_inep'])
                ->where('id', '!=', $school->id)
                ->exists();

            if ($conflito) {
                throw new LogicException("Já existe outra escola cadastrada com o código INEP {$dados['codigo_inep']}.");
            }
        }

        $old = $school->toArray();
        $school->update($dados);
        $school->load('orgUnit');

        $this->audit->record('educa', 'school.updated', "EducaSchool #{$school->id}", $old, $school->fresh()->toArray());

        return $school->fresh();
    }

    /**
     * Calcula a capacidade total de atendimento somando a lotação das turmas ativas por turno.
     *
     * @return array{
     *     ano: int,
     *     turnos: array{
     *         matutino: int,
     *         vespertino: int,
     *         noturno: int,
     *         integral: int,
     *         total_rede: int
     *     }
     * }
     */
    public function obterCapacidadePorTurno(EducaSchool $school, int $ano): array
    {
        $turmas = EducaSchoolClass::query()
            ->where('school_id', $school->id)
            ->where('status', 'ativa')
            ->whereHas('anoLetivo', function ($q) use ($ano): void {
                $q->where('ano', $ano);
            })
            ->get();

        $turnosMap = [
            'matutino' => 0,
            'vespertino' => 0,
            'noturno' => 0,
            'integral' => 0,
        ];

        foreach ($turmas as $turma) {
            $turno = $turma->turno;
            if (isset($turnosMap[$turno])) {
                $turnosMap[$turno] += (int) $turma->lotacao_maxima;
            }
        }

        $totalRede = array_sum($turnosMap);

        return [
            'ano' => $ano,
            'turnos' => [
                'matutino' => $turnosMap['matutino'],
                'vespertino' => $turnosMap['vespertino'],
                'noturno' => $turnosMap['noturno'],
                'integral' => $turnosMap['integral'],
                'total_rede' => $totalRede,
            ],
        ];
    }
}
