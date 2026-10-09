<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\MeioAmbiente\Http\Requests\StoreEmpreendimentoRequest;
use Modules\MeioAmbiente\Http\Requests\VincularResponsavelTecnicoRequest;
use Modules\MeioAmbiente\Http\Resources\EmpreendimentoResource;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Services\EmpreendimentoService;

final class EmpreendimentoController extends Controller
{
    public function __construct(
        private readonly EmpreendimentoService $empreendimentos,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Empreendimento::class);

        $paginator = $this->empreendimentos->listar($request->only(['q', 'per_page']));

        return response()->json([
            'data' => EmpreendimentoResource::collection($paginator->items()),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    /** Consulta georreferenciada (GeoJSON) com filtro por atividade/porte. GET /empreendimentos/mapa */
    public function mapa(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Empreendimento::class);

        $features = $this->empreendimentos->listarParaMapa($request->only(['atividade', 'porte']));

        return response()->json(['type' => 'FeatureCollection', 'features' => $features]);
    }

    public function show(Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('view', $empreendimento);

        $empreendimento->load(['titular', 'responsavelTecnico']);

        return response()->json(new EmpreendimentoResource($empreendimento));
    }

    public function store(StoreEmpreendimentoRequest $request): JsonResponse
    {
        $this->authorize('create', Empreendimento::class);

        $empreendimento = $this->empreendimentos->criarEmpreendimento($request->validated());

        return response()->json(new EmpreendimentoResource($empreendimento), 201);
    }

    public function storeResponsavelTecnico(VincularResponsavelTecnicoRequest $request, Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('update', $empreendimento);

        $responsavel = $this->empreendimentos->vincularResponsavelTecnico($empreendimento, $request->validated());

        return response()->json($responsavel, 201);
    }
}
