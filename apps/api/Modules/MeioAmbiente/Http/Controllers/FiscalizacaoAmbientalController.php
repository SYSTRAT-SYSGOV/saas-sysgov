<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Modules\MeioAmbiente\Http\Requests\EmitirAutoInfracaoAmbientalRequest;
use Modules\MeioAmbiente\Http\Requests\ParcelarMultaRequest;
use Modules\MeioAmbiente\Http\Resources\AutoInfracaoAmbientalResource;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\ProcessoSancionatorio;

final class FiscalizacaoAmbientalController extends Controller
{
    public function __construct(
        private readonly FiscalizacaoAmbientalService $fiscalizacao,
        private readonly AuditLogger $audit,
    ) {}

    /** Emite auto de infração ambiental a partir de uma execução de vistoria concluída. */
    public function store(EmitirAutoInfracaoAmbientalRequest $request, ExecucaoVistoria $execucaoVistoria): JsonResponse
    {
        $empreendimento = Empreendimento::findOrFail($request->validated('empreendimento_id'));

        $auto = $this->fiscalizacao->emitirAutoInfracaoAmbiental($execucaoVistoria, $empreendimento, $request->validated());
        $this->audit->record('meio_ambiente', 'auto_infracao.emitido', "AutoInfracaoAmbiental #{$auto->id}", null, $auto->toArray());

        return response()->json(new AutoInfracaoAmbientalResource($auto->load('documento')), 201);
    }

    public function show(AutoInfracaoAmbiental $autoInfracaoAmbiental): JsonResponse
    {
        $this->authorize('view', $autoInfracaoAmbiental);

        $autoInfracaoAmbiental->load('documento.processoSancionatorio');

        return response()->json(new AutoInfracaoAmbientalResource($autoInfracaoAmbiental));
    }

    /** Parcela a multa aplicada no julgamento do processo sancionatório (Vistoria). */
    public function storeParcelamento(ParcelarMultaRequest $request, ProcessoSancionatorio $processoSancionatorio): JsonResponse
    {
        $parcelamento = $this->fiscalizacao->parcelar($processoSancionatorio, $request->validated('numero_parcelas'));
        $this->audit->record('meio_ambiente', 'multa.parcelada', "ProcessoSancionatorio #{$processoSancionatorio->id}", null, $parcelamento->load('parcelas')->toArray());

        return response()->json($parcelamento->load('parcelas'), 201);
    }
}
