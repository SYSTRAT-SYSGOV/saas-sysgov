<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

/**
 * Método de cálculo do valor de referência a partir das cotações de cada
 * item (IN SEGES/ME nº 65/2021, art. 6º) — "mediana" é o método preferencial
 * da norma, mas o órgão pode optar por outro conforme a peculiaridade do
 * mercado, desde que justificado (ver `PesquisaPreco::justificativa_metodo`).
 */
enum MetodoReferenciaPreco: string
{
    case Media = 'media';
    case Mediana = 'mediana';
    case MenorValor = 'menor_valor';

    public function label(): string
    {
        return match ($this) {
            self::Media => 'Média',
            self::Mediana => 'Mediana',
            self::MenorValor => 'Menor Valor',
        };
    }
}
