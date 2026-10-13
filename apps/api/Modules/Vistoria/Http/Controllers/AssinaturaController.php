<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Vistoria\Http\Requests\SincronizarAssinaturaRequest;
use Modules\Vistoria\Models\Assinatura;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Services\AssinaturaService;

final class AssinaturaController extends Controller
{
    public function __construct(
        private readonly AssinaturaService $service,
    ) {}

    public function sincronizar(SincronizarAssinaturaRequest $request, int $documentoId): JsonResponse
    {
        $documento = Documento::findOrFail($documentoId);
        $dados = $request->validated();

        try {
            $resultado = $dados['status'] === Assinatura::STATUS_RECUSADA
                ? $this->service->registrarRecusa($documento, $dados['client_uuid'], $dados)
                : $this->service->sincronizarAssinatura($documento, $dados['client_uuid'], $dados);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($resultado['assinatura'], $resultado['duplicado'] ? 200 : 201);
    }
}
