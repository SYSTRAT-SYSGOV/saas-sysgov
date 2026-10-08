<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\MeioAmbiente\Http\Requests\CadastrarAreaProtegidaRequest;
use Modules\MeioAmbiente\Http\Resources\AreaProtegidaResource;
use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Services\AreasProtegidasService;

final class AreaProtegidaController extends Controller
{
    public function __construct(
        private readonly AreasProtegidasService $areasProtegidas,
        private readonly AuditLogger $audit,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', AreaProtegida::class);

        return response()->json(['data' => AreaProtegidaResource::collection(AreaProtegida::query()->latest()->get())]);
    }

    /** Consulta em mapa interativo (GeoJSON) com filtro por tipo. GET /areas-protegidas/mapa */
    public function mapa(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AreaProtegida::class);

        $features = $this->areasProtegidas->listarParaMapa($request->only(['tipo']));

        return response()->json(['type' => 'FeatureCollection', 'features' => $features]);
    }

    public function store(CadastrarAreaProtegidaRequest $request): JsonResponse
    {
        $this->authorize('create', AreaProtegida::class);

        $area = $this->areasProtegidas->cadastrarAreaProtegida($request->validated());
        $this->audit->record('meio_ambiente', 'area_protegida.cadastrada', "AreaProtegida #{$area->id}", null, $area->toArray());

        return response()->json(new AreaProtegidaResource($area), 201);
    }

    /** Áreas protegidas sobrepostas ao ponto do empreendimento. GET /empreendimentos/{empreendimento}/areas-protegidas-sobrepostas */
    public function sobreposicao(Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('view', $empreendimento);

        $sobrepostas = $this->areasProtegidas->verificarSobreposicao($empreendimento);

        return response()->json(['data' => AreaProtegidaResource::collection($sobrepostas)]);
    }
}
