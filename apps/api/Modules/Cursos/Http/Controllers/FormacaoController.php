<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Services\FormacaoService;

final class FormacaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly FormacaoService $formacoes,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Formacao::class);

        return response()->json(Formacao::query()->with('cursos')->orderBy('titulo')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Formacao::class);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(
            $this->formacoes->criar($this->semCursos($dados), $dados['cursos']),
            201,
        ));
    }

    public function show(Formacao $formacao): JsonResponse
    {
        $this->authorize('view', $formacao);

        return response()->json($formacao->load('cursos'));
    }

    public function update(Request $request, Formacao $formacao): JsonResponse
    {
        $this->authorize('update', $formacao);
        $dados = $request->validate($this->regras(parcial: true));

        return $this->executar(fn () => response()->json(
            $this->formacoes->atualizar($formacao, $this->semCursos($dados), $dados['cursos'] ?? null),
        ));
    }

    public function destroy(Formacao $formacao): JsonResponse
    {
        $this->authorize('delete', $formacao);

        return $this->executar(function () use ($formacao): JsonResponse {
            $this->formacoes->excluir($formacao);

            return response()->json(['deleted' => true]);
        });
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function semCursos(array $dados): array
    {
        unset($dados['cursos']);

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
            'descricao' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'modelo_certificado_id' => ['sometimes', 'nullable', 'integer', Rule::exists('cursos_modelos_certificado', 'id')->where('tenant_id', app(TenantContext::class)->id())],
            'cursos' => [$obrigatorio, 'array', 'min:1'],
            'cursos.*.curso_id' => ['required', 'integer'],
            'cursos.*.obrigatorio' => ['required', 'boolean'],
            'cursos.*.ordem' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
