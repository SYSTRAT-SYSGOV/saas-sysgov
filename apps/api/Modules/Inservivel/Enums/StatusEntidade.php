<?php

declare(strict_types=1);

namespace Modules\Inservivel\Enums;

/** Situação cadastral da entidade (spec: Entidades sem fins lucrativos). */
enum StatusEntidade: string
{
    case Pendente = 'pendente';
    case EmAnalise = 'em_analise';
    case Habilitada = 'habilitada';
    case Reprovada = 'reprovada';
    case Desabilitada = 'desabilitada';

    public function rotulo(): string
    {
        return match ($this) {
            self::Pendente => 'Pendente',
            self::EmAnalise => 'Em Análise',
            self::Habilitada => 'Habilitada',
            self::Reprovada => 'Reprovada',
            self::Desabilitada => 'Desabilitada',
        };
    }

    public function aguardandoAnalise(): bool
    {
        return in_array($this, [self::Pendente, self::EmAnalise], true);
    }

    public function exigeMotivo(): bool
    {
        return in_array($this, [self::Reprovada, self::Desabilitada], true);
    }
}
