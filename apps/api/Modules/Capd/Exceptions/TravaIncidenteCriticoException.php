<?php

namespace Modules\Capd\Exceptions;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Exceção lançada quando a trava antileniência/antiprecipitação é acionada.
 * Resulta em HTTP 422 Unprocessable Entity.
 *
 * Corresponde ao TC-01 e TC-02 da matriz de testes (spec §12).
 */
final class TravaIncidenteCriticoException extends UnprocessableEntityHttpException
{
    public function __construct(
        public readonly string $fator,
        string $mensagem,
    ) {
        parent::__construct($mensagem);
    }
}
