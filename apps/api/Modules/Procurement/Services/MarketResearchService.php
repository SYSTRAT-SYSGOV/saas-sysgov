<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoPreco;

final class MarketResearchService
{
    /**
     * Recalcula estatísticas da pesquisa de preços e expurga outliers > 25% da média (RN-004)
     *
     * @return array{
     *   total_sources: int,
     *   valid_sources_count: int,
     *   outliers_count: int,
     *   media_cents: int,
     *   mediana_cents: int,
     *   menor_valor_cents: int,
     *   maior_valor_cents: int,
     *   threshold_cents: int,
     *   is_valid: bool
     * }
     */
    public function recalculateMarketPrices(Licitacao $licitacao): array
    {
        $prices = LicitacaoPreco::query()
            ->where('licitacao_id', $licitacao->id)
            ->get();

        if ($prices->isEmpty()) {
            return [
                'total_sources' => 0,
                'valid_sources_count' => 0,
                'outliers_count' => 0,
                'media_cents' => 0,
                'mediana_cents' => 0,
                'menor_valor_cents' => 0,
                'maior_valor_cents' => 0,
                'threshold_cents' => 0,
                'is_valid' => false,
            ];
        }

        // 1ª Rodada: Mediana como âncora estatística robusta (imune a distorções de valores extremos)
        $allValues = $prices->pluck('valor_cents')->map(fn ($v) => (int) $v)->sort()->values()->all();
        $totalCount = count($allValues);
        $mid = (int) floor($totalCount / 2);
        $anchorValue = ($totalCount % 2 === 0)
            ? (int) (($allValues[$mid - 1] + $allValues[$mid]) / 2)
            : $allValues[$mid];

        $thresholdPercentage = (float) config('procurement.market_research.outlier_threshold_percentage', 25.0);
        $maxAllowed = (int) ($anchorValue * (1 + ($thresholdPercentage / 100)));
        $minAllowed = (int) ($anchorValue * (1 - ($thresholdPercentage / 100)));

        // 2ª Rodada: Detecção e marcação de outliers
        $validValues = [];
        $outliersCount = 0;

        foreach ($prices as $price) {
            $val = (int) $price->valor_cents;
            $isOutlier = ($val > $maxAllowed) || ($val < $minAllowed);

            if ($isOutlier) {
                $outliersCount++;
                $diffPercent = round(abs(($val - $anchorValue) / $anchorValue) * 100, 1);
                $price->update([
                    'status' => 'outlier',
                    'motivo_outlier' => "Discrepância estatística de {$diffPercent}% em relação à mediana de mercado (Limite: {$thresholdPercentage}%)",
                ]);
            } else {
                $validValues[] = $val;
                $price->update([
                    'status' => 'valida',
                    'motivo_outlier' => null,
                ]);
            }
        }

        // 3ª Rodada: Estatísticas consolidadas apenas com fontes válidas (expurgo aplicado)
        if (empty($validValues)) {
            $validValues = $allValues; // Fallback se todos fossem marcados
        }

        sort($validValues);
        $validCount = count($validValues);
        $finalAverage = (int) (array_sum($validValues) / $validCount);
        $minVal = $validValues[0];
        $maxVal = $validValues[$validCount - 1];

        // Cálculo da mediana
        $middle = (int) floor($validCount / 2);
        if ($validCount % 2 === 0) {
            $median = (int) (($validValues[$middle - 1] + $validValues[$middle]) / 2);
        } else {
            $median = $validValues[$middle];
        }

        // Atualizar valor estimado da licitação com a média saneada
        $licitacao->update(['valor_estimado_cents' => $finalAverage]);

        return [
            'total_sources' => count($allValues),
            'valid_sources_count' => $validCount,
            'outliers_count' => $outliersCount,
            'media_cents' => $finalAverage,
            'mediana_cents' => $median,
            'menor_valor_cents' => $minVal,
            'maior_valor_cents' => $maxVal,
            'threshold_cents' => $maxAllowed,
            'is_valid' => $validCount >= (int) config('procurement.market_research.min_sources', 3),
        ];
    }
}
