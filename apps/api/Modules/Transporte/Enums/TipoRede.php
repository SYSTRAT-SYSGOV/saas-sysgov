<?php

declare(strict_types=1);

namespace Modules\Transporte\Enums;

enum TipoRede: string
{
    case Rural = 'rural';
    case Urbana = 'urbana';
    case Mista = 'mista';

    public function label(): string
    {
        return match ($this) {
            self::Rural => 'Rural',
            self::Urbana => 'Urbana',
            self::Mista => 'Mista',
        };
    }
}
