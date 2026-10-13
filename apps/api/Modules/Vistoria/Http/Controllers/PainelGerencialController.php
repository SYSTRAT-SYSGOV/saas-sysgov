<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vistoria\Services\PainelGerencialService;

final class PainelGerencialController extends Controller
{
    public function __construct(
        private readonly PainelGerencialService $service,
    ) {}

    public function mapa(Request $request): JsonResponse
    {
        $this->autorizar($request);

        return response()->json($this->service->mapa($this->validarPeriodo($request)));
    }

    public function produtividade(Request $request): JsonResponse
    {
        $this->autorizar($request);

        return response()->json($this->service->produtividade($this->validarPeriodo($request)));
    }

    public function indicadores(Request $request): JsonResponse
    {
        $this->autorizar($request);

        return response()->json($this->service->indicadores($this->validarPeriodo($request)));
    }

    /** Painel gerencial é restrito à chefia da Secretaria — mesma permissão usada para julgar processos sancionatórios. */
    private function autorizar(Request $request): void
    {
        $user = $request->user();
        abort_unless($user->is_platform_admin || $user->hasPermission('vistoria.chefia'), 403);
    }

    /**
     * @return array{data_inicio?: string, data_fim?: string}
     */
    private function validarPeriodo(Request $request): array
    {
        return $request->validate([
            'data_inicio' => ['nullable', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:data_inicio'],
        ]);
    }
}
