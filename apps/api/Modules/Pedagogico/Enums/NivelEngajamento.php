<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

enum NivelEngajamento: string
{
    case Alta = 'alta';
    case Moderada = 'moderada';
    case Baixa = 'baixa';
}
