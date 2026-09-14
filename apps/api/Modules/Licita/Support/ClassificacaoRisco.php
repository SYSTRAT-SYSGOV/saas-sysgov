<?php

declare(strict_types=1);

namespace Modules\Licita\Support;

/**
 * Nível e classificação de um risco (Probabilidade x Impacto, escala 1-5
 * cada) — faixas de corte replicadas do modelo de referência já usado pela
 * prefeitura fora do SYSGOV (mapa de risco padrão, matriz 5x5):
 * 1-4 Aceitável (verde), 5-14 Moderado (amarelo), 15-25 Intolerável
 * (vermelho). Nunca persistido — sempre calculado a partir de
 * probabilidade/impacto, pra nunca ficar desatualizado em relação aos
 * valores editados. Espelhado no front em `classificacaoRisco.ts`.
 */
final class ClassificacaoRisco
{
    public static function nivel(int $probabilidade, int $impacto): int
    {
        return $probabilidade * $impacto;
    }

    public static function classificacao(int $probabilidade, int $impacto): string
    {
        $nivel = self::nivel($probabilidade, $impacto);

        return match (true) {
            $nivel <= 4 => 'aceitavel',
            $nivel <= 14 => 'moderado',
            default => 'intoleravel',
        };
    }

    public static function classificacaoLabel(string $classificacao): string
    {
        return match ($classificacao) {
            'aceitavel' => 'Aceitável',
            'moderado' => 'Moderado',
            'intoleravel' => 'Intolerável',
            default => $classificacao,
        };
    }
}
