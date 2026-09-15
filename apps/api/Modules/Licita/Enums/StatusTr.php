<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

/**
 * Sem máquina de estados própria — `Aprovado` só é setado em lote pela
 * `AprovacaoFinalService` (aprovação do Ordenador sobre todo o pacote de
 * artefatos do processo), nunca pelo próprio TR. Enquanto `Rascunho`, o
 * documento fica sempre editável pela equipe de planejamento.
 */
enum StatusTr: string
{
    case Rascunho = 'rascunho';
    case Aprovado = 'aprovado';

    public function label(): string
    {
        return match ($this) {
            self::Rascunho => 'Rascunho',
            self::Aprovado => 'Aprovado',
        };
    }

    public function is(self ...$statuses): bool
    {
        return in_array($this, $statuses, true);
    }
}
