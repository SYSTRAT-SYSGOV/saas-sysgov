<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Modules\MeioAmbiente\Http\Requests\CadastrarGeradorResiduoRequest;
use Modules\MeioAmbiente\Http\Requests\CadastrarPontoLogisticaReversaRequest;
use Modules\MeioAmbiente\Http\Requests\RegistrarColetaResiduoRequest;
use Modules\MeioAmbiente\Http\Requests\RegistrarEntregaLogisticaReversaRequest;
use Modules\MeioAmbiente\Http\Resources\GeradorResiduoResource;
use Modules\MeioAmbiente\Http\Resources\PontoLogisticaReversaResource;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\PontoLogisticaReversa;
use Modules\MeioAmbiente\Services\ResiduosSolidosService;

final class ResiduosSolidosController extends Controller
{
    public function __construct(
        private readonly ResiduosSolidosService $residuos,
        private readonly AuditLogger $audit,
    ) {}

    public function indexGeradores(): JsonResponse
    {
        $this->authorize('viewAny', GeradorResiduo::class);

        $geradores = GeradorResiduo::query()->latest()->get();

        return response()->json(['data' => GeradorResiduoResource::collection($geradores)]);
    }

    public function storeGerador(CadastrarGeradorResiduoRequest $request): JsonResponse
    {
        $this->authorize('create', GeradorResiduo::class);

        $gerador = $this->residuos->cadastrarGerador($request->validated());
        $this->audit->record('meio_ambiente', 'gerador_residuo.cadastrado', "GeradorResiduo #{$gerador->id}", null, $gerador->toArray());

        return response()->json(new GeradorResiduoResource($gerador), 201);
    }

    public function storeColeta(RegistrarColetaResiduoRequest $request, GeradorResiduo $geradorResiduo): JsonResponse
    {
        $this->authorize('update', $geradorResiduo);

        $coleta = $this->residuos->registrarColeta($geradorResiduo, $request->validated());
        $this->audit->record('meio_ambiente', 'coleta_residuo.registrada', "GeradorResiduo #{$geradorResiduo->id}", null, $coleta->toArray());

        return response()->json($coleta, 201);
    }

    public function indexPontosLogisticaReversa(): JsonResponse
    {
        $this->authorize('viewAny', PontoLogisticaReversa::class);

        $pontos = PontoLogisticaReversa::query()->latest()->get();

        return response()->json(['data' => PontoLogisticaReversaResource::collection($pontos)]);
    }

    public function storePontoLogisticaReversa(CadastrarPontoLogisticaReversaRequest $request): JsonResponse
    {
        $this->authorize('create', PontoLogisticaReversa::class);

        $ponto = $this->residuos->cadastrarPontoLogisticaReversa($request->validated());
        $this->audit->record('meio_ambiente', 'ponto_logistica_reversa.cadastrado', "PontoLogisticaReversa #{$ponto->id}", null, $ponto->toArray());

        return response()->json(new PontoLogisticaReversaResource($ponto), 201);
    }

    public function storeEntregaLogisticaReversa(RegistrarEntregaLogisticaReversaRequest $request, PontoLogisticaReversa $pontoLogisticaReversa): JsonResponse
    {
        $this->authorize('update', $pontoLogisticaReversa);

        $entrega = $this->residuos->registrarEntrega($pontoLogisticaReversa, $request->validated());
        $this->audit->record('meio_ambiente', 'entrega_logistica_reversa.registrada', "PontoLogisticaReversa #{$pontoLogisticaReversa->id}", null, $entrega->toArray());

        return response()->json($entrega, 201);
    }
}
