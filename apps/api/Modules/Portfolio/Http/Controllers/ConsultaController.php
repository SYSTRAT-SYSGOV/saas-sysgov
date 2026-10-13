<?php

declare(strict_types=1);

namespace Modules\Portfolio\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Portfolio\Http\Resources\TrabalhoResource;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\DesempenhoService;
use Modules\Portfolio\Services\EscopoPortfolio;
use Modules\Portfolio\Support\Avaliacao;

final class ConsultaController extends Controller
{
    public function __construct(private readonly DesempenhoService $desempenho) {}

    public function turmas(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->escopo()->podeVer($user), 403);
        $turmas = Turma::query()
            ->where('ano_letivo', $this->ano($request))
            ->when($this->escopo()->restrito($user), fn ($q) => $q->whereIn('id', $this->escopo()->turmasDoProfessor($user)))
            ->orderBy('nome')
            ->get(['id', 'nome', 'ano_letivo']);
        $contagem = Aluno::query()->whereIn('turma_id', $turmas->pluck('id'))
            ->selectRaw('turma_id, count(*) as total')->groupBy('turma_id')->pluck('total', 'turma_id');

        return response()->json(['turmas' => $turmas->map(fn (Turma $t): array => [
            'id' => $t->id, 'nome' => $t->nome, 'ano_letivo' => $t->ano_letivo, 'alunos' => (int) ($contagem[$t->id] ?? 0),
        ])->values()]);
    }

    public function alunos(Request $request, Turma $turma): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->escopo()->podeVerTurma($user, $turma->id), 404);
        $alunos = Aluno::query()->where('turma_id', $turma->id)->orderBy('numero')->orderBy('nome')->get(['id', 'nome', 'numero', 'situacao']);
        $porAluno = $this->periodo($request, $this->escopo()->restringir(Trabalho::query(), $user))
            ->whereIn('aluno_id', $alunos->pluck('id'))
            ->get(['aluno_id', 'avaliacao_decimos'])
            ->groupBy('aluno_id');

        return response()->json(['alunos' => $alunos->map(function (Aluno $a) use ($porAluno): array {
            /** @var list<int> $notas */
            $notas = ($porAluno[$a->id] ?? collect())->pluck('avaliacao_decimos')->all();
            $media = Avaliacao::media($notas);

            return [
                'id' => $a->id, 'nome' => $a->nome, 'numero' => $a->numero, 'situacao' => $a->situacao,
                'total_trabalhos' => count($notas), 'media' => $media !== null ? Avaliacao::numero($media) : null,
            ];
        })->values()]);
    }

    public function materias(Request $request, Turma $turma): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->escopo()->podeVerTurma($user, $turma->id), 404);
        $vinculos = TurmaMateria::query()->with('materia:id,nome')->where('turma_id', $turma->id)->get();
        $lancaveis = $vinculos->filter(fn (TurmaMateria $v): bool => $this->escopo()->podeLancar($user, $turma->id, $v->materia_id));

        return response()->json([
            'materias' => $lancaveis
                ->map(fn (TurmaMateria $v): array => ['id' => $v->materia_id, 'nome' => $v->materia?->nome])
                ->sortBy('nome')->values(),
            // Turma sem nenhuma matéria vinculada no Cadastro Escolar (a tela orienta a vincular).
            'sem_vinculos' => $vinculos->isEmpty(),
        ]);
    }

    public function trabalhos(Request $request, Aluno $aluno): JsonResponse
    {
        return response()->json(['data' => TrabalhoResource::collection($this->trabalhosDoAluno($request, $aluno))->resolve($request)]);
    }

    public function desempenho(Request $request, Aluno $aluno): JsonResponse
    {
        $trabalhos = $this->trabalhosDoAluno($request, $aluno);

        return response()->json($this->desempenho->calcular($trabalhos, !$request->integer('trimestre')));
    }

    /** @return Collection<int, Trabalho> */
    public function trabalhosDoAluno(Request $request, Aluno $aluno): Collection
    {
        $user = $request->user();
        abort_unless($this->escopo()->podeVerAluno($user, $aluno), 404);

        return $this->periodo($request, $this->escopo()->restringir(Trabalho::query(), $user))
            ->where('aluno_id', $aluno->id)
            ->with(['turma:id,nome', 'materia:id,nome', 'autor:id,name', 'imagens'])
            ->orderByDesc('data')->orderByDesc('id')
            ->get();
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<Trabalho> $query
     * @return \Illuminate\Database\Eloquent\Builder<Trabalho>
     */
    private function periodo(Request $request, $query)
    {
        $trimestre = $request->integer('trimestre') ?: null;

        return $query->where('ano_letivo', $this->ano($request))
            ->when($trimestre !== null, fn ($q) => $q->where('trimestre', $trimestre));
    }

    private function ano(Request $request): int
    {
        return $request->integer('ano') ?: (int) now()->year;
    }

    private function escopo(): EscopoPortfolio
    {
        return EscopoPortfolio::daRequisicao();
    }
}
