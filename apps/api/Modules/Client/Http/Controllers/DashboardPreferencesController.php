<?php

declare(strict_types=1);

namespace Modules\Client\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Client\Services\DashboardSummaryService;

final class DashboardPreferencesController
{
    public function __construct(private readonly DashboardSummaryService $service) {}

    /** GET /api/client/dashboard-preferences — cards que o usuário pode mostrar/ocultar (só dos módulos que acessa). */
    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->catalogo($request->user())]);
    }

    /** PUT /api/client/dashboard-preferences — substitui a lista de cards ocultos. */
    public function update(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'hidden' => ['present', 'array', 'max:100'],
            'hidden.*' => ['string', 'max:50'],
        ]);

        $this->service->definirOcultos($request->user(), array_values($dados['hidden']));

        return response()->json(['data' => $this->service->catalogo($request->user())]);
    }
}
