<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Support\TenantContext;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Support\EscolaContext;
use Modules\Parecer\Support\Catalogo;

/**
 * Relatórios de conceitos (relatorios.php): distribuição A/EP/NA geral, por série, turma, matéria e aluno,
 * e o comparativo de um aluno com a turma e as outras turmas da série. Consultas com Query Builder:
 * tenant e escola são aplicados aqui explicitamente (não há global scope fora do Eloquent).
 */
final class RelatorioService
{
    private const SOMA = "SUM(CASE WHEN v.conceito='A' THEN 1 ELSE 0 END) a, SUM(CASE WHEN v.conceito='EP' THEN 1 ELSE 0 END) ep, SUM(CASE WHEN v.conceito='NA' THEN 1 ELSE 0 END) na, COUNT(*) total";

    public function __construct(
        private readonly TenantContext $tenant,
        private readonly EscolaContext $escola,
    ) {}

    /**
     * @param array{ano: int, tri: int, serie: int, turma: int, materia: string} $f
     * @param array<int, list<string>>|null $escopo turma_id => matérias visíveis (null = tudo)
     * @return array<string, mixed>
     */
    public function gerar(array $f, ?array $escopo): array
    {
        $base = fn (): Builder => $this->base($f['ano'])
            ->where('a.situacao', 'ativo')
            ->when($f['tri'] > 0, fn ($q) => $q->where('v.trimestre', $f['tri']))
            ->when($f['serie'] > 0, fn ($q) => $q->where('ps.serie', $f['serie']))
            ->when($f['turma'] > 0, fn ($q) => $q->where('t.id', $f['turma']))
            ->when($f['materia'] !== '', fn ($q) => $q->where('h.materia', $f['materia']))
            ->when($escopo !== null, fn ($q) => $this->aplicarEscopo($q, (array) $escopo));

        $linha = fn (object $r): array => ['a' => (int) $r->a, 'ep' => (int) $r->ep, 'na' => (int) $r->na, 'total' => (int) $r->total];
        $geral = $base()->selectRaw(self::SOMA)->first();
        $porMateria = $base()->selectRaw('h.materia chave, ' . self::SOMA)->groupBy('h.materia')->get()
            ->sortBy(fn ($r) => array_search($r->chave, array_keys(Catalogo::MATERIAS), true))->values();

        return [
            'geral' => $geral !== null ? $linha($geral) : ['a' => 0, 'ep' => 0, 'na' => 0, 'total' => 0],
            'por_serie' => $base()->selectRaw('ps.serie chave, ' . self::SOMA)->groupBy('ps.serie')->orderBy('ps.serie')->get()
                ->map(fn ($r): array => ['rotulo' => Catalogo::SERIES[(int) $r->chave], ...$linha($r)])->values(),
            'por_turma' => $base()->selectRaw('t.id, t.nome, ps.serie, tu.nome turno, ' . self::SOMA)->groupBy('t.id', 't.nome', 'ps.serie', 'tu.nome')->orderBy('ps.serie')->orderBy('t.nome')->get()
                ->map(fn ($r): array => ['turma_id' => (int) $r->id, 'rotulo' => Catalogo::SERIES[(int) $r->serie] . ' · ' . $r->nome, 'turno' => $r->turno, ...$linha($r)])->values(),
            'por_materia' => $porMateria->map(fn ($r): array => ['materia' => $r->chave, 'rotulo' => Catalogo::MATERIAS[$r->chave] ?? $r->chave, ...$linha($r)])->values(),
            'por_aluno' => $base()->selectRaw('a.id, a.nome, t.nome turma, ps.serie, tu.nome turno, ' . self::SOMA)->groupBy('a.id', 'a.nome', 't.nome', 'ps.serie', 'tu.nome')->orderBy('ps.serie')->orderBy('t.nome')->orderBy('a.nome')->get()
                ->map(fn ($r): array => ['aluno_id' => (int) $r->id, 'nome' => $r->nome, 'serie' => Catalogo::SERIES[(int) $r->serie], 'turma' => $r->turma, 'turno' => $r->turno, ...$linha($r)])->values(),
        ];
    }

    /**
     * Comparativo do aluno: ele × a própria turma × outras turmas da série × toda a série.
     *
     * @param list<string> $materias matérias visíveis na turma do aluno
     * @return array<string, mixed>|null
     */
    public function comparativo(int $ano, int $tri, int $alunoId, array $materias): ?array
    {
        $al = DB::table('escola_alunos as a')->join('escola_turmas as t', 't.id', '=', 'a.turma_id')
            ->join('parecer_turmas as ps', 'ps.turma_id', '=', 't.id')->leftJoin('escola_turnos as tu', 'tu.id', '=', 't.turno_id')
            ->where('a.tenant_id', $this->tenant->id())->where('ps.escola_id', $this->escola->id())->where('a.id', $alunoId)->where('t.ano_letivo', $ano)->whereNull('a.deleted_at')
            ->first(['a.id', 'a.nome', 't.id as turma_id', 't.nome as turma', 'ps.serie', 'tu.nome as turno']);
        if ($al === null || $materias === []) {
            return null;
        }
        $bc = fn (): Builder => $this->base($ano)->where('ps.serie', $al->serie)->whereIn('h.materia', $materias)->when($tri > 0, fn ($q) => $q->where('v.trimestre', $tri));
        $linha = fn (?object $r): array => ['a' => (int) ($r->a ?? 0), 'ep' => (int) ($r->ep ?? 0), 'na' => (int) ($r->na ?? 0), 'total' => (int) ($r->total ?? 0)];

        $linhas = [['rotulo' => '★ ' . $al->nome, 'tipo' => 'aluno', ...$linha($bc()->where('a.id', $alunoId)->selectRaw(self::SOMA)->first())]];
        $turmas = $bc()->where('a.situacao', 'ativo')->selectRaw('t.id, t.nome, tu.nome turno, ' . self::SOMA)->groupBy('t.id', 't.nome', 'tu.nome')->orderBy('t.nome')->get();
        $outras = 0;
        foreach ($turmas as $ts) {
            $propria = (int) $ts->id === (int) $al->turma_id;
            $outras += $propria ? 0 : 1;
            $linhas[] = ['rotulo' => ($propria ? 'Turma do aluno · ' : 'Outra turma · ') . Catalogo::SERIES[(int) $al->serie] . ' · ' . $ts->nome . ' (' . $ts->turno . ')', 'tipo' => $propria ? 'turma' : 'outra', ...$linha($ts)];
        }
        usort($linhas, fn ($x, $y): int => ['aluno' => 0, 'turma' => 1, 'outra' => 2][$x['tipo']] <=> ['aluno' => 0, 'turma' => 1, 'outra' => 2][$y['tipo']]);
        if ($outras > 0) {
            $linhas[] = ['rotulo' => 'Toda a série (' . Catalogo::SERIES[(int) $al->serie] . ')', 'tipo' => 'serie', ...$linha($bc()->where('a.situacao', 'ativo')->selectRaw(self::SOMA)->first())];
        }
        $porMateria = fn (callable $extra): array => $extra($bc())->selectRaw('h.materia, ' . self::SOMA)->groupBy('h.materia')->get()
            ->mapWithKeys(fn ($r): array => [$r->materia => $linha($r)])->all();

        return [
            'aluno' => ['id' => (int) $al->id, 'nome' => $al->nome, 'turma' => $al->turma, 'serie' => Catalogo::SERIES[(int) $al->serie], 'turno' => $al->turno],
            'linhas' => $linhas,
            'outras' => $outras,
            'materias' => $materias,
            'm_aluno' => $porMateria(fn ($q) => $q->where('a.id', $alunoId)),
            'm_turma' => $porMateria(fn ($q) => $q->where('a.situacao', 'ativo')->where('t.id', $al->turma_id)),
            'm_serie' => $outras > 0 ? $porMateria(fn ($q) => $q->where('a.situacao', 'ativo')) : [],
        ];
    }

    private function base(int $ano): Builder
    {
        return DB::table('parecer_avaliacoes as v')
            ->join('parecer_habilidades as h', 'h.id', '=', 'v.habilidade_id')
            ->join('escola_alunos as a', 'a.id', '=', 'v.aluno_id')
            ->join('escola_turmas as t', 't.id', '=', 'a.turma_id')
            ->join('parecer_turmas as ps', 'ps.turma_id', '=', 't.id')
            ->leftJoin('escola_turnos as tu', 'tu.id', '=', 't.turno_id')
            ->where('v.tenant_id', $this->tenant->id())
            ->where('v.escola_id', $this->escola->id())
            ->where('t.ano_letivo', $ano)
            ->where('h.ativo', true)
            ->whereNull('a.deleted_at');
    }

    /**
     * Cada turma entra só com as matérias que o usuário pode ver nela.
     *
     * @param array<int, list<string>> $escopo
     */
    private function aplicarEscopo(Builder $q, array $escopo): void
    {
        $q->where(function (Builder $w) use ($escopo): void {
            $algum = false;
            foreach ($escopo as $turmaId => $mats) {
                if ($mats === []) {
                    continue;
                }
                $algum = true;
                $w->orWhere(fn (Builder $p) => $p->where('t.id', $turmaId)->whereIn('h.materia', $mats));
            }
            if (!$algum) {
                $w->whereRaw('1 = 0');
            }
        });
    }
}
