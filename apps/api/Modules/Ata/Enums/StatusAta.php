<?php

declare(strict_types=1);

namespace Modules\Ata\Enums;

/**
 * Ciclo de vida da ata (D5 — padrão de ata): em_redacao → rascunho → finalizada, sem volta.
 * Só em_redacao aceita mudança de texto, dados e participantes; só o rascunho aceita assinaturas.
 */
enum StatusAta: string
{
    case EmRedacao = 'em_redacao';
    case Rascunho = 'rascunho';
    case Finalizada = 'finalizada';

    public function editavel(): bool
    {
        return $this === self::EmRedacao;
    }

    /** Assina-se o texto já travado: só no rascunho. */
    public function aceitaAssinatura(): bool
    {
        return $this === self::Rascunho;
    }

    public function rotulo(): string
    {
        return match ($this) {
            self::EmRedacao => 'Em redação',
            self::Rascunho => 'Rascunho (aguardando assinaturas)',
            self::Finalizada => 'Finalizada',
        };
    }
}
