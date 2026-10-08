<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vistoria\Http\Requests\SincronizarExecucaoRequest;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Services\ExecucaoVistoriaService;

final class ExecucaoVistoriaController extends Controller
{
    public function __construct(
        private readonly ExecucaoVistoriaService $service,
    ) {}

    public function pacoteDoDia(Request $request): JsonResponse
    {
        $this->authorize('viewAny', OrdemServico::class);

        return response()->json([
            'gerado_em' => now()->toIso8601String(),
            'ordens' => $this->service->pacoteDoDia($request->user()),
        ]);
    }

    public function sincronizar(SincronizarExecucaoRequest $request): JsonResponse
    {
        $ordem = OrdemServico::findOrFail($request->validated('ordem_servico_id'));

        try {
            $resultado = $this->service->sincronizar(
                $request->user(),
                $ordem,
                $request->validated('client_uuid'),
                $request->validated(),
            );
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($resultado['execucao'], $resultado['duplicado'] ? 200 : 201);
    }
}
