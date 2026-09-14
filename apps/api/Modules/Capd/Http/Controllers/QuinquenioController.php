<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\QuinquenioService;

/**
 * Quinquênios persistidos — RN-08 (art. 17, Lei 1.704/2006).
 *
 * Endpoints:
 *   GET  /capd/servidores/{id}/quinquenios        — lista + total percentual
 *   POST /capd/servidores/{id}/quinquenios/gerar  — gera os pendentes (idempotente)
 */
final class QuinquenioController extends Controller
{
    public function __construct(
        private readonly QuinquenioService $service,
    ) {}

    public function index(Request $request, int $servidorId): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $quinquenios = $this->service->listarPorServidor($servidorId);

        return response()->json([
            'total'             => $quinquenios->count(),
            'percentual_total'  => $this->service->totalPercentual($servidorId),
            'quinquenios'       => $quinquenios,
        ]);
    }

    public function gerar(Request $request, int $servidorId): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $servidor = Servidor::findOrFail($servidorId);
        $gerados  = $this->service->gerarPendentes($servidor);

        return response()->json([
            'message'         => count($gerados) > 0
                ? count($gerados) . ' quinquênio(s) gerado(s).'
                : 'Nenhum quinquênio pendente para gerar.',
            'gerados'         => $gerados,
            'total'           => $this->service->listarPorServidor($servidorId)->count(),
            'percentual_total'=> $this->service->totalPercentual($servidorId),
        ]);
    }
}
