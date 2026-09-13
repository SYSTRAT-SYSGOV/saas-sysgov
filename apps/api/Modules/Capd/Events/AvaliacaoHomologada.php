<?php

declare(strict_types=1);

namespace Modules\Capd\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Modules\Capd\Models\Avaliacao;

/**
 * Disparado quando uma Avaliacao transiciona de homologada=false para true
 * (RN-C07). Consumido, entre outros, por RecalcularNotaConsolidada para
 * fechar avaliações consolidadas de transferência de unidade.
 */
final class AvaliacaoHomologada
{
    use Dispatchable;

    public function __construct(public readonly Avaliacao $avaliacao)
    {
    }
}
