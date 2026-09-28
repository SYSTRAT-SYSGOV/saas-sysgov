<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Relatorios;

use App\Support\TenantContext;
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Models\Participante;

/**
 * Relatório de capacitação por servidor (Relatórios do Cursos, tarefa 2.3, design D4/D5).
 *
 * Uma linha por servidor com pelo menos uma inscrição na base (spec: aparece mesmo sem
 * conclusão no período). O filtro de período restringe só o que conta como conclusão — nunca
 * quem aparece na lista —, por isso ele entra dentro de cada agregação condicional
 * (`SUM(CASE WHEN ...)`), não no `WHERE` da consulta.
 *
 * Só servidores: `user_id` não nulo (a Fase 3, ainda não implementada, reserva `user_id` nulo
 * ao participante externo — quando a coluna `origem` existir, o filtro passa a usá-la também).
 * O filtro por unidade organizacional entra na tarefa 2.4.
 */
final class RelatorioCapacitacaoService
{
    /** Ordenação livre exporia `ORDER BY` a entrada do usuário; só estas colunas são aceitas. */
    private const array ORDENACAO_PERMITIDA = ['nome' => 'p.nome', 'horas' => 'minutos', 'ultima_conclusao' => 'ultima_conclusao'];

    public function __construct(
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * @param array{inicio?: string|null, fim?: string|null, curso_id?: int|null, ordenar_por?: string|null, direcao?: string|null, por_pagina?: int|null, pagina?: int|null} $filtros
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function relatorio(array $filtros): LengthAwarePaginator
    {
        $tenantId = $this->tenantContext->id();
        $porPagina = min(100, max(1, $filtros['por_pagina'] ?? 25));
        $pagina = max(1, $filtros['pagina'] ?? 1);
        $ordenarPor = self::ORDENACAO_PERMITIDA[$filtros['ordenar_por'] ?? 'nome'] ?? self::ORDENACAO_PERMITIDA['nome'];
        $direcao = strtolower($filtros['direcao'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        $total = $this->consultaBase($tenantId, $filtros['curso_id'] ?? null)->distinct()->count('p.id');

        [$condicaoPeriodo, $bindingsPeriodo] = $this->condicaoPeriodo($filtros['inicio'] ?? null, $filtros['fim'] ?? null);

        $linhas = $this->consultaBase($tenantId, $filtros['curso_id'] ?? null)
            ->selectRaw(
                "p.id as participante_id, p.nome, p.email,
                 SUM(CASE WHEN i.status = 'confirmada' THEN 1 ELSE 0 END) as em_andamento,
                 SUM(CASE WHEN i.status = 'concluida'{$condicaoPeriodo} THEN 1 ELSE 0 END) as concluidos,
                 SUM(CASE WHEN i.status = 'concluida'{$condicaoPeriodo} AND cert.id IS NOT NULL THEN c.carga_horaria_minutos ELSE 0 END) as minutos,
                 MAX(CASE WHEN i.status = 'concluida'{$condicaoPeriodo} THEN i.concluida_em ELSE NULL END) as ultima_conclusao",
                [...$bindingsPeriodo, ...$bindingsPeriodo, ...$bindingsPeriodo],
            )
            ->groupBy('p.id', 'p.nome', 'p.email')
            ->orderBy($ordenarPor, $direcao)
            ->orderBy('p.id') // desempate estável
            ->forPage($pagina, $porPagina)
            ->get();

        /** @var array<int, array<string, mixed>> $dados */
        $dados = $linhas->map(fn (object $l): array => [
            'participante_id' => (int) $l->participante_id,
            'nome' => (string) $l->nome,
            'email' => (string) $l->email,
            'cursos_concluidos' => (int) $l->concluidos,
            'horas_capacitacao_minutos' => (int) $l->minutos,
            'cursos_em_andamento' => (int) $l->em_andamento,
            'ultima_conclusao' => $l->ultima_conclusao,
        ])->all();

        return new LengthAwarePaginator($dados, $total, $porPagina, $pagina, ['path' => LengthAwarePaginator::resolveCurrentPath()]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function detalhe(Participante $participante): ?array
    {
        if ($participante->user_id === null) {
            return null;
        }

        $cursos = DB::table('cursos_inscricoes as i')
            ->join('cursos_turmas as t', fn ($j) => $j->on('t.id', '=', 'i.turma_id')->where('t.tenant_id', $participante->tenant_id))
            ->join('cursos_cursos as c', fn ($j) => $j->on('c.id', '=', 't.curso_id')->where('c.tenant_id', $participante->tenant_id))
            ->leftJoin('cursos_certificados as cert', fn ($j) => $j->on('cert.inscricao_id', '=', 'i.id')->where('cert.tenant_id', $participante->tenant_id))
            ->where('i.tenant_id', $participante->tenant_id)
            ->where('i.participante_id', $participante->id)
            ->where('i.status', 'concluida')
            ->orderByDesc('i.concluida_em')
            ->select([
                'c.titulo as curso_titulo', 'c.carga_horaria_minutos', 'i.concluida_em',
                'cert.codigo as certificado_codigo', 'cert.revogado_em as certificado_revogado_em',
            ])
            ->get()
            ->map(fn (object $l): array => [
                'curso_titulo' => (string) $l->curso_titulo,
                'carga_horaria_minutos' => (int) $l->carga_horaria_minutos,
                'concluida_em' => $l->concluida_em,
                'certificado_codigo' => $l->certificado_codigo,
                'certificado_valido' => $l->certificado_codigo !== null && $l->certificado_revogado_em === null,
            ])
            ->values()
            ->all();

        return [
            'participante_id' => $participante->id,
            'nome' => $participante->nome,
            'email' => $participante->email,
            'cursos' => $cursos,
        ];
    }

    private function consultaBase(int $tenantId, ?int $cursoId): Builder
    {
        return DB::table('cursos_participantes as p')
            ->join('cursos_inscricoes as i', function ($j) use ($tenantId): void {
                $j->on('i.participante_id', '=', 'p.id')
                    ->where('i.tenant_id', $tenantId)
                    ->whereIn('i.status', IndicadoresRelatorio::STATUS_BASE);
            })
            ->join('cursos_turmas as t', fn ($j) => $j->on('t.id', '=', 'i.turma_id')->where('t.tenant_id', $tenantId))
            ->join('cursos_cursos as c', function ($j) use ($tenantId, $cursoId): void {
                $j->on('c.id', '=', 't.curso_id')->where('c.tenant_id', $tenantId);
                if ($cursoId !== null) {
                    $j->where('c.id', $cursoId);
                }
            })
            ->leftJoin('cursos_certificados as cert', fn ($j) => $j->on('cert.inscricao_id', '=', 'i.id')->where('cert.tenant_id', $tenantId)->whereNull('cert.revogado_em'))
            ->where('p.tenant_id', $tenantId)
            ->whereNotNull('p.user_id');
    }

    /** @return array{0: string, 1: list<string>} fragmento SQL (vazio se sem período) e os bindings dele */
    private function condicaoPeriodo(?string $inicio, ?string $fim): array
    {
        if ($inicio === null || $fim === null) {
            return ['', []];
        }

        return [' AND i.concluida_em BETWEEN ? AND ?', [$inicio, $fim]];
    }
}
