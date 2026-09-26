<?php

declare(strict_types=1);

namespace Modules\Capd\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Capd\Models\CicloAvaliacao;

final class CicloOpened
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly CicloAvaliacao $ciclo,
    ) {}
}
