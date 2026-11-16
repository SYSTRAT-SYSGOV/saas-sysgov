<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers\Concerns;

use DomainException;
use Illuminate\Http\JsonResponse;

/** Regra de negócio violada (DomainException dos Services) vira 422 com {"error": "..."}, como no Pedagógico. */
trait RespondeErroDeNegocio
{
    /** @param callable(): JsonResponse $acao */
    private function executar(callable $acao): JsonResponse
    {
        try {
            return $acao();
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
