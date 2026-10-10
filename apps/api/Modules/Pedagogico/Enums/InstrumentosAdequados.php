<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

enum InstrumentosAdequados: string
{
    case Sim = 'sim';
    case Parcialmente = 'parcialmente';
    case Nao = 'nao';
}
