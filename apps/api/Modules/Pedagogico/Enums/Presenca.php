<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

enum Presenca: string
{
    case Presente = 'presente';
    case Falta = 'falta';
    case FaltaJustificada = 'falta_justificada';
}
