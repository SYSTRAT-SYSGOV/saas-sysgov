<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

enum StatusMapaRisco: string
{
    case Rascunho = 'rascunho';
    case EmRevisao = 'em_revisao';
    case Aprovado = 'aprovado';
    case Rejeitado = 'rejeitado';

    public function label(): string
    {
        return match ($this) {
            self::Rascunho => 'Rascunho',
            self::EmRevisao => 'Em Revisão',
            self::Aprovado => 'Aprovado',
            self::Rejeitado => 'Rejeitado',
        };
    }

    public function is(self ...$statuses): bool
    {
        return in_array($this, $statuses, true);
    }

    /**
     * Mesma máquina de estados do DFD/ETP (ver StatusDfd::podeTransicionarPara).
     */
    public function podeTransicionarPara(self $novo): bool
    {
        return match ($this) {
            self::Rascunho => $novo->is(self::EmRevisao),
            self::EmRevisao => $novo->is(self::Aprovado, self::Rejeitado),
            self::Aprovado => false,
            self::Rejeitado => $novo->is(self::Rascunho),
        };
    }
}
