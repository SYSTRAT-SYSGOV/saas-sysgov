<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Empresa;
use Modules\Cursos\Services\EmpresaService;

/** Biblioteca de empresas do órgão ({EMPRESA} e {CNPJ} no certificado — D10). */
final class EmpresaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly EmpresaService $empresas) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Empresa::class);

        return response()->json(['empresas' => Empresa::query()->orderByDesc('ativa')->orderBy('razao_social')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Empresa::class);

        return $this->executar(fn () => response()->json($this->empresas->criar($request->validate($this->regras())), 201));
    }

    public function update(Request $request, Empresa $empresa): JsonResponse
    {
        $this->authorize('update', $empresa);

        return $this->executar(fn () => response()->json($this->empresas->atualizar($empresa, $request->validate($this->regras(parcial: true)))));
    }

    public function destroy(Empresa $empresa): JsonResponse
    {
        $this->authorize('delete', $empresa);

        return $this->executar(function () use ($empresa): JsonResponse {
            $this->empresas->excluir($empresa);

            return response()->json(['deleted' => true]);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        return [
            'razao_social' => [$parcial ? 'sometimes' : 'required', 'string', 'max:150'],
            'nome_fantasia' => ['sometimes', 'nullable', 'string', 'max:150'],
            'cnpj' => ['sometimes', 'nullable', 'string', 'max:18'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'telefone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'responsavel' => ['sometimes', 'nullable', 'string', 'max:150'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ativa' => ['sometimes', 'boolean'],
        ];
    }
}
