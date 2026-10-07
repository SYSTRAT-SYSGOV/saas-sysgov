<?php

declare(strict_types=1);

namespace Modules\Vistoria\Events;

use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Vistoria\Models\OrdemServico;

/**
 * Disparado quando a chefia reatribui uma ordem de serviço de um fiscal para outro — é o
 * gancho para notificar ambos (o fiscal anterior, que perdeu a ordem, e o novo, que a
 * recebeu). Mesma limitação de `OrdemServicoAtribuida`: não existe infraestrutura de
 * notificação real neste repositório.
 */
final class OrdemServicoReatribuida
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly OrdemServico $ordemServico,
        public readonly ?User $fiscalAnterior,
        public readonly User $fiscalNovo,
    ) {}
}
