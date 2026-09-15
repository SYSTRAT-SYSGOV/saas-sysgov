<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

/**
 * Saneamento estatístico de amostras de preço por Coeficiente de Variação
 * (CV%), metodologia referenciada em acórdãos do TCU e usada como referência
 * de mercado por soluções de pesquisa de preços (ex.: EstimAI): remove
 * iterativamente o valor mais distante da mediana enquanto o CV% da amostra
 * estiver acima do limiar de 25%, nunca reduzindo a amostra abaixo do
 * mínimo de cotações exigido pela RN-006 (IN SEGES/ME nº 65/2021).
 */
final class SaneamentoEstatisticoService
{
    private const LIMIAR_CV_PERCENTUAL = 25.0;
    private const MINIMO_VALORES_RESTANTES = 3;

    /**
     * @param float[] $valores
     * @return array{valores_saneados: float[], outliers_removidos: float[], media: float, mediana: float, desvio_padrao: float, cv_percentual: float}
     */
    public function sanear(array $valores): array
    {
        $valores = array_values(array_filter($valores, static fn (float $v): bool => $v > 0));
        $outliers = [];

        // Só faz sentido remover outlier se sobrar margem para respeitar o
        // mínimo de cotações — com exatamente o mínimo (ou menos), a amostra
        // é devolvida como está, mesmo que o CV% fique acima do limiar.
        while (
            count($valores) > self::MINIMO_VALORES_RESTANTES
            && $this->cvPercentual($valores) > self::LIMIAR_CV_PERCENTUAL
        ) {
            $mediana = $this->mediana($valores);
            $indiceMaisDistante = null;
            $maiorDesvio = -1.0;

            foreach ($valores as $indice => $valor) {
                $desvio = abs($valor - $mediana);
                if ($desvio > $maiorDesvio) {
                    $maiorDesvio = $desvio;
                    $indiceMaisDistante = $indice;
                }
            }

            if ($indiceMaisDistante === null) {
                break;
            }

            $outliers[] = $valores[$indiceMaisDistante];
            unset($valores[$indiceMaisDistante]);
            $valores = array_values($valores);
        }

        $media = $this->media($valores);

        return [
            'valores_saneados' => $valores,
            'outliers_removidos' => $outliers,
            'media' => $media,
            'mediana' => $this->mediana($valores),
            'desvio_padrao' => $this->desvioPadrao($valores, $media),
            'cv_percentual' => $this->cvPercentual($valores),
        ];
    }

    /** @param float[] $valores */
    private function media(array $valores): float
    {
        if ($valores === []) {
            return 0.0;
        }

        return array_sum($valores) / count($valores);
    }

    /** @param float[] $valores */
    private function mediana(array $valores): float
    {
        if ($valores === []) {
            return 0.0;
        }

        $ordenados = $valores;
        sort($ordenados);
        $meio = intdiv(count($ordenados), 2);

        if (count($ordenados) % 2 === 0) {
            return ($ordenados[$meio - 1] + $ordenados[$meio]) / 2;
        }

        return $ordenados[$meio];
    }

    /** @param float[] $valores */
    private function desvioPadrao(array $valores, float $media): float
    {
        if (count($valores) < 2) {
            return 0.0;
        }

        $somaQuadrados = array_sum(array_map(static fn (float $v): float => ($v - $media) ** 2, $valores));

        return sqrt($somaQuadrados / (count($valores) - 1));
    }

    /** @param float[] $valores */
    private function cvPercentual(array $valores): float
    {
        $media = $this->media($valores);
        if ($media <= 0.0) {
            return 0.0;
        }

        return ($this->desvioPadrao($valores, $media) / $media) * 100;
    }
}
