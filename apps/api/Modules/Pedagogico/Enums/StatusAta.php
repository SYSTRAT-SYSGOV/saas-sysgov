<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

/** rascunho → finalizada → arquivada (rascunho também pode ser arquivado). Finalizada não é editada. */
enum StatusAta: string
{
    case Rascunho = 'rascunho';
    case Finalizada = 'finalizada';
    case Arquivada = 'arquivada';

    public function podeTransicionarPara(self $novo): bool
    {
        return match ($this) {
            self::Rascunho => $novo === self::Finalizada || $novo === self::Arquivada,
            self::Finalizada => $novo === self::Arquivada,
            self::Arquivada => false,
        };
    }
}
