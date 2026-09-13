<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;

/**
 * Serviço de Amostragem e Seleção para Auditoria da CAPD (spec §10).
 *
 * Seleciona:
 *   1. 100% das avaliações com notas extremas (NFD < 4.00 ou NFD ≥ 9.50)
 *   2. Amostra aleatória estratificada de 10% das notas medianas (entre 6.00 e 8.50)
 */
final class AuditoriaSamplagemService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Extrai a lista de IDs de avaliações selecionadas para auditoria da comissão.
     *
     * @return array{extremas: array<int>, amostrais: array<int>, total: int}
     */
    public function selecionarAmostra(CicloAvaliacao $ciclo, float $percentualAmostra = 0.10): array
    {
        $tenantId = (int) app(TenantContext::class)->id();

        // 1. Notas extremas: < 4.00 ou >= 9.50 (100% auditadas)
        $extremas = Avaliacao::query()
            ->where('ciclo_id', $ciclo->id)
            ->whereNotNull('data_conclusao')
            ->where(function ($q): void {
                $q->where('nota_final', '<', '4.00')
                  ->orWhere('nota_final', '>=', '9.50');
            })
            ->pluck('id')
            ->toArray();

        // 2. Notas medianas: entre 6.00 e 8.50
        $medianas = Avaliacao::query()
            ->where('ciclo_id', $ciclo->id)
            ->whereNotNull('data_conclusao')
            ->whereBetween('nota_final', ['6.00', '8.50'])
            ->whereNotIn('id', $extremas)
            ->pluck('id')
            ->toArray();

        // Amostragem aleatória simples de $percentualAmostra
        $quantidadeAmostra = (int) ceil(count($medianas) * $percentualAmostra);
        shuffle($medianas);
        $amostrais = array_slice($medianas, 0, $quantidadeAmostra);

        $resultado = [
            'extremas'  => $extremas,
            'amostrais' => $amostrais,
            'total'     => count($extremas) + count($amostrais),
        ];

        $this->audit->record(
            'capd',
            'auditoria.amostra_selecionada',
            "Auditoria Ciclo #{$ciclo->id}: {$resultado['total']} avaliações selecionadas ({count($extremas)} extremas, {count($amostrais)} amostrais)",
            null,
            $resultado,
        );

        return $resultado;
    }
}
