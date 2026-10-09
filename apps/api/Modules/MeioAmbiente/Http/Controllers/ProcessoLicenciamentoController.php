<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\MeioAmbiente\Http\Requests\AbrirProcessoLicenciamentoRequest;
use Modules\MeioAmbiente\Http\Requests\AnexarDocumentoLicenciamentoRequest;
use Modules\MeioAmbiente\Http\Requests\DeferirProcessoLicenciamentoRequest;
use Modules\MeioAmbiente\Http\Requests\RegistrarCondicionanteRequest;
use Modules\MeioAmbiente\Http\Requests\RegistrarVistoriaTecnicaRequest;
use Modules\MeioAmbiente\Http\Resources\ProcessoLicenciamentoResource;
use Modules\MeioAmbiente\Models\Condicionante;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Services\ProcessoLicenciamentoService;

final class ProcessoLicenciamentoController extends Controller
{
    public function __construct(
        private readonly ProcessoLicenciamentoService $licenciamento,
    ) {}

    public function index(Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('viewAny', ProcessoLicenciamento::class);

        $processos = $empreendimento->processosLicenciamento()->with(['condicionantes', 'documentos'])->latest()->get();

        return response()->json(['data' => ProcessoLicenciamentoResource::collection($processos)]);
    }

    public function show(ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('view', $processoLicenciamento);

        $processoLicenciamento->load(['condicionantes', 'documentos', 'vistoriasTecnicas']);

        return response()->json(new ProcessoLicenciamentoResource($processoLicenciamento));
    }

    public function store(AbrirProcessoLicenciamentoRequest $request, Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('create', ProcessoLicenciamento::class);

        $processo = $this->licenciamento->abrirProcesso($empreendimento, $request->validated('fase'));

        return response()->json(new ProcessoLicenciamentoResource($processo), 201);
    }

    public function storeDocumento(AnexarDocumentoLicenciamentoRequest $request, ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('update', $processoLicenciamento);

        $documento = $this->licenciamento->anexarDocumento($processoLicenciamento, $request->validated('tipo'), $request->file('arquivo'));

        return response()->json($documento, 201);
    }

    public function storeCondicionante(RegistrarCondicionanteRequest $request, ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('update', $processoLicenciamento);

        $condicionante = $this->licenciamento->registrarCondicionante($processoLicenciamento, $request->validated());

        return response()->json($condicionante, 201);
    }

    public function cumprirCondicionante(Condicionante $condicionante): JsonResponse
    {
        $this->authorize('update', $condicionante->processoLicenciamento);

        $condicionante = $this->licenciamento->marcarCondicionanteCumprida($condicionante);

        return response()->json($condicionante);
    }

    public function storeVistoriaTecnica(RegistrarVistoriaTecnicaRequest $request, ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('vistoriar', $processoLicenciamento);

        $vistoria = $this->licenciamento->registrarVistoriaTecnica($processoLicenciamento, $request->validated());

        return response()->json($vistoria, 201);
    }

    public function deferir(DeferirProcessoLicenciamentoRequest $request, ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('update', $processoLicenciamento);

        $processo = $this->licenciamento->deferir($processoLicenciamento, $request->validated('justificativa_parecer_desfavoravel'));

        return response()->json(new ProcessoLicenciamentoResource($processo));
    }
}
