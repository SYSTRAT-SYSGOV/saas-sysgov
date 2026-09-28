<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Enums\TipoQuestao;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Services\QuestaoService;

/** Banco de questões: traz gabarito, então é só do Administrador (`update` do curso). */
final class QuestaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly QuestaoService $questoes,
    ) {}

    public function index(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);

        $query = $curso->questoes()->with('alternativas')->withCount('avaliacoes');
        if ($request->boolean('somente_ativas')) {
            $query->where('ativa', true);
        }

        return response()->json($query->get());
    }

    public function store(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json($this->questoes->criar($curso, $dados), 201));
    }

    public function show(Questao $questao): JsonResponse
    {
        $this->authorize('update', $questao->curso);

        return response()->json($questao->load('alternativas'));
    }

    public function update(Request $request, Questao $questao): JsonResponse
    {
        $this->authorize('update', $questao->curso);
        $dados = $request->validate($this->regras(parcial: true));

        return $this->executar(fn () => response()->json($this->questoes->atualizar($questao, $dados)));
    }

    public function destroy(Questao $questao): JsonResponse
    {
        $this->authorize('update', $questao->curso);

        return $this->executar(function () use ($questao): JsonResponse {
            $this->questoes->excluir($questao);

            return response()->json(['deleted' => true]);
        });
    }

    public function desativar(Questao $questao): JsonResponse
    {
        $this->authorize('update', $questao->curso);

        return response()->json($this->questoes->alterarAtivacao($questao, false));
    }

    public function ativar(Questao $questao): JsonResponse
    {
        $this->authorize('update', $questao->curso);

        return response()->json($this->questoes->alterarAtivacao($questao, true));
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'tipo' => [$obrigatorio, Rule::enum(TipoQuestao::class)],
            'enunciado' => [$obrigatorio, 'string', 'max:50000'],
            'pontuacao' => ['sometimes', 'numeric', 'gt:0', 'max:100'],
            'orientacao_correcao' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'alternativas' => ['sometimes', 'array'],
            'alternativas.*.texto' => ['required', 'string', 'max:1000'],
            'alternativas.*.correta' => ['sometimes', 'boolean'],
        ];
    }
}
