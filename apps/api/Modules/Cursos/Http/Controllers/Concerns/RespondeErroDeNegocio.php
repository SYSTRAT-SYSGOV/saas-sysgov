<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers\Concerns;

use DomainException;
use Illuminate\Http\JsonResponse;

/**
 * Regra de negócio violada (DomainException dos Services) vira 422 com
 * {"error": "..."} — mesmo formato dos controllers do Licita.
 */
trait RespondeErroDeNegocio
{
    /**
     * @param callable(): JsonResponse $acao
     */
    private function executar(callable $acao): JsonResponse
    {
        try {
            return $acao();
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
