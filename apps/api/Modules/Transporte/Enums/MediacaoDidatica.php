<?php

declare(strict_types=1);

namespace Modules\Transporte\Enums;

enum MediacaoDidatica: string
{
    case Presencial = 'presencial';
    case Semipresencial = 'semipresencial';
    case Distancia = 'distancia';

    public function label(): string
    {
        return match ($this) {
            self::Presencial => 'Presencial',
            self::Semipresencial => 'Semipresencial',
            self::Distancia => 'Educação a distância',
        };
    }
}
