<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

/**
 * Geometria plana num plano métrico local (projeção equirretangular centrada
 * no cemitério — erro de centímetros na escala de um cemitério). Mantém as
 * regras topológicas (RN-07, RN-08, RF-18) em PHP, testáveis em qualquer banco.
 * GeoJSON sempre em [longitude, latitude] (WGS 84) — ponto único de conversão.
 *
 * Pontos são pares [x, y]: [lng, lat] em graus ou [leste, norte] em metros.
 */
final class Geo
{
    private const RAIO = 6_371_008.8;

    private const EPS = 1e-9;

    /** Tolerância de borda em metros (as coordenadas guardadas têm resolução de ~0,1 mm). */
    private const TOL = 1e-3;

    /**
     * Anel externo validado, sem o ponto de fechamento, em [lng, lat].
     *
     * @param array<string, mixed> $geojson
     * @return list<array{0: float, 1: float}>
     */
    public static function anel(array $geojson): array
    {
        $anel = $geojson['coordinates'][0] ?? null;
        if (($geojson['type'] ?? null) !== 'Polygon' || !is_array($anel) || count($geojson['coordinates']) !== 1) {
            throw new RegraNegocioException('geometria.invalida', 'Informe um GeoJSON do tipo Polygon, sem furos.');
        }
        if (count($anel) < 4 || $anel[0] !== end($anel)) {
            throw new RegraNegocioException('geometria.anel_aberto', 'O polígono deve ser fechado e ter ao menos 3 vértices.');
        }

        $pontos = [];
        foreach (array_slice($anel, 0, -1) as $p) {
            if (!is_array($p) || !is_numeric($p[0] ?? null) || !is_numeric($p[1] ?? null) || abs((float) $p[0]) > 180 || abs((float) $p[1]) > 90) {
                throw new RegraNegocioException('geometria.invalida', 'Coordenadas devem ser [longitude, latitude] em WGS 84.');
            }
            $pontos[] = [(float) $p[0], (float) $p[1]];
        }

        return $pontos;
    }

    /**
     * @param list<array{0: float, 1: float}> $anel
     * @return array{type: string, coordinates: list<list<list<float>>>}
     */
    public static function geojson(array $anel): array
    {
        $fechado = array_map(fn ($p) => [round($p[0], 9), round($p[1], 9)], [...$anel, $anel[0]]);

        return ['type' => 'Polygon', 'coordinates' => [$fechado]];
    }

    /**
     * @param list<array{0: float, 1: float}> $anel
     * @return array{0: float, 1: float}
     */
    public static function referencia(array $anel): array
    {
        $n = count($anel);

        return [array_sum(array_column($anel, 0)) / $n, array_sum(array_column($anel, 1)) / $n];
    }

    /**
     * @param list<array{0: float, 1: float}> $anel [lng, lat]
     * @param array{0: float, 1: float} $ref
     * @return list<array{0: float, 1: float}> metros
     */
    public static function projetar(array $anel, array $ref): array
    {
        $k = M_PI / 180 * self::RAIO;
        $cos = cos(deg2rad($ref[1]));

        return array_map(fn ($p) => [($p[0] - $ref[0]) * $k * $cos, ($p[1] - $ref[1]) * $k], $anel);
    }

    /**
     * @param list<array{0: float, 1: float}> $pontos metros
     * @param array{0: float, 1: float} $ref
     * @return list<array{0: float, 1: float}> [lng, lat]
     */
    public static function desprojetar(array $pontos, array $ref): array
    {
        $k = M_PI / 180 * self::RAIO;
        $cos = cos(deg2rad($ref[1]));

        return array_map(fn ($p) => [$ref[0] + $p[0] / ($k * $cos), $ref[1] + $p[1] / $k], $pontos);
    }

    /** @param list<array{0: float, 1: float}> $p */
    public static function autoIntersecta(array $p): bool
    {
        $n = count($p);
        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                if ($j === $i + 1 || ($i === 0 && $j === $n - 1)) {
                    continue; // arestas adjacentes
                }
                if (self::segmentosCruzam($p[$i], $p[($i + 1) % $n], $p[$j], $p[($j + 1) % $n])) {
                    return true;
                }
            }
        }

        return abs(self::areaAssinada($p)) < self::EPS;
    }

    /** @param list<array{0: float, 1: float}> $p */
    public static function area(array $p): float
    {
        return abs(self::areaAssinada($p));
    }

    /**
     * @param list<array{0: float, 1: float}> $p
     * @return array{0: float, 1: float}
     */
    public static function centroide(array $p): array
    {
        $a = self::areaAssinada($p);
        $cx = $cy = 0.0;
        $n = count($p);
        for ($i = 0; $i < $n; $i++) {
            [$x0, $y0] = $p[$i];
            [$x1, $y1] = $p[($i + 1) % $n];
            $f = $x0 * $y1 - $x1 * $y0;
            $cx += ($x0 + $x1) * $f;
            $cy += ($y0 + $y1) * $f;
        }

        return [$cx / (6 * $a), $cy / (6 * $a)];
    }

    /**
     * O polígono interno está inteiramente dentro do externo (borda comum é aceita).
     *
     * @param list<array{0: float, 1: float}> $externo
     * @param list<array{0: float, 1: float}> $interno
     */
    public static function contem(array $externo, array $interno): bool
    {
        foreach ($interno as $v) {
            if (!self::pontoDentro($v, $externo) && self::distanciaPontoPoligono($v, $externo) > self::TOL) {
                return false;
            }
        }

        return !self::arestasCruzam($externo, $interno);
    }

    /**
     * Sobreposição de áreas (apenas encostar na borda não conta).
     *
     * @param list<array{0: float, 1: float}> $a
     * @param list<array{0: float, 1: float}> $b
     */
    public static function sobrepoe(array $a, array $b): bool
    {
        if (self::arestasCruzam($a, $b) || self::pontoDentro(self::centroide($a), $b) || self::pontoDentro(self::centroide($b), $a)) {
            return true;
        }
        foreach ([[$a, $b], [$b, $a]] as [$x, $y]) {
            foreach ($x as $v) {
                if (self::pontoDentro($v, $y) && self::distanciaPontoPoligono($v, $y) > self::TOL) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Menor distância entre as bordas, em metros (0 se sobrepõem).
     *
     * @param list<array{0: float, 1: float}> $a
     * @param list<array{0: float, 1: float}> $b
     */
    public static function distancia(array $a, array $b): float
    {
        if (self::sobrepoe($a, $b)) {
            return 0.0;
        }
        $min = INF;
        foreach ($a as $v) {
            $min = min($min, self::distanciaPontoPoligono($v, $b));
        }
        foreach ($b as $v) {
            $min = min($min, self::distanciaPontoPoligono($v, $a));
        }

        return $min;
    }

    /**
     * Comprimento × largura: para quadriláteros, média dos lados opostos;
     * para outros polígonos, caixa alinhada ao lado mais longo.
     *
     * @param list<array{0: float, 1: float}> $p
     * @return array{comprimento: float, largura: float}
     */
    public static function dimensoes(array $p): array
    {
        $n = count($p);
        if ($n === 4) {
            $l = array_map(fn ($i) => self::dist($p[$i], $p[($i + 1) % 4]), range(0, 3));
            $a = ($l[0] + $l[2]) / 2;
            $b = ($l[1] + $l[3]) / 2;

            return ['comprimento' => max($a, $b), 'largura' => min($a, $b)];
        }

        $maior = 0;
        for ($i = 1; $i < $n; $i++) {
            if (self::dist($p[$i], $p[($i + 1) % $n]) > self::dist($p[$maior], $p[($maior + 1) % $n])) {
                $maior = $i;
            }
        }
        $ang = atan2($p[($maior + 1) % $n][1] - $p[$maior][1], $p[($maior + 1) % $n][0] - $p[$maior][0]);
        $r = array_map(fn ($q) => [$q[0] * cos(-$ang) - $q[1] * sin(-$ang), $q[0] * sin(-$ang) + $q[1] * cos(-$ang)], $p);
        $w = max(array_column($r, 0)) - min(array_column($r, 0));
        $h = max(array_column($r, 1)) - min(array_column($r, 1));

        return ['comprimento' => max($w, $h), 'largura' => min($w, $h)];
    }

    /**
     * @param list<array{0: float, 1: float}> $anel
     * @return array{min_lng: float, min_lat: float, max_lng: float, max_lat: float}
     */
    public static function caixa(array $anel): array
    {
        return [
            'min_lng' => min(array_column($anel, 0)), 'min_lat' => min(array_column($anel, 1)),
            'max_lng' => max(array_column($anel, 0)), 'max_lat' => max(array_column($anel, 1)),
        ];
    }

    /**
     * @param array{0: float, 1: float} $a
     * @param array{0: float, 1: float} $b
     */
    public static function dist(array $a, array $b): float
    {
        return hypot($a[0] - $b[0], $a[1] - $b[1]);
    }

    /** @param list<array{0: float, 1: float}> $p */
    private static function areaAssinada(array $p): float
    {
        $s = 0.0;
        $n = count($p);
        for ($i = 0; $i < $n; $i++) {
            $s += $p[$i][0] * $p[($i + 1) % $n][1] - $p[($i + 1) % $n][0] * $p[$i][1];
        }

        return $s / 2;
    }

    /**
     * @param array{0: float, 1: float} $pt
     * @param list<array{0: float, 1: float}> $poly
     */
    private static function pontoDentro(array $pt, array $poly): bool
    {
        $dentro = false;
        $n = count($poly);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            [$xi, $yi] = $poly[$i];
            [$xj, $yj] = $poly[$j];
            if (($yi > $pt[1]) !== ($yj > $pt[1]) && $pt[0] < ($xj - $xi) * ($pt[1] - $yi) / ($yj - $yi) + $xi) {
                $dentro = !$dentro;
            }
        }

        return $dentro;
    }

    /**
     * @param list<array{0: float, 1: float}> $a
     * @param list<array{0: float, 1: float}> $b
     */
    private static function arestasCruzam(array $a, array $b): bool
    {
        $na = count($a);
        $nb = count($b);
        for ($i = 0; $i < $na; $i++) {
            for ($j = 0; $j < $nb; $j++) {
                if (self::segmentosCruzam($a[$i], $a[($i + 1) % $na], $b[$j], $b[($j + 1) % $nb])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Cruzamento próprio (os interiores dos segmentos se cortam além da tolerância de borda).
     *
     * @param array{0: float, 1: float} $p1
     * @param array{0: float, 1: float} $p2
     * @param array{0: float, 1: float} $p3
     * @param array{0: float, 1: float} $p4
     */
    private static function segmentosCruzam(array $p1, array $p2, array $p3, array $p4): bool
    {
        $l12 = self::dist($p1, $p2);
        $l34 = self::dist($p3, $p4);
        if ($l12 < self::EPS || $l34 < self::EPS) {
            return false;
        }
        // Distâncias assinadas (m) de cada extremidade à reta do outro segmento.
        $d1 = self::orientacao($p3, $p4, $p1) / $l34;
        $d2 = self::orientacao($p3, $p4, $p2) / $l34;
        $d3 = self::orientacao($p1, $p2, $p3) / $l12;
        $d4 = self::orientacao($p1, $p2, $p4) / $l12;
        $opostos = fn (float $a, float $b) => ($a > self::TOL && $b < -self::TOL) || ($a < -self::TOL && $b > self::TOL);

        return $opostos($d1, $d2) && $opostos($d3, $d4);
    }

    /**
     * @param array{0: float, 1: float} $a
     * @param array{0: float, 1: float} $b
     * @param array{0: float, 1: float} $c
     */
    private static function orientacao(array $a, array $b, array $c): float
    {
        return ($b[0] - $a[0]) * ($c[1] - $a[1]) - ($b[1] - $a[1]) * ($c[0] - $a[0]);
    }

    /**
     * @param array{0: float, 1: float} $pt
     * @param list<array{0: float, 1: float}> $poly
     */
    private static function distanciaPontoPoligono(array $pt, array $poly): float
    {
        $min = INF;
        $n = count($poly);
        for ($i = 0; $i < $n; $i++) {
            $min = min($min, self::distanciaPontoSegmento($pt, $poly[$i], $poly[($i + 1) % $n]));
        }

        return $min;
    }

    /**
     * @param array{0: float, 1: float} $p
     * @param array{0: float, 1: float} $a
     * @param array{0: float, 1: float} $b
     */
    private static function distanciaPontoSegmento(array $p, array $a, array $b): float
    {
        $dx = $b[0] - $a[0];
        $dy = $b[1] - $a[1];
        $len = $dx * $dx + $dy * $dy;
        $t = $len > 0 ? max(0, min(1, (($p[0] - $a[0]) * $dx + ($p[1] - $a[1]) * $dy) / $len)) : 0;

        return hypot($p[0] - ($a[0] + $t * $dx), $p[1] - ($a[1] + $t * $dy));
    }
}
