<?php

declare(strict_types=1);

namespace Modules\Inservivel\Enums;

/** Ciclo do lote (spec: Lotes; D5). Sorteado só é alcançado pelo sorteio. */
enum StatusLote: string
{
    case Aberto = 'aberto';
    case Publicado = 'publicado';
    case Sorteado = 'sorteado';
    case Entregue = 'entregue';
    case Baixado = 'baixado';

    public function rotulo(): string
    {
        return match ($this) {
            self::Aberto => 'Aberto',
            self::Publicado => 'Publicado',
            self::Sorteado => 'Sorteado',
            self::Entregue => 'Entregue',
            self::Baixado => 'Baixado',
        };
    }

    /** @return list<self> transições manuais permitidas a partir deste status */
    public function proximos(): array
    {
        return match ($this) {
            self::Aberto => [self::Publicado],
            self::Publicado => [self::Aberto],
            self::Sorteado => [self::Entregue],
            self::Entregue => [self::Baixado],
            self::Baixado => [],
        };
    }

    /** Depois do sorteio: termos disponíveis e exclusão bloqueada. */
    public function sorteado(): bool
    {
        return in_array($this, [self::Sorteado, self::Entregue, self::Baixado], true);
    }
}
