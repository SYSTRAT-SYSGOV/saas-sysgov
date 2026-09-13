<?php

declare(strict_types=1);

namespace Modules\Capd\Support;

/**
 * Resultado da resolução do avaliador de um servidor por HierarquiaService.
 */
final readonly class ResolvedAvaliador
{
    public function __construct(
        public ?int $userId,
        public int $nivelUsado,
        public bool $viaTopo,
        public bool $pendente,
    ) {
    }

    public static function pendente(): self
    {
        return new self(userId: null, nivelUsado: 0, viaTopo: false, pendente: true);
    }

    public static function resolvido(int $userId, int $nivelUsado, bool $viaTopo = false): self
    {
        return new self(userId: $userId, nivelUsado: $nivelUsado, viaTopo: $viaTopo, pendente: false);
    }
}
