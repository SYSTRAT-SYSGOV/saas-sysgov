<?php

declare(strict_types=1);

namespace Modules\Transporte\Geo;

/** Contas sobre um traçado de pares `[latitude, longitude]`: comprimento e simplificação. */
final class Percurso
{
    private const RAIO_TERRA_KM = 6371.0088;

    /** Cerca de 11 m: abaixo disso o desvio some na escala do mapa e do cálculo de custo. */
    public const TOLERANCIA = 0.0001;

    /**
     * Comprimento pela fórmula de haversine, em km, com 2 casas.
     *
     * @param list<array{0: float, 1: float}> $pontos
     */
    public static function km(array $pontos): float
    {
        $total = 0.0;
        for ($i = 1, $n = count($pontos); $i < $n; $i++) {
            $total += self::distancia($pontos[$i - 1], $pontos[$i]);
        }

        return round($total, 2);
    }

    /**
     * Douglas-Peucker iterativo (arquivos de GPS têm dezenas de milhares de pontos, a recursão estouraria a pilha).
     * Se ainda passar do teto, a tolerância sobe até caber. Preserva o primeiro e o último ponto.
     *
     * @param list<array{0: float, 1: float}> $pontos
     * @return list<array{0: float, 1: float}>
     */
    public static function simplificar(array $pontos, int $teto, float $tolerancia = self::TOLERANCIA): array
    {
        $saida = $pontos;
        for ($t = max($tolerancia, 1.0E-6); $t < 1.0; $t *= 1.6) {
            $saida = self::reduzir($pontos, $t);
            if (count($saida) <= $teto) {
                return $saida;
            }
        }

        return array_slice($saida, 0, $teto);
    }

    /**
     * @param list<array{0: float, 1: float}> $pontos
     * @return list<array{0: float, 1: float}>
     */
    private static function reduzir(array $pontos, float $tolerancia): array
    {
        $n = count($pontos);
        if ($n < 3) {
            return $pontos;
        }
        $manter = array_fill(0, $n, false);
        $manter[0] = $manter[$n - 1] = true;
        $pilha = [[0, $n - 1]];
        while ($pilha !== []) {
            [$ini, $fim] = array_pop($pilha);
            $maior = 0.0;
            $indice = -1;
            for ($i = $ini + 1; $i < $fim; $i++) {
                $d = self::distanciaAoSegmento($pontos[$i], $pontos[$ini], $pontos[$fim]);
                if ($d > $maior) {
                    $maior = $d;
                    $indice = $i;
                }
            }
            if ($indice !== -1 && $maior > $tolerancia) {
                $manter[$indice] = true;
                $pilha[] = [$ini, $indice];
                $pilha[] = [$indice, $fim];
            }
        }
        $saida = [];
        foreach ($pontos as $i => $p) {
            if ($manter[$i]) {
                $saida[] = $p;
            }
        }

        return $saida;
    }

    /**
     * @param array{0: float, 1: float} $a
     * @param array{0: float, 1: float} $b
     */
    private static function distancia(array $a, array $b): float
    {
        $dLat = deg2rad($b[0] - $a[0]);
        $dLng = deg2rad($b[1] - $a[1]);
        $h = sin($dLat / 2) ** 2 + cos(deg2rad($a[0])) * cos(deg2rad($b[0])) * sin($dLng / 2) ** 2;

        return 2 * self::RAIO_TERRA_KM * asin(min(1.0, sqrt($h)));
    }

    /**
     * Distância planar em graus (como no SETE): basta para decidir o que descartar numa tolerância de ~11 m.
     *
     * @param array{0: float, 1: float} $p
     * @param array{0: float, 1: float} $a
     * @param array{0: float, 1: float} $b
     */
    private static function distanciaAoSegmento(array $p, array $a, array $b): float
    {
        $dx = $b[1] - $a[1];
        $dy = $b[0] - $a[0];
        $quadrado = $dx * $dx + $dy * $dy;
        if ($quadrado === 0.0) {
            return hypot($p[1] - $a[1], $p[0] - $a[0]);
        }
        $t = max(0.0, min(1.0, (($p[1] - $a[1]) * $dx + ($p[0] - $a[0]) * $dy) / $quadrado));

        return hypot($p[1] - ($a[1] + $t * $dx), $p[0] - ($a[0] + $t * $dy));
    }
}
