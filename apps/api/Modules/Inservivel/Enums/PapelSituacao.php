<?php

declare(strict_types=1);

namespace Modules\Inservivel\Enums;

/**
 * Papéis de sistema da situação do bem (D2). As regras do módulo usam o papel, nunca o nome: a prefeitura pode
 * renomear a situação, mas não excluí-la nem desativá-la.
 */
enum PapelSituacao: string
{
    case Inservivel = 'inservivel';
    case EmAvaliacao = 'em_avaliacao';
    case EmLote = 'em_lote';
    case Doado = 'doado';
    case Baixado = 'baixado';
    case Disponivel = 'disponivel';
    case EmTransferencia = 'em_transferencia';

    public function nomePadrao(): string
    {
        return match ($this) {
            self::Inservivel => 'Inservível',
            self::EmAvaliacao => 'Em Avaliação',
            self::EmLote => 'Em Lote',
            self::Doado => 'Doado',
            self::Baixado => 'Baixado',
            self::Disponivel => 'Disponível',
            self::EmTransferencia => 'Em Transferência',
        };
    }

    /** Papéis que só os fluxos de lote e de transferência alcançam (a edição comum do bem rejeita). */
    public function soPorFluxo(): bool
    {
        return in_array($this, [self::EmLote, self::EmTransferencia], true);
    }
}
