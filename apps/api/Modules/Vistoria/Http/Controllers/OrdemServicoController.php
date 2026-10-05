<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vistoria\Http\Requests\StoreOrdemServicoRequest;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Services\OrdemServicoService;

final class OrdemServicoController extends Controller
{
    public function __construct(
        private readonly OrdemServicoService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', OrdemServico::class);

        return response()->json($this->service->listar($request->user(), $request->only(['status', 'criticidade', 'per_page'])));
    }

    public function show(int $id): JsonResponse
    {
        $ordem = OrdemServico::with(['local', 'orgUnit', 'fiscal'])->findOrFail($id);
        $this->authorize('view', $ordem);

        return response()->json($ordem);
    }

    public function store(StoreOrdemServicoRequest $request): JsonResponse
    {
        try {
            $ordem = $this->service->criarOrdemServico($request->validated());

            return response()->json($ordem, 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function minhaAgenda(): JsonResponse
    {
        $this->authorize('viewAny', OrdemServico::class);

        $ordens = OrdemServico::query()
            ->where('fiscal_id', auth()->id())
            ->orderByRaw("CASE criticidade
                WHEN 'urgente' THEN 1
                WHEN 'alta' THEN 2
                WHEN 'media' THEN 3
                WHEN 'baixa' THEN 4
                ELSE 5 END")
            ->orderBy('data_prevista')
            ->get();

        return response()->json($ordens);
    }
}
