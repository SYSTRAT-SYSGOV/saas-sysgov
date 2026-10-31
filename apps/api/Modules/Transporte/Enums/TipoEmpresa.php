<?php

declare(strict_types=1);

namespace Modules\Transporte\Enums;

enum TipoEmpresa: string
{
    case Prestadora = 'prestadora';
    case Locadora = 'locadora';

    public function label(): string
    {
        return match ($this) {
            self::Prestadora => 'Prestadora de serviço',
            self::Locadora => 'Locadora de veículos',
        };
    }
}
