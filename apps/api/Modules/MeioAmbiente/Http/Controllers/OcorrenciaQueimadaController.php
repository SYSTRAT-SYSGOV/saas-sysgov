<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Modules\MeioAmbiente\Http\Requests\RegistrarOcorrenciaQueimadaRequest;
use Modules\MeioAmbiente\Http\Requests\VincularResponsavelQueimadaRequest;
use Modules\MeioAmbiente\Http\Resources\OcorrenciaQueimadaResource;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Services\QueimadasService;

final class OcorrenciaQueimadaController extends Controller
{
    public function __construct(
        private readonly QueimadasService $queimadas,
        private readonly AuditLogger $audit,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', OcorrenciaQueimada::class);

        return response()->json(['data' => OcorrenciaQueimadaResource::collection(OcorrenciaQueimada::query()->latest()->get())]);
    }

    /** Mapa de focos de queimada (GeoJSON). GET /ocorrencias-queimada/mapa */
    public function mapa(): JsonResponse
    {
        $this->authorize('viewAny', OcorrenciaQueimada::class);

        $features = OcorrenciaQueimada::query()->get()->map(fn (OcorrenciaQueimada $o): array => [
            'type' => 'Feature',
            'geometry' => ['type' => 'Point', 'coordinates' => [(float) $o->longitude, (float) $o->latitude]],
            'properties' => [
                'id' => $o->id,
                'data_ocorrencia' => $o->data_ocorrencia->toDateString(),
                'area_queimada_ha' => $o->area_queimada_ha !== null ? (float) $o->area_queimada_ha : null,
                'situacao' => $o->situacao,
            ],
        ]);

        return response()->json(['type' => 'FeatureCollection', 'features' => $features]);
    }

    public function store(RegistrarOcorrenciaQueimadaRequest $request): JsonResponse
    {
        $this->authorize('create', OcorrenciaQueimada::class);

        $ocorrencia = $this->queimadas->registrarOcorrencia($request->validated());
        $this->audit->record('meio_ambiente', 'ocorrencia_queimada.registrada', "OcorrenciaQueimada #{$ocorrencia->id}", null, $ocorrencia->toArray());

        return response()->json(new OcorrenciaQueimadaResource($ocorrencia), 201);
    }

    public function storeResponsavel(VincularResponsavelQueimadaRequest $request, OcorrenciaQueimada $ocorrenciaQueimada): JsonResponse
    {
        $this->authorize('update', $ocorrenciaQueimada);

        $antes = $ocorrenciaQueimada->toArray();
        $ocorrencia = $this->queimadas->vincularResponsavel($ocorrenciaQueimada, $request->validated());
        $this->audit->record('meio_ambiente', 'ocorrencia_queimada.responsavel_vinculado', "OcorrenciaQueimada #{$ocorrencia->id}", $antes, $ocorrencia->toArray());

        return response()->json(new OcorrenciaQueimadaResource($ocorrencia));
    }
}
