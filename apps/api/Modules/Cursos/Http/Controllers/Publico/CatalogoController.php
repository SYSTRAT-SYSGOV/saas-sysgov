<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Services\Publico\CatalogoPublicoService;

/**
 * Oferta pública do órgão — cursos publicados com turma aberta a externos (design D7, tarefa
 * 3.3). O `TenantContext` já vem resolvido pelo `ResolvePublicTenant`.
 */
final class CatalogoController extends Controller
{
    public function __construct(private readonly CatalogoPublicoService $servico) {}

    public function __invoke(Request $request): JsonResponse
    {
        return response()->json($this->servico->listar($request->query('tipo')));
    }
}
