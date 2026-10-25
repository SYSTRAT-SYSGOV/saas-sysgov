<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\TransportInspectionCreateRequest;
use Modules\Educa\Http\Requests\TransportVehicleCreateRequest;
use Modules\Educa\Models\EducaTransportVehicle;
use Modules\Educa\Services\TransportVehicleService;

final class TransportVehicleController extends Controller
{
    public function __construct(
        private readonly TransportVehicleService $vehicleService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewVeiculos', EducaTransportVehicle::class);

        $veiculos = $this->vehicleService->listar([
            'tipologia' => $request->query('tipologia'),
            'tipo_propriedade' => $request->query('tipo_propriedade'),
            'status' => $request->query('status'),
            'busca' => $request->query('busca'),
        ]);

        return response()->json([
            'data' => $veiculos,
        ]);
    }

    public function store(TransportVehicleCreateRequest $request): JsonResponse
    {
        $this->authorize('manageVeiculos', EducaTransportVehicle::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();

        try {
            $veiculo = $this->vehicleService->criar($dados);

            return response()->json([
                'data' => $veiculo,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(string $veiculoId): JsonResponse
    {
        $this->authorize('viewVeiculos', EducaTransportVehicle::class);

        $veiculo = $this->vehicleService->obter($veiculoId);

        return response()->json([
            'data' => $veiculo,
        ]);
    }

    public function update(Request $request, string $veiculoId): JsonResponse
    {
        $this->authorize('manageVeiculos', EducaTransportVehicle::class);

        $dados = $request->validate([
            'marca_modelo' => ['nullable', 'string', 'max:100'],
            'tipologia' => ['nullable', 'string', 'in:onibus,microonibus,van,embarcacao,outros'],
            'tipo_propriedade' => ['nullable', 'string', 'in:proprio,terceirizado'],
            'capacidade_passageiros' => ['nullable', 'integer', 'min:1', 'max:150'],
            'renavam' => ['nullable', 'string', 'max:20'],
            'status' => ['nullable', 'string', 'in:regular,em_manutencao,interditado'],
        ]);

        try {
            $veiculo = $this->vehicleService->atualizar($veiculoId, $dados);

            return response()->json([
                'data' => $veiculo,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function registrarVistoria(TransportInspectionCreateRequest $request, string $veiculoId): JsonResponse
    {
        $this->authorize('manageVeiculos', EducaTransportVehicle::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();

        try {
            $vistoria = $this->vehicleService->registrarVistoria($veiculoId, $dados);

            return response()->json([
                'data' => $vistoria,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
