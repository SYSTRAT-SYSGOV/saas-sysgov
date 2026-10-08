<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
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
        private readonly AuditLogger $audit,
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
        $this->audit->record('meio_ambiente', 'processo_licenciamento.aberto', "ProcessoLicenciamento #{$processo->id}", null, $processo->toArray());

        return response()->json(new ProcessoLicenciamentoResource($processo), 201);
    }

    public function storeDocumento(AnexarDocumentoLicenciamentoRequest $request, ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('update', $processoLicenciamento);

        $documento = $this->licenciamento->anexarDocumento($processoLicenciamento, $request->validated('tipo'), $request->file('arquivo'));
        $this->audit->record('meio_ambiente', 'processo_licenciamento.documento_anexado', "ProcessoLicenciamento #{$processoLicenciamento->id}", null, $documento->toArray());

        return response()->json($documento, 201);
    }

    public function storeCondicionante(RegistrarCondicionanteRequest $request, ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('update', $processoLicenciamento);

        $condicionante = $this->licenciamento->registrarCondicionante($processoLicenciamento, $request->validated());
        $this->audit->record('meio_ambiente', 'processo_licenciamento.condicionante_registrada', "ProcessoLicenciamento #{$processoLicenciamento->id}", null, $condicionante->toArray());

        return response()->json($condicionante, 201);
    }

    public function cumprirCondicionante(Condicionante $condicionante): JsonResponse
    {
        $this->authorize('update', $condicionante->processoLicenciamento);

        $antes = $condicionante->toArray();
        $condicionante = $this->licenciamento->marcarCondicionanteCumprida($condicionante);
        $this->audit->record('meio_ambiente', 'condicionante.cumprida', "Condicionante #{$condicionante->id}", $antes, $condicionante->toArray());

        return response()->json($condicionante);
    }

    public function storeVistoriaTecnica(RegistrarVistoriaTecnicaRequest $request, ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('vistoriar', $processoLicenciamento);

        $vistoria = $this->licenciamento->registrarVistoriaTecnica($processoLicenciamento, $request->validated());
        $this->audit->record('meio_ambiente', 'processo_licenciamento.vistoria_tecnica_registrada', "ProcessoLicenciamento #{$processoLicenciamento->id}", null, $vistoria->toArray());

        return response()->json($vistoria, 201);
    }

    public function deferir(DeferirProcessoLicenciamentoRequest $request, ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('update', $processoLicenciamento);

        $antes = $processoLicenciamento->toArray();
        $processo = $this->licenciamento->deferir($processoLicenciamento, $request->validated('justificativa_parecer_desfavoravel'));
        $this->audit->record('meio_ambiente', 'processo_licenciamento.deferido', "ProcessoLicenciamento #{$processo->id}", $antes, $processo->toArray());

        return response()->json(new ProcessoLicenciamentoResource($processo));
    }
}
