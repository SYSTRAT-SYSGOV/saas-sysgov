<?php

declare(strict_types=1);

namespace Modules\Vistoria\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Vistoria\Models\ProcessoSancionatorio;

/**
 * Disparado quando um processo sancionatório é aberto automaticamente a partir de um
 * auto de infração — é o gancho para notificar o autuado (ver nota em
 * `OrdemServicoAtribuida`: não existe infraestrutura de notificação real neste repositório).
 */
final class ProcessoSancionatorioAberto
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly ProcessoSancionatorio $processo,
    ) {}
}
