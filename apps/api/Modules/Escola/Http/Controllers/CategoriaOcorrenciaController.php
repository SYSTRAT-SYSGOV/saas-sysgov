<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Escola\Http\Requests\SalvarCategoriaRequest;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Services\CategoriaOcorrenciaService;

final class CategoriaOcorrenciaController extends Controller
{
    public function __construct(private readonly CategoriaOcorrenciaService $categorias) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', CategoriaOcorrencia::class);

        return response()->json($this->categorias->listar());
    }

    public function store(SalvarCategoriaRequest $request): JsonResponse
    {
        /** @var array{nome: string, cor: string} $dados */
        $dados = $request->validated();

        return response()->json($this->categorias->criar($dados), 201);
    }

    public function update(SalvarCategoriaRequest $request, CategoriaOcorrencia $categoria): JsonResponse
    {
        return response()->json($this->categorias->atualizar($categoria, $request->validated()));
    }

    public function destroy(CategoriaOcorrencia $categoria): JsonResponse
    {
        $this->authorize('delete', $categoria);
        $this->categorias->excluir($categoria);

        return response()->json(['deleted' => true]);
    }
}
