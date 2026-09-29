<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Http\Requests\CredenciarOperadorRequest;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Services\OperadorCemiterioService;

/** Histórico de credenciamentos (alvarás) de coveiros/pedreiros (spec: cadastro-operadores). */
final class OperadorLicencaController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly OperadorCemiterioService $operadores,
    ) {}

    public function index(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.view');

        $operador = OperadorCemiterio::findOrFail($id);

        return response()->json($operador->licencas()->orderByDesc('validade')->get());
    }

    public function store(CredenciarOperadorRequest $request, int $id): JsonResponse
    {
        $operador = OperadorCemiterio::findOrFail($id);

        $licenca = $this->operadores->credenciar(
            $operador,
            ['numero' => $request->validated('numero'), 'validade' => $request->validated('validade')],
            $request->file('arquivo'),
        );

        return response()->json($licenca, 201);
    }
}
