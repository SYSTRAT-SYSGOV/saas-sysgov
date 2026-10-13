<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\MeioAmbiente\Services\PainelIndicadoresAmbientaisService;

final class PainelIndicadoresAmbientaisController extends Controller
{
    public function __construct(
        private readonly PainelIndicadoresAmbientaisService $painel,
    ) {}

    public function indicadores(Request $request): JsonResponse
    {
        $this->autorizarChefia($request);

        return response()->json($this->painel->obterIndicadores($this->validarPeriodo($request)));
    }

    public function mapa(Request $request): JsonResponse
    {
        $this->autorizarChefia($request);

        return response()->json($this->painel->mapa($this->validarPeriodo($request)));
    }

    /** Painel restrito à chefia da Secretaria — mesmo padrão de `Vistoria\PainelGerencialController`. */
    private function autorizarChefia(Request $request): void
    {
        $user = $request->user();
        abort_unless($user->is_platform_admin || $user->hasPermission('meio_ambiente.chefia'), 403);
    }

    /** @return array{data_inicio?: string, data_fim?: string} */
    private function validarPeriodo(Request $request): array
    {
        return $request->validate([
            'data_inicio' => ['nullable', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:data_inicio'],
        ]);
    }
}
