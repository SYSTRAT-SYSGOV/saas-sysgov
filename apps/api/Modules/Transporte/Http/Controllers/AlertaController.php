<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\AlertaService;

final class AlertaController extends Controller
{
    public function __construct(
        private readonly AlertaService $service,
        private readonly TransportePolicy $policy,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $alertas = $this->service->listar();

        return response()->json([
            'data' => $alertas,
            'resumo' => [
                'criticos' => count(array_filter($alertas, fn (array $a): bool => $a['gravidade'] === 'critico')),
                'atencao' => count(array_filter($alertas, fn (array $a): bool => $a['gravidade'] === 'atencao')),
            ],
        ]);
    }
}
