<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\MeioAmbiente\Http\Requests\CadastrarLicencaEfluenteRequest;
use Modules\MeioAmbiente\Http\Requests\CadastrarOutorgaAguaRequest;
use Modules\MeioAmbiente\Http\Requests\RegistrarMedicaoEfluenteRequest;
use Modules\MeioAmbiente\Http\Resources\LicencaLancamentoEfluenteResource;
use Modules\MeioAmbiente\Http\Resources\OutorgaAguaResource;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\LicencaLancamentoEfluente;
use Modules\MeioAmbiente\Models\OutorgaAgua;
use Modules\MeioAmbiente\Models\ParametroQualidadeEfluente;
use Modules\MeioAmbiente\Services\RecursosHidricosService;

final class RecursosHidricosController extends Controller
{
    public function __construct(
        private readonly RecursosHidricosService $recursosHidricos,
    ) {}

    public function indexOutorgas(Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('viewAny', OutorgaAgua::class);

        return response()->json(['data' => OutorgaAguaResource::collection($empreendimento->outorgasAgua()->latest()->get())]);
    }

    public function storeOutorga(CadastrarOutorgaAguaRequest $request, Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('create', OutorgaAgua::class);

        $outorga = $this->recursosHidricos->cadastrarOutorga($empreendimento, $request->validated());

        return response()->json(new OutorgaAguaResource($outorga), 201);
    }

    public function indexLicencasEfluente(Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('viewAny', LicencaLancamentoEfluente::class);

        return response()->json(['data' => LicencaLancamentoEfluenteResource::collection($empreendimento->licencasLancamentoEfluente()->with('parametros')->latest()->get())]);
    }

    public function storeLicencaEfluente(CadastrarLicencaEfluenteRequest $request, Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('create', LicencaLancamentoEfluente::class);

        $licenca = $this->recursosHidricos->cadastrarLicencaEfluente($empreendimento, $request->validated('parametros'));

        return response()->json(new LicencaLancamentoEfluenteResource($licenca->load('parametros')), 201);
    }

    public function storeMedicao(RegistrarMedicaoEfluenteRequest $request, ParametroQualidadeEfluente $parametroQualidadeEfluente): JsonResponse
    {
        $this->authorize('update', $parametroQualidadeEfluente->licenca);

        $medicao = $this->recursosHidricos->registrarMedicao($parametroQualidadeEfluente, $request->validated());

        return response()->json($medicao, 201);
    }
}
