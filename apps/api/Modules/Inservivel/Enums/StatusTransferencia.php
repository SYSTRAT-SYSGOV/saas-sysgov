<?php

declare(strict_types=1);

namespace Modules\Inservivel\Enums;

/** Situação da transferência interna (D11). Anunciado e Solicitado são as "abertas" (uma por bem). */
enum StatusTransferencia: string
{
    case Anunciado = 'anunciado';
    case Solicitado = 'solicitado';
    case Aceito = 'aceito';
    case Recusado = 'recusado';
    case Cancelado = 'cancelado';

    public function rotulo(): string
    {
        return match ($this) {
            self::Anunciado => 'Anunciado',
            self::Solicitado => 'Solicitado',
            self::Aceito => 'Aceito',
            self::Recusado => 'Recusado',
            self::Cancelado => 'Cancelado',
        };
    }

    /** @return list<string> */
    public static function abertas(): array
    {
        return [self::Anunciado->value, self::Solicitado->value];
    }
}
