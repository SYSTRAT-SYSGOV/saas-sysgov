<?php

declare(strict_types=1);

namespace Modules\Ata\Http\Controllers\Concerns;

use DomainException;
use Modules\Ata\Exceptions\AtaBloqueadaException;
use Modules\Ata\Exceptions\IaIndisponivelException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Erros de negócio dos Services viram {"error": "..."}: estado da ata (texto travado, assinatura repetida,
 * finalizada) → 409; IA sem chave → 503; demais regras → 422.
 */
trait RespondeErroDeNegocio
{
    /** @param callable(): Response $acao */
    private function executar(callable $acao): Response
    {
        try {
            return $acao();
        } catch (AtaBloqueadaException $e) {
            return response()->json(['error' => $e->getMessage()], 409);
        } catch (IaIndisponivelException $e) {
            return response()->json(['error' => $e->getMessage()], 503);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
