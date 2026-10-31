<?php

declare(strict_types=1);

namespace Modules\Transporte\Enums;

enum Turno: string
{
    case Manha = 'manha';
    case Tarde = 'tarde';
    case Noite = 'noite';
    case Integral = 'integral';

    public function label(): string
    {
        return match ($this) {
            self::Manha => 'Manhã',
            self::Tarde => 'Tarde',
            self::Noite => 'Noite',
            self::Integral => 'Integral',
        };
    }
}
