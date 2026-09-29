<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Http\Requests\SancionarOperadorRequest;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Services\OperadorCemiterioService;

/** Sanções administrativas (advertência, suspensão, descredenciamento) de coveiros/pedreiros (spec: cadastro-operadores). */
final class OperadorPenalidadeController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly OperadorCemiterioService $operadores,
    ) {}

    public function index(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.view');

        $operador = OperadorCemiterio::findOrFail($id);

        return response()->json($operador->penalidades()->orderByDesc('inicio')->get());
    }

    public function store(SancionarOperadorRequest $request, int $id): JsonResponse
    {
        $operador = OperadorCemiterio::findOrFail($id);

        $penalidade = $this->operadores->sancionar(
            $operador,
            [
                'tipo' => $request->validated('tipo'),
                'inicio' => $request->validated('inicio'),
                'fim' => $request->validated('fim'),
                'motivo' => $request->validated('motivo'),
            ],
            $request->file('arquivo'),
        );

        return response()->json($penalidade, 201);
    }
}
