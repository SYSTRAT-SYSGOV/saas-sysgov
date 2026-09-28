<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** Optimistic locking: o jazigo mudou desde a leitura (RNF-06) → 409. */
final class ConflitoVersaoException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('O jazigo foi alterado por outra operação. Recarregue e tente novamente.');
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => 'jazigo.conflito_versao'], 409);
    }
}
