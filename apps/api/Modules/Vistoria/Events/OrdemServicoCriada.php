<?php

declare(strict_types=1);

namespace Modules\Vistoria\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Vistoria\Models\OrdemServico;

final class OrdemServicoCriada
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly OrdemServico $ordemServico,
    ) {}
}
