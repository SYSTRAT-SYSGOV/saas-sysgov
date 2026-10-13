<?php

declare(strict_types=1);

namespace Modules\Vistoria\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Vistoria\Models\OrdemServico;

/**
 * Disparado quando um fiscal é designado para a ordem de serviço, seja na
 * criação (designação manual) ou pela distribuição automática — é o gancho
 * para notificar o fiscal designado.
 */
final class OrdemServicoAtribuida
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly OrdemServico $ordemServico,
    ) {}
}
