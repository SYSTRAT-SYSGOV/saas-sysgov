<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Http\Controllers\Concerns;

use DomainException;
use Symfony\Component\HttpFoundation\Response;

/** Regras de negócio dos Services (DomainException) viram 422 com {"error": "..."}. */
trait RespondeErroDeNegocio
{
    /** @param callable(): Response $acao */
    private function executar(callable $acao): Response
    {
        try {
            return $acao();
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
