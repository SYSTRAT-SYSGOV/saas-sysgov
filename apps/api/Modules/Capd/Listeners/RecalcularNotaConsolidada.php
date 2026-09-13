<?php

declare(strict_types=1);

namespace Modules\Capd\Listeners;

use Modules\Capd\Events\AvaliacaoHomologada;
use Modules\Capd\Models\Avaliacao;

/**
 * Quando todas as avaliações parciais de uma transferência de unidade
 * estiverem homologadas, calcula a nota final da consolidada como média
 * ponderada por dias de exercício e a homologa.
 */
final class RecalcularNotaConsolidada
{
    public function handle(AvaliacaoHomologada $event): void
    {
        $parcial = $event->avaliacao;

        if ($parcial->tipo_avaliacao !== Avaliacao::TIPO_PARCIAL || $parcial->avaliacao_consolidada_id === null) {
            return;
        }

        $consolidada = Avaliacao::find($parcial->avaliacao_consolidada_id);

        if ($consolidada === null || $consolidada->homologada) {
            return;
        }

        $parciais = $consolidada->parciais;

        if ($parciais->contains(fn (Avaliacao $p) => ! $p->homologada)) {
            return;
        }

        $totalDias = (int) $parciais->sum('dias_exercicio');

        $somaPonderada = $parciais->reduce(
            fn (float $carry, Avaliacao $p) => $carry + ((float) $p->nota_final * (int) $p->dias_exercicio),
            0.0
        );

        $notaPonderada = $totalDias > 0 ? $somaPonderada / $totalDias : 0.0;

        $consolidada->update([
            'nota_final'     => number_format($notaPonderada, 2, '.', ''),
            'homologada'     => true,
            'homologada_em'  => now(),
        ]);
    }
}
