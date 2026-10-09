<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\MeioAmbiente\Http\Requests\EmitirAutoInfracaoAmbientalRequest;
use Modules\MeioAmbiente\Http\Requests\ParcelarMultaRequest;
use Modules\MeioAmbiente\Http\Requests\RegistrarPagamentoParcelaRequest;
use Modules\MeioAmbiente\Http\Resources\AutoInfracaoAmbientalResource;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ParcelaMulta;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\ProcessoSancionatorio;

final class FiscalizacaoAmbientalController extends Controller
{
    public function __construct(
        private readonly FiscalizacaoAmbientalService $fiscalizacao,
    ) {}

    /** Emite auto de infração ambiental a partir de uma execução de vistoria concluída. */
    public function store(EmitirAutoInfracaoAmbientalRequest $request, ExecucaoVistoria $execucaoVistoria): JsonResponse
    {
        $empreendimento = Empreendimento::findOrFail($request->validated('empreendimento_id'));

        $auto = $this->fiscalizacao->emitirAutoInfracaoAmbiental($execucaoVistoria, $empreendimento, $request->validated());

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

        return response()->json($parcelamento->load('parcelas'), 201);
    }

    public function storePagamentoParcela(RegistrarPagamentoParcelaRequest $request, ParcelaMulta $parcelaMulta): JsonResponse
    {
        $parcela = $this->fiscalizacao->registrarPagamentoParcela($parcelaMulta);

        return response()->json($parcela);
    }
}
