<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Protocolo\Services\DashboardService;

final class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user === null || (!$user->is_platform_admin && !$user->hasPermission('protocolo.processos.relatorios'))) {
            return response()->json([
                'message' => 'Acesso não autorizado aos relatórios do módulo Protocolo.',
            ], 403);
        }

        $filtros = [
            'data_inicio' => $request->query('data_inicio') ? (string) $request->query('data_inicio') : null,
            'data_fim' => $request->query('data_fim') ? (string) $request->query('data_fim') : null,
        ];

        $dados = $this->dashboardService->obterDados($user, $filtros);

        return response()->json($dados);
    }
}
