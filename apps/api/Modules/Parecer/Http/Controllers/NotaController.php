<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Parecer\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Services\AcessoParecer;
use Modules\Parecer\Services\NotaService;
use Modules\Parecer\Support\Catalogo;

/** Notas (notas.php): por matéria, nos trimestres com nota da série; também por planilha CSV. */
final class NotaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AcessoParecer $acesso,
        private readonly NotaService $notas,
    ) {}

    public function index(Request $request): JsonResponse
    {
        [$turma, $serie, $materia, $mats] = $this->contexto($request);

        return response()->json([
            'serie' => $serie,
            'materia' => $materia,
            'materias' => $mats,
            'trimestres' => Catalogo::trimestresComNota($serie),
            'media_aprovacao' => Catalogo::MEDIA_APROVACAO,
            'alunos' => $this->notas->alunos($turma->id)->map(fn (Aluno $a): array => ['id' => $a->id, 'numero' => $a->numero, 'nome' => $a->nome, 'situacao' => $a->situacao])->values(),
            'notas' => (object) $this->notas->mapa($turma->id, $materia),
        ]);
    }

    public function lancar(Request $request): JsonResponse
    {
        [$turma, $serie, $materia] = $this->contexto($request);
        $dados = $request->validate([
            'notas' => ['required', 'array'],
            'notas.*' => ['array'],
            'notas.*.*' => ['nullable', 'numeric', 'between:0,10'],
        ]);

        return $this->executar(fn (): JsonResponse => response()->json(['gravadas' => $this->notas->gravar($turma, $serie, $materia, $dados['notas'], $request->user())]));
    }

    public function importar(Request $request): JsonResponse
    {
        [$turma, $serie, $materia] = $this->contexto($request);
        $request->validate(['arquivo' => ['required', 'file', 'max:2048', 'mimes:csv,txt']]);

        return $this->executar(function () use ($request, $turma, $serie, $materia): JsonResponse {
            $lido = $this->notas->lerPlanilha((string) file_get_contents($request->file('arquivo')->getRealPath()), $turma->id, $serie);

            return response()->json(['gravadas' => $this->notas->gravar($turma, $serie, $materia, $lido['entrada'], $request->user()), 'erros' => $lido['erros']]);
        });
    }

    public function planilha(Request $request): Response|JsonResponse
    {
        [$turma, $serie, $materia] = $this->contexto($request);

        if (Catalogo::trimestresComNota($serie) === []) {
            return response()->json(['error' => 'O ' . Catalogo::SERIES[$serie] . ' não tem notas.'], 422);
        }

        return response($this->notas->planilha($turma->id, $serie, $materia), 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="notas-' . $materia . '-' . preg_replace('/\W+/', '', $serie . 'ano' . $turma->nome) . '.csv"',
            ]);
    }

    /** @return array{0: Turma, 1: int, 2: string, 3: list<string>} */
    private function contexto(Request $request): array
    {
        $request->validate(['turma_id' => ['required', 'integer'], 'materia' => ['nullable', Rule::in(array_keys(Catalogo::MATERIAS))]]);
        $user = $request->user();
        $turmaId = (int) $request->input('turma_id');
        $this->acesso->exigirTurma($user, $turmaId);
        $mats = $this->acesso->materiasDoUsuario($user, $turmaId);
        abort_if($mats === [], 403, 'Você não avalia nenhuma matéria nesta turma.');
        $materia = in_array($request->input('materia'), $mats, true) ? (string) $request->input('materia') : $mats[0];
        if ($request->isMethod('get') === false) {
            $this->acesso->exigirMateria($user, $turmaId, (string) $request->input('materia', ''));
        }

        return [Turma::query()->findOrFail($turmaId), (int) TurmaSerie::query()->where('turma_id', $turmaId)->value('serie'), $materia, $mats];
    }
}
