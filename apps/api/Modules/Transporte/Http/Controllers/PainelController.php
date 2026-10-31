<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\PainelService;

final class PainelController extends Controller
{
    public function __construct(private readonly PainelService $painel, private readonly TransportePolicy $policy) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $ano = $request->validate(['ano_letivo' => ['nullable', 'integer', 'between:2000,2100']])['ano_letivo'] ?? null;

        return response()->json(['data' => $this->painel->montar($ano !== null ? (int) $ano : null)]);
    }
}
