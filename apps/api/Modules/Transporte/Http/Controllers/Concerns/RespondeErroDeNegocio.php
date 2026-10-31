<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers\Concerns;

use DomainException;
use Modules\Transporte\Support\ConflitoException;
use Symfony\Component\HttpFoundation\Response;

/** Regras de negócio dos Services viram {"error": "..."}: conflito é 409 e as demais (DomainException) são 422. */
trait RespondeErroDeNegocio
{
    /** @param callable(): Response $acao */
    private function executar(callable $acao): Response
    {
        try {
            return $acao();
        } catch (ConflitoException $e) {
            return response()->json(['error' => $e->getMessage()], 409);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
