<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

use DomainException;
use Illuminate\Http\JsonResponse;

/** Violação de regra de negócio → 422 com código legível (design D8). */
final class RegraNegocioException extends DomainException
{
    /** @param array<string, mixed> $contexto */
    public function __construct(
        public readonly string $codigo,
        string $mensagem,
        public readonly array $contexto = [],
    ) {
        parent::__construct($mensagem);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->codigo] + $this->contexto, 422);
    }
}
