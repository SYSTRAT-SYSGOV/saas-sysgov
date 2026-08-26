<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoPreco;

final class MapaPrecosService
{
    public function processarMapa(Licitacao $licitacao): void
    {
        $precos = LicitacaoPreco::where('licitacao_id', $licitacao->id)->get();
        if ($precos->count() < 3) return;

        $media = $precos->avg('valor_cents');
        $limiteInferior = $media * 0.75; // -25%
        $limiteSuperior = $media * 1.25; // +25%

        $precos->each(function (LicitacaoPreco $preco) use ($limiteInferior, $limiteSuperior) {
            if ($preco->valor_cents < $limiteInferior || $preco->valor_cents > $limiteSuperior) {
                $preco->update(['status' => 'outlier', 'motivo_outlier' => 'Discrepância > 25%']);
            } else {
                $preco->update(['status' => 'valida', 'motivo_outlier' => null]);
            }
        });
    }
}
