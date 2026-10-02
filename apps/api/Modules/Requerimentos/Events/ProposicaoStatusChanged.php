<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Requerimentos\Models\Proposicao;

final class ProposicaoStatusChanged
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Proposicao $proposicao,
        public readonly string $statusAnterior,
        public readonly string $statusNovo,
    ) {}
}