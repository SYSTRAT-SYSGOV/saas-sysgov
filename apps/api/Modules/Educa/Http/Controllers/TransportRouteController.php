<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\TransportRouteCreateRequest;
use Modules\Educa\Http\Requests\TransportRouteSchoolsRequest;
use Modules\Educa\Http\Requests\TransportRouteUpdateRequest;
use Modules\Educa\Http\Requests\TransportStopCreateRequest;
use Modules\Educa\Models\EducaTransportRoute;
use Modules\Educa\Services\TransportRouteService;

final class TransportRouteController extends Controller
{
    public function __construct(
        private readonly TransportRouteService $routeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewRotas', EducaTransportRoute::class);

        $rotas = $this->routeService->listar([
            'turno' => $request->query('turno'),
            'tipo_rota' => $request->query('tipo_rota'),
            'ativo' => $request->has('ativo') ? $request->boolean('ativo') : null,
            'busca' => $request->query('busca'),
        ]);

        return response()->json([
            'data' => $rotas,
        ]);
    }

    public function store(TransportRouteCreateRequest $request): JsonResponse
    {
        $this->authorize('manageRotas', EducaTransportRoute::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();

        try {
            $rota = $this->routeService->criar($dados);

            return response()->json([
                'data' => $rota,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(string $rotaId): JsonResponse
    {
        $this->authorize('viewRotas', EducaTransportRoute::class);

        $rota = $this->routeService->obter($rotaId);

        return response()->json([
            'data' => $rota,
        ]);
    }

    public function update(TransportRouteUpdateRequest $request, string $rotaId): JsonResponse
    {
        $this->authorize('manageRotas', EducaTransportRoute::class);

        try {
            $rota = $this->routeService->atualizar($rotaId, $request->validated());

            return response()->json([
                'data' => $rota,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function adicionarParada(TransportStopCreateRequest $request, string $rotaId): JsonResponse
    {
        $this->authorize('manageRotas', EducaTransportRoute::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();

        try {
            $parada = $this->routeService->adicionarParada($rotaId, $dados);

            return response()->json([
                'data' => $parada,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function vincularEscolas(TransportRouteSchoolsRequest $request, string $rotaId): JsonResponse
    {
        $this->authorize('manageRotas', EducaTransportRoute::class);

        $this->routeService->vincularEscolas($rotaId, $request->validated('school_ids'));

        return response()->json([
            'message' => 'Escolas vinculadas à rota com sucesso.',
        ]);
    }
}
