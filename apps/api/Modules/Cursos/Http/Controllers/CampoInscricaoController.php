<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Enums\TipoCampoInscricao;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Services\CampoInscricaoService;

final class CampoInscricaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly CampoInscricaoService $campos,
    ) {}

    public function index(Curso $curso): JsonResponse
    {
        $this->authorize('view', $curso);

        return response()->json($curso->camposInscricao()->get());
    }

    public function store(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json($this->campos->criar($curso, $dados), 201));
    }

    public function update(Request $request, CampoInscricao $campo): JsonResponse
    {
        $this->authorize('update', $campo->curso);
        $dados = $request->validate($this->regras(parcial: true));

        return $this->executar(fn () => response()->json($this->campos->atualizar($campo, $dados)));
    }

    public function destroy(CampoInscricao $campo): JsonResponse
    {
        $this->authorize('update', $campo->curso);

        return $this->executar(function () use ($campo): JsonResponse {
            $this->campos->excluir($campo);

            return response()->json(['deleted' => true]);
        });
    }

    public function reordenar(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);

        return $this->executar(fn () => response()->json($this->campos->reordenar($curso, $dados['ids'])));
    }

    public function desativar(CampoInscricao $campo): JsonResponse
    {
        $this->authorize('update', $campo->curso);

        return response()->json($this->campos->alterarAtivacao($campo, false));
    }

    public function ativar(CampoInscricao $campo): JsonResponse
    {
        $this->authorize('update', $campo->curso);

        return response()->json($this->campos->alterarAtivacao($campo, true));
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'rotulo' => [$obrigatorio, 'string', 'max:160'],
            'tipo' => [$obrigatorio, Rule::enum(TipoCampoInscricao::class)],
            'obrigatorio' => ['sometimes', 'boolean'],
            'opcoes' => ['sometimes', 'nullable', 'array'],
            'opcoes.*' => ['string', 'max:160'],
            'ordem' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
