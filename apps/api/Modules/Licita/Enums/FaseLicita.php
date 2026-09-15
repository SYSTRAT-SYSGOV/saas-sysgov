<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

/**
 * `Etp`, `MapaRiscos`, `PesquisaPrecos`, `Tr` e `Edital` continuam existindo
 * como identificadores de "tipo de documento" (campos configuráveis, PDF,
 * filtros) mas **não são mais valores possíveis de `Processo::fase_atual`**
 * — depois do DFD aprovado, a equipe de planejamento edita esses documentos
 * livremente e em qualquer ordem, sem gate de aprovação entre eles. O ciclo
 * de vida do processo em si (`fase_atual`) só transita entre `Dfd →
 * EmElaboracao → AprovacaoOrdenador → Concluido`.
 */
enum FaseLicita: string
{
    case Dfd = 'dfd';
    case EmElaboracao = 'em_elaboracao';
    case AprovacaoOrdenador = 'aprovacao_ordenador';
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
            self::EmElaboracao => 'Em Elaboração',
            self::AprovacaoOrdenador => 'Aprovação do Ordenador',
            self::Etp => 'ETP',
            self::MapaRiscos => 'Mapa de Riscos',
            self::PesquisaPrecos => 'Pesquisa de Preços',
            self::Tr => 'Termo de Referência',
            self::Edital => 'Edital',
            self::Concluido => 'Concluído',
        };
    }
}
