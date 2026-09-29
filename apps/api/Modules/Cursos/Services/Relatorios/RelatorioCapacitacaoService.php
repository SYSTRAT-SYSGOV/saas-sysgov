<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Relatorios;

use App\Support\TenantContext;
use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Models\Participante;
use Modules\OrgChart\Models\OrgUnit;

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
 *
 * Filtro por unidade (tarefa 2.4, D5): a unidade escolhida e suas subunidades por prefixo de
 * `path` (`OrgUnit::getSelfAndDescendantIds()`, que já separa os níveis por `.` para não casar
 * `1.1` com `1.10`). O vínculo usuário↔unidade é semijoin (`whereIn` por subconsulta), não
 * `join`, para um servidor com mais de uma unidade não duplicar linhas nem inflar as somas.
 */
final class RelatorioCapacitacaoService
{
    /** Ordenação livre exporia `ORDER BY` a entrada do usuário; só estas colunas são aceitas. */
    private const array ORDENACAO_PERMITIDA = ['nome' => 'p.nome', 'horas' => 'minutos', 'ultima_conclusao' => 'ultima_conclusao'];

    public function __construct(
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * @param array{inicio?: string|null, fim?: string|null, curso_id?: int|null, unidade_id?: int|null, ordenar_por?: string|null, direcao?: string|null, por_pagina?: int|null, pagina?: int|null} $filtros
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function relatorio(array $filtros): LengthAwarePaginator
    {
        $tenantId = $this->tenantContext->id();
        $porPagina = min(100, max(1, $filtros['por_pagina'] ?? 25));
        $pagina = max(1, $filtros['pagina'] ?? 1);
        $ordenarPor = self::ORDENACAO_PERMITIDA[$filtros['ordenar_por'] ?? 'nome'] ?? self::ORDENACAO_PERMITIDA['nome'];
        $direcao = strtolower($filtros['direcao'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
        $unidadeIds = $this->idsUnidadeEDescendentes(isset($filtros['unidade_id']) ? (int) $filtros['unidade_id'] : null);

        $total = $this->consultaBase($tenantId, $filtros['curso_id'] ?? null, $unidadeIds)->distinct()->count('p.id');

        [$condicaoPeriodo, $bindingsPeriodo] = $this->condicaoPeriodo($filtros['inicio'] ?? null, $filtros['fim'] ?? null);

        $linhas = $this->consultaAgregada($tenantId, $filtros['curso_id'] ?? null, $unidadeIds, $condicaoPeriodo, $bindingsPeriodo)
            ->orderBy($ordenarPor, $direcao)
            ->orderBy('p.id') // desempate estável
            ->forPage($pagina, $porPagina)
            ->get();

        $unidadesPorUsuario = $this->unidadesPorUsuario($tenantId, $linhas->pluck('user_id')->unique()->map(fn (mixed $id): int => (int) $id)->values()->all());

        /** @var array<int, array<string, mixed>> $dados */
        $dados = $linhas->map(fn (object $l): array => $this->linhaSaida($l, $unidadesPorUsuario))->all();

        return new LengthAwarePaginator($dados, $total, $porPagina, $pagina, ['path' => LengthAwarePaginator::resolveCurrentPath()]);
    }

    /**
     * Total de linhas do relatório para os mesmos filtros (tarefa 3.1, D6): usado pra recusar a
     * exportação antes de começar a transmitir, sem contar tudo duas vezes.
     *
     * @param array{inicio?: string|null, fim?: string|null, curso_id?: int|null, unidade_id?: int|null} $filtros
     */
    public function total(array $filtros): int
    {
        $tenantId = $this->tenantContext->id();
        $unidadeIds = $this->idsUnidadeEDescendentes(isset($filtros['unidade_id']) ? (int) $filtros['unidade_id'] : null);

        return $this->consultaBase($tenantId, isset($filtros['curso_id']) ? (int) $filtros['curso_id'] : null, $unidadeIds)->distinct()->count('p.id');
    }

    /**
     * Resolve os filtros e monta a consulta AGORA — a exportação chama isso durante a
     * requisição normal, com o `TenantContext` ainda disponível — e devolve uma função que só
     * transmite as linhas depois. Ela precisa ser assim porque o `callable` devolvido é chamado
     * de dentro do `streamDownload` do controller, cujo `callback` só roda depois que a resposta
     * já saiu da pilha de middlewares (o `finally` do `ResolveTenant` já limpou o
     * `TenantContext` a essa altura), então nada dentro dele pode depender do `TenantContext`
     * outra vez — só da consulta já montada com os valores literais capturados aqui.
     *
     * Mesma consulta de `relatorio()` (D2): a exportação nunca pode divergir do que a tela
     * mostraria pros mesmos filtros. Lê em blocos de `$tamanhoDoBloco` (tarefa 3.1, D6) pra não
     * carregar o tenant inteiro de uma vez na memória.
     *
     * @param array{inicio?: string|null, fim?: string|null, curso_id?: int|null, unidade_id?: int|null} $filtros
     * @return Closure(callable(array<string, mixed>): void): void
     */
    public function prepararExportacao(array $filtros, int $tamanhoDoBloco = 500): Closure
    {
        $tenantId = $this->tenantContext->id();
        $cursoId = isset($filtros['curso_id']) ? (int) $filtros['curso_id'] : null;
        $unidadeIds = $this->idsUnidadeEDescendentes(isset($filtros['unidade_id']) ? (int) $filtros['unidade_id'] : null);
        [$condicaoPeriodo, $bindingsPeriodo] = $this->condicaoPeriodo($filtros['inicio'] ?? null, $filtros['fim'] ?? null);

        $query = $this->consultaAgregada($tenantId, $cursoId, $unidadeIds, $condicaoPeriodo, $bindingsPeriodo)->orderBy('p.id');

        return function (callable $callback) use ($query, $tenantId, $tamanhoDoBloco): void {
            $query->chunkById($tamanhoDoBloco, function ($linhas) use ($callback, $tenantId): void {
                $userIds = $linhas->pluck('user_id')->unique()->map(fn (mixed $id): int => (int) $id)->values()->all();
                $unidadesPorUsuario = $this->unidadesPorUsuario($tenantId, $userIds);
                foreach ($linhas as $l) {
                    $callback($this->linhaSaida($l, $unidadesPorUsuario));
                }
            }, 'p.id', 'participante_id');
        };
    }

    /**
     * Unidades do tenant para o seletor do filtro (tarefa 2.5, D5): id, nome e path, sem os
     * demais campos do OrgChart. Existe porque o Administrador do Cursos pode não ter acesso
     * ao módulo OrgChart (a política de `OrgUnit` exige papel do organograma ou `org.view`).
     *
     * @return list<array{id: int, nome: string, path: string}>
     */
    public function unidades(): array
    {
        return OrgUnit::query()
            ->where('is_active', true)
            ->orderBy('path')
            ->get(['id', 'name', 'path'])
            ->map(fn (OrgUnit $unidade): array => ['id' => $unidade->id, 'nome' => $unidade->name, 'path' => $unidade->path])
            ->all();
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

    /** @param list<int>|null $unidadeIds null = sem filtro de unidade */
    private function consultaBase(int $tenantId, ?int $cursoId, ?array $unidadeIds): Builder
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
            ->whereNotNull('p.user_id')
            ->when($unidadeIds !== null, function (Builder $q) use ($tenantId, $unidadeIds): void {
                $q->whereIn('p.user_id', function ($sub) use ($tenantId, $unidadeIds): void {
                    $sub->select('user_id')->from('org_unit_user')->where('tenant_id', $tenantId)->whereIn('org_unit_id', $unidadeIds);
                });
            });
    }

    /**
     * Consulta agregada compartilhada por `relatorio()` e `exportar()` (D2): mesmas colunas,
     * mesmos filtros — a exportação nunca pode calcular um número diferente do que a tela
     * mostraria pros mesmos filtros.
     *
     * @param list<int>|null $unidadeIds
     * @param list<string> $bindingsPeriodo
     */
    private function consultaAgregada(int $tenantId, ?int $cursoId, ?array $unidadeIds, string $condicaoPeriodo, array $bindingsPeriodo): Builder
    {
        return $this->consultaBase($tenantId, $cursoId, $unidadeIds)
            ->selectRaw(
                "p.id as participante_id, p.user_id, p.nome, p.email,
                 SUM(CASE WHEN i.status = 'confirmada' THEN 1 ELSE 0 END) as em_andamento,
                 SUM(CASE WHEN i.status = 'concluida'{$condicaoPeriodo} THEN 1 ELSE 0 END) as concluidos,
                 SUM(CASE WHEN i.status = 'concluida'{$condicaoPeriodo} AND cert.id IS NOT NULL THEN c.carga_horaria_minutos ELSE 0 END) as minutos,
                 MAX(CASE WHEN i.status = 'concluida'{$condicaoPeriodo} THEN i.concluida_em ELSE NULL END) as ultima_conclusao",
                [...$bindingsPeriodo, ...$bindingsPeriodo, ...$bindingsPeriodo],
            )
            ->groupBy('p.id', 'p.user_id', 'p.nome', 'p.email');
    }

    /**
     * @param array<int, list<string>> $unidadesPorUsuario
     * @return array<string, mixed>
     */
    private function linhaSaida(object $l, array $unidadesPorUsuario): array
    {
        return [
            'participante_id' => (int) $l->participante_id,
            'nome' => (string) $l->nome,
            'email' => (string) $l->email,
            'cursos_concluidos' => (int) $l->concluidos,
            'horas_capacitacao_minutos' => (int) $l->minutos,
            'cursos_em_andamento' => (int) $l->em_andamento,
            'ultima_conclusao' => $l->ultima_conclusao,
            'unidades' => $unidadesPorUsuario[(int) $l->user_id] ?? [],
        ];
    }

    /**
     * @return list<int>|null null = sem filtro; lista vazia = unidade inexistente no tenant (zero resultados)
     */
    private function idsUnidadeEDescendentes(?int $unidadeId): ?array
    {
        if ($unidadeId === null) {
            return null;
        }

        return OrgUnit::find($unidadeId)?->getSelfAndDescendantIds() ?? [];
    }

    /**
     * @param list<int> $userIds
     * @return array<int, list<string>>
     */
    private function unidadesPorUsuario(int $tenantId, array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        return DB::table('org_unit_user as ouu')
            ->join('org_units as u', fn ($j) => $j->on('u.id', '=', 'ouu.org_unit_id')->where('u.tenant_id', $tenantId)->whereNull('u.deleted_at'))
            ->where('ouu.tenant_id', $tenantId)
            ->whereIn('ouu.user_id', $userIds)
            ->orderBy('u.name')
            ->select(['ouu.user_id', 'u.name'])
            ->get()
            ->groupBy('user_id')
            ->map(fn ($linhas) => $linhas->pluck('name')->all())
            ->all();
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
