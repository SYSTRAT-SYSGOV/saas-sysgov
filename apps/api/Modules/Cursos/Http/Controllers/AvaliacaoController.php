<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Enums\RegraLiberacao;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Services\AvaliacaoService;

final class AvaliacaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AvaliacaoService $avaliacoes,
    ) {}

    public function index(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('listar', [Avaliacao::class, $curso]);

        $avaliacoes = $curso->avaliacoes()->withCount(['questoes', 'tentativas'])->get();

        return response()->json($avaliacoes->map(fn (Avaliacao $a): array => $this->apresentar($request, $a, detalhada: false))->all());
    }

    public function store(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json($this->apresentar($request, $this->avaliacoes->criar($curso, $dados)), 201));
    }

    public function show(Request $request, Avaliacao $avaliacao): JsonResponse
    {
        $this->authorize('view', $avaliacao);

        return response()->json($this->apresentar($request, $avaliacao));
    }

    public function update(Request $request, Avaliacao $avaliacao): JsonResponse
    {
        $this->authorize('update', $avaliacao->curso);
        $dados = $request->validate($this->regras(parcial: true));

        return $this->executar(fn () => response()->json($this->apresentar($request, $this->avaliacoes->atualizar($avaliacao, $dados))));
    }

    public function destroy(Avaliacao $avaliacao): JsonResponse
    {
        $this->authorize('update', $avaliacao->curso);

        return $this->executar(function () use ($avaliacao): JsonResponse {
            $this->avaliacoes->excluir($avaliacao);

            return response()->json(['deleted' => true]);
        });
    }

    public function publicar(Request $request, Avaliacao $avaliacao): JsonResponse
    {
        $this->authorize('update', $avaliacao->curso);

        return $this->executar(fn () => response()->json($this->apresentar($request, $this->avaliacoes->alterarPublicacao($avaliacao, true))));
    }

    public function despublicar(Request $request, Avaliacao $avaliacao): JsonResponse
    {
        $this->authorize('update', $avaliacao->curso);

        return $this->executar(fn () => response()->json($this->apresentar($request, $this->avaliacoes->alterarPublicacao($avaliacao, false))));
    }

    /**
     * O Administrador recebe as questões (com gabarito); o instrutor, só os dados
     * da avaliação e os totais.
     *
     * @return array<string, mixed>
     */
    private function apresentar(Request $request, Avaliacao $avaliacao, bool $detalhada = true): array
    {
        $avaliacao->loadCount(['questoes', 'tentativas']);
        $dados = $avaliacao->toArray();

        if ($detalhada && $request->user()?->can('update', $avaliacao->curso)) {
            $dados['questoes'] = $avaliacao->questoes()->with('questao.alternativas')->get()
                ->map(fn ($q): array => ['questao_id' => $q->questao_id, 'ordem' => $q->ordem, 'questao' => $q->questao->toArray()])
                ->all();
        }

        return $dados;
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'titulo' => [$obrigatorio, 'string', 'max:255'],
            'instrucoes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'peso' => ['sometimes', 'integer', 'between:1,10'],
            'tentativas_max' => ['sometimes', 'integer', 'between:1,10'],
            'tempo_limite_minutos' => ['sometimes', 'nullable', 'integer', 'between:1,1440'],
            'aula_id' => ['sometimes', 'nullable', 'integer'],
            'liberacao_regra' => ['sometimes', Rule::enum(RegraLiberacao::class)],
            'liberacao_dias' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:365'],
            'questoes' => ['sometimes', 'array'],
            'questoes.*' => ['integer'],
        ];
    }
}
