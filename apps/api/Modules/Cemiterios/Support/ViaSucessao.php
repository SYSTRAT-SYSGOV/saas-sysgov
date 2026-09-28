<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

/** Vias de sucessão hereditária. */
enum ViaSucessao: string
{
    case InventarioJudicial = 'inventario_judicial';
    case InventarioExtrajudicial = 'inventario_extrajudicial';
    case AlvaráJudicial = 'alvara_judicial';
    case Arrolamento = 'arrolamento';
}