<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\TransportDriverCreateRequest;
use Modules\Educa\Models\EducaTransportDriver;
use Modules\Educa\Services\TransportDriverService;

final class TransportDriverController extends Controller
{
    public function __construct(
        private readonly TransportDriverService $driverService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewCondutores', EducaTransportDriver::class);

        $condutores = $this->driverService->listar([
            'tipo_funcao' => $request->query('tipo_funcao'),
            'ativo' => $request->has('ativo') ? $request->boolean('ativo') : null,
            'busca' => $request->query('busca'),
        ]);

        return response()->json([
            'data' => $condutores,
        ]);
    }

    public function store(TransportDriverCreateRequest $request): JsonResponse
    {
        $this->authorize('manageCondutores', EducaTransportDriver::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();

        try {
            $condutor = $this->driverService->criar($dados);

            return response()->json([
                'data' => $condutor,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(string $condutorId): JsonResponse
    {
        $this->authorize('viewCondutores', EducaTransportDriver::class);

        $condutor = $this->driverService->obter($condutorId);

        return response()->json([
            'data' => $condutor,
        ]);
    }

    public function update(Request $request, string $condutorId): JsonResponse
    {
        $this->authorize('manageCondutores', EducaTransportDriver::class);

        $dados = $request->validate([
            'cnh_numero' => ['nullable', 'string', 'max:30'],
            'cnh_categoria' => ['nullable', 'string', 'in:A,B,C,D,E,AB,AC,AD,AE'],
            'cnh_validade' => ['nullable', 'date'],
            'curso_transporte_escolar' => ['nullable', 'boolean'],
            'validade_curso' => ['nullable', 'date'],
            'ativo' => ['nullable', 'boolean'],
        ]);

        try {
            $condutor = $this->driverService->atualizar($condutorId, $dados);

            return response()->json([
                'data' => $condutor,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
