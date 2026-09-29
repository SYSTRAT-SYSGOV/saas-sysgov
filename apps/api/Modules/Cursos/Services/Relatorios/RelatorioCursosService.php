<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Relatorios;

use App\Support\TenantContext;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Turma;

/**
 * Relatório de cursos por período (Relatórios do Cursos, tarefa 2.2, design D1/D2/D3).
 *
 * Consulta agregada no banco: uma linha por turma do período, com `tenant_id` explícito em
 * toda junção (o escopo global do `TenantAware` só filtra a tabela-base). Os totais do curso e
 * do período são somas dessas linhas em PHP — nunca uma segunda consulta que poderia divergir.
 * A frequência e a nota vêm das colunas apuradas no encerramento (`frequencia_apurada`,
 * `nota_apurada`), nulas em turmas abertas: por isso `SUM`/contagem sobre elas já ignora,
 * automaticamente, quem ainda não encerrou (cenário "Turma aberta no período").
 */
final class RelatorioCursosService
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly IndicadoresRelatorio $indicadores,
    ) {}

    /**
     * @param array{inicio: string, fim: string, tipo?: string|null, curso_id?: int|null} $filtros
     * @return array{cursos: list<array<string, mixed>>, totais: array<string, mixed>}
     */
    public function relatorio(array $filtros): array
    {
        $tenantId = $this->tenantContext->id();

        $turmaIds = Turma::query()
            ->join('cursos_cursos as cc', fn ($j) => $j->on('cc.id', '=', 'cursos_turmas.curso_id')->where('cc.tenant_id', $tenantId))
            ->where('cursos_turmas.tenant_id', $tenantId)
            ->whereBetween('cursos_turmas.data_inicio', [$filtros['inicio'], $filtros['fim']])
            ->when($filtros['tipo'] ?? null, fn ($q, $tipo) => $q->where('cc.tipo', $tipo))
            ->when($filtros['curso_id'] ?? null, fn ($q, $cursoId) => $q->where('cursos_turmas.curso_id', $cursoId))
            ->pluck('cursos_turmas.id');

        if ($turmaIds->isEmpty()) {
            return ['cursos' => [], 'totais' => $this->linhaVazia()];
        }

        $linhasTurma = $this->linhasComCertificados($tenantId, $turmaIds->all());
        $cursos = Curso::query()->whereIn('id', $linhasTurma->pluck('curso_id')->unique())->get()->keyBy('id');

        $cursosSaida = $linhasTurma
            ->groupBy('curso_id')
            ->map(function (Collection $linhasDoCurso, int $cursoId) use ($cursos): array {
                $curso = $cursos->get($cursoId);
                $resumo = $this->resumirContagens($linhasDoCurso);
                $certificadosValidos = (int) $linhasDoCurso->sum('certificados_validos');

                return [
                    'curso_id' => $cursoId,
                    'titulo' => $curso->titulo,
                    'tipo' => $curso->tipo,
                    ...$resumo,
                    'horas_certificadas_minutos' => $this->indicadores->horasCertificadasMinutos((int) $curso->carga_horaria_minutos, $certificadosValidos),
                    'turmas_detalhe' => $linhasDoCurso
                        ->map(fn (array $l): array => [
                            'turma_id' => $l['turma_id'],
                            'turma_nome' => $l['turma_nome'],
                            'turma_status' => $l['turma_status'],
                            'inscricoes' => $l['inscricoes'],
                            'concluidos' => $l['concluidos'],
                            'nao_concluidos' => $l['nao_concluidos'],
                            'taxa_conclusao' => $this->indicadores->taxaConclusao($l['concluidos'], $l['nao_concluidos']),
                            'frequencia_media' => $this->indicadores->media($l['soma_frequencia'], $l['qtd_frequencia']),
                            'nota_media' => $this->indicadores->media($l['soma_nota'], $l['qtd_nota']),
                            'certificados_emitidos' => $l['certificados_emitidos'],
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->values();

        return [
            'cursos' => $cursosSaida->all(),
            'totais' => [
                ...$this->resumirContagens($linhasTurma, turmas: $cursosSaida->sum('turmas')),
                'horas_certificadas_minutos' => (int) $cursosSaida->sum('horas_certificadas_minutos'),
            ],
        ];
    }

    /**
     * Uma linha por turma do período, já com a contagem de certificados emitidos e válidos.
     *
     * @param list<int> $turmaIds
     * @return Collection<int, array<string, mixed>>
     */
    private function linhasComCertificados(int $tenantId, array $turmaIds): Collection
    {
        $linhas = DB::table('cursos_turmas as t')
            ->leftJoin('cursos_inscricoes as i', function ($j) use ($tenantId): void {
                $j->on('i.turma_id', '=', 't.id')
                    ->where('i.tenant_id', $tenantId)
                    ->whereIn('i.status', IndicadoresRelatorio::STATUS_BASE);
            })
            ->where('t.tenant_id', $tenantId)
            ->whereIn('t.id', $turmaIds)
            ->groupBy('t.id', 't.curso_id', 't.nome', 't.status')
            ->select([
                't.id as turma_id', 't.curso_id', 't.nome as turma_nome', 't.status as turma_status',
                DB::raw('COUNT(i.id) as inscricoes'),
                DB::raw("SUM(CASE WHEN i.status = 'concluida' THEN 1 ELSE 0 END) as concluidos"),
                DB::raw("SUM(CASE WHEN i.status = 'nao_concluida' THEN 1 ELSE 0 END) as nao_concluidos"),
                DB::raw('SUM(i.frequencia_apurada) as soma_frequencia'),
                DB::raw('SUM(CASE WHEN i.frequencia_apurada IS NOT NULL THEN 1 ELSE 0 END) as qtd_frequencia'),
                DB::raw('SUM(i.nota_apurada) as soma_nota'),
                DB::raw('SUM(CASE WHEN i.nota_apurada IS NOT NULL THEN 1 ELSE 0 END) as qtd_nota'),
            ])
            ->get();

        $certificados = DB::table('cursos_certificados as c')
            ->join('cursos_inscricoes as i', fn ($j) => $j->on('i.id', '=', 'c.inscricao_id')->where('i.tenant_id', $tenantId))
            ->where('c.tenant_id', $tenantId)
            ->whereIn('i.turma_id', $turmaIds)
            ->groupBy('i.turma_id')
            ->select(['i.turma_id', DB::raw('COUNT(*) as emitidos'), DB::raw('SUM(CASE WHEN c.revogado_em IS NULL THEN 1 ELSE 0 END) as validos')])
            ->get()
            ->keyBy('turma_id');

        /** @var Collection<int, array<string, mixed>> $resultado */
        $resultado = $linhas->map(function (object $linha) use ($certificados): array {
            $cert = $certificados->get($linha->turma_id);

            return [
                'turma_id' => (int) $linha->turma_id,
                'curso_id' => (int) $linha->curso_id,
                'turma_nome' => (string) $linha->turma_nome,
                'turma_status' => (string) $linha->turma_status,
                'inscricoes' => (int) $linha->inscricoes,
                'concluidos' => (int) $linha->concluidos,
                'nao_concluidos' => (int) $linha->nao_concluidos,
                'soma_frequencia' => $linha->soma_frequencia === null ? 0.0 : (float) $linha->soma_frequencia,
                'qtd_frequencia' => (int) $linha->qtd_frequencia,
                'soma_nota' => $linha->soma_nota === null ? 0.0 : (float) $linha->soma_nota,
                'qtd_nota' => (int) $linha->qtd_nota,
                'certificados_emitidos' => $cert === null ? 0 : (int) $cert->emitidos,
                'certificados_validos' => $cert === null ? 0 : (int) $cert->validos,
            ];
        });

        return $resultado;
    }

    /**
     * @param Collection<int, array<string, mixed>> $linhas
     * @return array<string, mixed>
     */
    private function resumirContagens(Collection $linhas, ?int $turmas = null): array
    {
        $concluidos = (int) $linhas->sum('concluidos');
        $naoConcluidos = (int) $linhas->sum('nao_concluidos');

        return [
            'turmas' => $turmas ?? $linhas->count(),
            'inscricoes' => (int) $linhas->sum('inscricoes'),
            'concluidos' => $concluidos,
            'nao_concluidos' => $naoConcluidos,
            'taxa_conclusao' => $this->indicadores->taxaConclusao($concluidos, $naoConcluidos),
            'frequencia_media' => $this->indicadores->media((float) $linhas->sum('soma_frequencia'), (int) $linhas->sum('qtd_frequencia')),
            'nota_media' => $this->indicadores->media((float) $linhas->sum('soma_nota'), (int) $linhas->sum('qtd_nota')),
            'certificados_emitidos' => (int) $linhas->sum('certificados_emitidos'),
        ];
    }

    /** @return array<string, mixed> */
    private function linhaVazia(): array
    {
        return ['turmas' => 0, 'inscricoes' => 0, 'concluidos' => 0, 'nao_concluidos' => 0, 'taxa_conclusao' => null, 'frequencia_media' => null, 'nota_media' => null, 'horas_certificadas_minutos' => 0, 'certificados_emitidos' => 0];
    }
}
