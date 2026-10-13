<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vistoria\Http\Requests\StoreLocalFiscalizavelRequest;
use Modules\Vistoria\Http\Requests\UpdateLocalFiscalizavelRequest;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Services\LocalFiscalizavelService;

final class LocalFiscalizavelController extends Controller
{
    public function __construct(
        private readonly LocalFiscalizavelService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LocalFiscalizavel::class);

        return response()->json($this->service->listar($request->only(['tipo', 'busca', 'per_page'])));
    }

    public function show(int $id): JsonResponse
    {
        $local = LocalFiscalizavel::with('proprietario')->findOrFail($id);
        $this->authorize('view', $local);

        return response()->json($local);
    }

    public function store(StoreLocalFiscalizavelRequest $request): JsonResponse
    {
        try {
            $local = $this->service->criarLocal($request->validated());

            return response()->json($local, 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function update(UpdateLocalFiscalizavelRequest $request, int $id): JsonResponse
    {
        $local = LocalFiscalizavel::findOrFail($id);

        try {
            $local = $this->service->atualizarLocal($local, $request->validated());

            return response()->json($local);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        $local = LocalFiscalizavel::findOrFail($id);
        $this->authorize('delete', $local);
        $this->service->excluirLocal($local);

        return response()->json(null, 204);
    }

    public function historico(int $id): JsonResponse
    {
        $local = LocalFiscalizavel::findOrFail($id);
        $this->authorize('view', $local);

        return response()->json($this->service->obterHistorico($local));
    }
}
