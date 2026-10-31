<?php

declare(strict_types=1);

namespace Modules\Transporte\Enums;

enum OrigemVeiculo: string
{
    case Propria = 'propria';
    case Locada = 'locada';
    case Terceirizada = 'terceirizada';

    public function label(): string
    {
        return match ($this) {
            self::Propria => 'Própria',
            self::Locada => 'Locada',
            self::Terceirizada => 'Terceirizada',
        };
    }

    /** Tipo de empresa que a origem exige (`null`: veículo próprio não tem empresa). */
    public function empresaExigida(): ?TipoEmpresa
    {
        return match ($this) {
            self::Propria => null,
            self::Locada => TipoEmpresa::Locadora,
            self::Terceirizada => TipoEmpresa::Prestadora,
        };
    }
}
