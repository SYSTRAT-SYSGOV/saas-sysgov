<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

enum StatusAprovacaoFinal: string
{
    case Pendente = 'pendente';
    case Aprovada = 'aprovada';
    case Rejeitada = 'rejeitada';

    public function label(): string
    {
        return match ($this) {
            self::Pendente => 'Pendente',
            self::Aprovada => 'Aprovada',
            self::Rejeitada => 'Rejeitada',
        };
    }

    public function is(self ...$statuses): bool
    {
        return in_array($this, $statuses, true);
    }
}
