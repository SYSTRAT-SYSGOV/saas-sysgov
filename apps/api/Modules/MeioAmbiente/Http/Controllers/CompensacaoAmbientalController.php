<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\MeioAmbiente\Http\Requests\RegistrarDestinacaoCompensacaoRequest;
use Modules\MeioAmbiente\Http\Requests\RegistrarPagamentoCompensacaoRequest;
use Modules\MeioAmbiente\Http\Resources\CompensacaoAmbientalResource;
use Modules\MeioAmbiente\Models\CompensacaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Services\CompensacaoAmbientalService;

final class CompensacaoAmbientalController extends Controller
{
    public function __construct(
        private readonly CompensacaoAmbientalService $compensacoes,
    ) {}

    public function index(Empreendimento $empreendimento): JsonResponse
    {
        $this->authorize('viewAny', CompensacaoAmbiental::class);

        $compensacoes = $empreendimento->compensacoesAmbientais()->with(['pagamentos', 'destinacoes'])->get();

        return response()->json(['data' => CompensacaoAmbientalResource::collection($compensacoes)]);
    }

    public function show(CompensacaoAmbiental $compensacaoAmbiental): JsonResponse
    {
        $this->authorize('view', $compensacaoAmbiental);

        $compensacaoAmbiental->load(['pagamentos', 'destinacoes']);

        return response()->json(new CompensacaoAmbientalResource($compensacaoAmbiental));
    }

    public function storePagamento(RegistrarPagamentoCompensacaoRequest $request, CompensacaoAmbiental $compensacaoAmbiental): JsonResponse
    {
        $this->authorize('update', $compensacaoAmbiental);

        $pagamento = $this->compensacoes->registrarPagamento($compensacaoAmbiental, $request->validated());

        return response()->json($pagamento, 201);
    }

    public function storeDestinacao(RegistrarDestinacaoCompensacaoRequest $request, CompensacaoAmbiental $compensacaoAmbiental): JsonResponse
    {
        $this->authorize('update', $compensacaoAmbiental);

        $destinacao = $this->compensacoes->registrarDestinacao($compensacaoAmbiental, $request->validated());

        return response()->json($destinacao, 201);
    }
}
