<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

/**
 * Critérios de julgamento das propostas (art. 33 da Lei 14.133/2021).
 */
enum CriterioJulgamentoTr: string
{
    case MenorPreco = 'menor_preco';
    case MaiorDesconto = 'maior_desconto';
    case MelhorTecnica = 'melhor_tecnica';
    case TecnicaEPreco = 'tecnica_e_preco';
    case MaiorLance = 'maior_lance';

    public function label(): string
    {
        return match ($this) {
            self::MenorPreco => 'Menor Preço',
            self::MaiorDesconto => 'Maior Desconto',
            self::MelhorTecnica => 'Melhor Técnica ou Conteúdo Artístico',
            self::TecnicaEPreco => 'Técnica e Preço',
            self::MaiorLance => 'Maior Lance (leilão)',
        };
    }
}
