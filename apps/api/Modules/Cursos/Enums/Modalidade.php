<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum Modalidade: string
{
    case Presencial = 'presencial';
    case Online = 'online';
    case Hibrido = 'hibrido';

    public function label(): string
    {
        return match ($this) {
            self::Presencial => 'Presencial',
            self::Online => 'Online',
            self::Hibrido => 'Híbrido',
        };
    }

    public function exigeLocal(): bool
    {
        return $this !== self::Online;
    }

    public function exigeLink(): bool
    {
        return $this !== self::Presencial;
    }
}
