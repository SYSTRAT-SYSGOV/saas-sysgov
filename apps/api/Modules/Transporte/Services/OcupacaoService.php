<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Models\Rota;

/** Ocupação = alocações ativas ÷ capacidade do veículo (design D23). Verde até 80 %, amarelo até 100 %, vermelho acima. */
final class OcupacaoService
{
    /** @return array{alocados: int, capacidade: int|null, percentual: float|null, faixa: string|null, calculavel: bool} */
    public static function calcular(int $alocados, ?int $capacidade): array
    {
        if ($capacidade === null || $capacidade <= 0) {
            return ['alocados' => $alocados, 'capacidade' => null, 'percentual' => null, 'faixa' => null, 'calculavel' => false];
        }
        $faixa = match (true) {
            $alocados * 100 <= 80 * $capacidade => 'verde',
            $alocados <= $capacidade => 'amarelo',
            default => 'vermelho',
        };

        return ['alocados' => $alocados, 'capacidade' => $capacidade, 'percentual' => round($alocados * 100 / $capacidade, 1), 'faixa' => $faixa, 'calculavel' => true];
    }

    /** @return array{alocados: int, capacidade: int|null, percentual: float|null, faixa: string|null, calculavel: bool} */
    public function daRota(Rota $rota): array
    {
        $alocados = (int) Alocacao::query()->where('rota_id', $rota->id)->whereNull('data_fim')->count();

        return self::calcular($alocados, $rota->veiculo?->capacidade);
    }
}
