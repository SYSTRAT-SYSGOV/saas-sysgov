<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Requerimentos\Models\TramitacaoPoderes;

final class PrazoProximo
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly TramitacaoPoderes $tramitacao,
        public readonly int $diasRestantes,
    ) {}
}