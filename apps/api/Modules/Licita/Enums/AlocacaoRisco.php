<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

/** A quem o risco é alocado — mesma nomenclatura do modelo de referência. */
enum AlocacaoRisco: string
{
    case Contratante = 'contratante';
    case Contratada = 'contratada';
    case Compartilhado = 'compartilhado';

    public function label(): string
    {
        return match ($this) {
            self::Contratante => 'Contratante',
            self::Contratada => 'Contratada',
            self::Compartilhado => 'Compartilhado',
        };
    }
}
