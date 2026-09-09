<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

enum FaseLicita: string
{
    case Dfd = 'dfd';
    case Etp = 'etp';
    case MapaRiscos = 'mapa_riscos';
    case PesquisaPrecos = 'pesquisa_precos';
    case Tr = 'tr';
    case Edital = 'edital';
    case Concluido = 'concluido';

    public function label(): string
    {
        return match ($this) {
            self::Dfd => 'DFD',
            self::Etp => 'ETP',
            self::MapaRiscos => 'Mapa de Riscos',
            self::PesquisaPrecos => 'Pesquisa de Preços',
            self::Tr => 'Termo de Referência',
            self::Edital => 'Edital',
            self::Concluido => 'Concluído',
        };
    }
}
