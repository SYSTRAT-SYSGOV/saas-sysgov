<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Support\LeitorCsv;
use Modules\Pedagogico\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Pedagogico\Http\Requests\ImportarNotasRequest;
use Modules\Pedagogico\Http\Requests\LancarNotasRequest;
use Modules\Pedagogico\Models\Nota;
use Modules\Pedagogico\Services\EscopoProfessor;
use Modules\Pedagogico\Services\NotaService;

final class NotaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly NotaService $notas,
        private readonly EscopoProfessor $escopo,
    ) {}

    /** Notas de uma turma × matéria × ano × trimestre. */
    public function index(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'turma_id' => ['required', 'integer'],
            'materia_id' => ['required', 'integer'],
            'ano_letivo' => ['required', 'integer'],
            'trimestre' => ['sometimes', 'integer', 'in:1,2,3'],
        ]);
        $gate = Gate::forUser($request->user());
        abort_unless($gate->allows('pedagogico.ver-turma', [(int) $dados['turma_id']]), 403);
        abort_unless($gate->allows('pedagogico.lancar-nota', [(int) $dados['turma_id'], (int) $dados['materia_id']]) || $gate->allows('pedagogico.gerir-notas'), 403);

        $alunos = Aluno::query()->where('turma_id', (int) $dados['turma_id'])->pluck('id');
        $notas = Nota::query()
            ->whereIn('aluno_id', $alunos)
            ->where('materia_id', (int) $dados['materia_id'])
            ->where('ano_letivo', (int) $dados['ano_letivo'])
            ->when(isset($dados['trimestre']), fn ($q) => $q->where('trimestre', (int) $dados['trimestre']))
            ->orderBy('aluno_id')->orderBy('trimestre')
            ->get();

        return response()->json($notas);
    }

    /** Lançamento unitário ou em lote (substitui a nota da mesma combinação). */
    /** Média anual de cada aluno visível (todas as matérias e trimestres), para o painel. */
    public function medias(Request $request): JsonResponse
    {
        $dados = $request->validate(['ano_letivo' => ['required', 'integer', 'min:2020', 'max:2100']]);
        abort_unless($this->escopo->pode($request->user(), 'pedagogico.view'), 403);

        $consulta = $this->escopo->aplicar(Nota::query(), $request->user(), 'aluno.turma_id');

        return response()->json($this->notas->medias($consulta, (int) $dados['ano_letivo']));
    }

    public function lancar(LancarNotasRequest $request): JsonResponse
    {
        $dados = $request->validated();
        /** @var list<array{aluno_id: int, nota: float|int|string, nota_recuperacao?: float|int|string|null}> $notas */
        $notas = $dados['notas'];

        return response()->json($this->notas->lancar((int) $dados['turma_id'], (int) $dados['materia_id'], (int) $dados['ano_letivo'], (int) $dados['trimestre'], $notas, $request->user()));
    }

    public function importar(ImportarNotasRequest $request): JsonResponse
    {
        return $this->executar(fn (): JsonResponse => response()->json(
            $this->notas->importar(LeitorCsv::de($request->file('arquivo')), $request->integer('ano_letivo'), $request->user())
        ));
    }

    /** Boletim do aluno (todas as matérias e trimestres do ano). */
    public function boletim(Request $request, Aluno $aluno): JsonResponse
    {
        abort_unless($aluno->turma_id !== null && Gate::forUser($request->user())->allows('pedagogico.ver-turma', [$aluno->turma_id]), 403);
        $ano = (int) $request->query('ano_letivo', (string) now()->year);

        return response()->json(Nota::query()->with('materia:id,nome')->where('aluno_id', $aluno->id)->where('ano_letivo', $ano)->orderBy('materia_id')->orderBy('trimestre')->get());
    }
}
