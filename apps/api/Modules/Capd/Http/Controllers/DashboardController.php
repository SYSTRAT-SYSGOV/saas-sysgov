<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\Recurso;

/**
 * Dashboard Executivo e Painel de Business Intelligence (BI) da CAPD.
 *
 * Fornece métricas estatísticas: curva de distribuição de notas, elegibilidade,
 * índice de leniência por avaliador e volumetria recursal.
 */
final class DashboardController extends Controller
{
    public function metricas(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $cicloId  = $request->query('ciclo_id');

        if (! $cicloId) {
            $cicloAtivo = CicloAvaliacao::whereIn('status', [
                CicloAvaliacao::STATUS_EM_AVALIACAO,
                CicloAvaliacao::STATUS_RECURSIVO,
                CicloAvaliacao::STATUS_DELIBERACAO,
                CicloAvaliacao::STATUS_HOMOLOGADO,
            ])->latest()->first();

            $cicloId = $cicloAtivo?->id;
        }

        if (! $cicloId) {
            return response()->json([
                'message' => 'Nenhum ciclo cadastrado no tenant.',
                'metricas' => null,
            ]);
        }

        $ciclo = CicloAvaliacao::findOrFail($cicloId);

        // 1. Visão Geral das Avaliações
        $totalAvaliacoes = Avaliacao::where('ciclo_id', $ciclo->id)->count();
        $concluidas      = Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->count();
        $elegiveis       = Avaliacao::where('ciclo_id', $ciclo->id)->where('elegivel_progressao', true)->count();
        $homologadas     = Avaliacao::where('ciclo_id', $ciclo->id)->where('homologada', true)->count();

        // 2. Histograma de Distribuição das Notas (Faixas de Desempenho)
        $faixas = [
            '0_a_3.99' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->where('nota_final', '<', '4.00')->count(),
            '4_a_6.99' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->whereBetween('nota_final', ['4.00', '6.99'])->count(),
            '7_a_8.49' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->whereBetween('nota_final', ['7.00', '8.49'])->count(),
            '8.5_a_10' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->where('nota_final', '>=', '8.50')->count(),
        ];

        // Média Geral das Notas Concluídas
        $mediaGeral = (string) (Avaliacao::where('ciclo_id', $ciclo->id)
            ->whereNotNull('data_conclusao')
            ->avg('nota_final') ?? '0.00');

        // 3. Volumetria do Diário de Bordo (CIT)
        $totalCit          = DiarioBordo::where('ciclo_id', $ciclo->id)->count();
        $citPositivos      = DiarioBordo::where('ciclo_id', $ciclo->id)->where('tipo', 'positivo')->count();
        $citNegativos      = DiarioBordo::where('ciclo_id', $ciclo->id)->where('tipo', 'negativo')->count();
        $citComEvidencia   = DiarioBordo::where('ciclo_id', $ciclo->id)->comEvidencia()->count();

        // 4. Volumetria de Recursos
        $recursosTotal      = Recurso::whereHas('avaliacao', fn ($q) => $q->where('ciclo_id', $ciclo->id))->count();
        $recursosProvidos   = Recurso::whereHas('avaliacao', fn ($q) => $q->where('ciclo_id', $ciclo->id))->where('status', 'julgado_provido')->count();
        $recursosDesprovidos= Recurso::whereHas('avaliacao', fn ($q) => $q->where('ciclo_id', $ciclo->id))->where('status', 'julgado_desprovido')->count();
        $recursosPendentes  = Recurso::whereHas('avaliacao', fn ($q) => $q->where('ciclo_id', $ciclo->id))->whereIn('status', ['interposto', 'em_instrucao', 'pautado'])->count();

        // 5. Índice de Leniência por Avaliador (Avaliadores com média significativamente superior à média geral)
        $rankingAvaliadores = Avaliacao::where('ciclo_id', $ciclo->id)
            ->whereNotNull('data_conclusao')
            ->select('avaliador_id', DB::raw('count(*) as total_avaliados'), DB::raw('round(avg(nota_final), 2) as media_atribuida'))
            ->groupBy('avaliador_id')
            ->orderByDesc('media_atribuida')
            ->limit(10)
            ->get();

        return response()->json([
            'ciclo' => [
                'id'             => $ciclo->id,
                'nome'           => $ciclo->nome,
                'ano_referencia' => $ciclo->ano_referencia,
                'status'         => $ciclo->status,
            ],
            'avaliacoes' => [
                'total'           => $totalAvaliacoes,
                'concluidas'      => $concluidas,
                'pendentes'       => $totalAvaliacoes - $concluidas,
                'elegiveis'       => $elegiveis,
                'homologadas'     => $homologadas,
                'taxa_conclusao'  => $totalAvaliacoes > 0 ? round(($concluidas / $totalAvaliacoes) * 100, 1) : 0,
                'taxa_elegivel'   => $concluidas > 0 ? round(($elegiveis / $concluidas) * 100, 1) : 0,
                'media_nfd'       => number_format((float) $mediaGeral, 2, '.', ''),
                'distribuicao'    => $faixas,
            ],
            'diario_bordo_cit' => [
                'total'         => $totalCit,
                'positivos'     => $citPositivos,
                'negativos'     => $citNegativos,
                'com_evidencia' => $citComEvidencia,
            ],
            'recursos' => [
                'total'       => $recursosTotal,
                'providos'    => $recursosProvidos,
                'desprovidos' => $recursosDesprovidos,
                'pendentes'   => $recursosPendentes,
            ],
            'ranking_avaliadores' => $rankingAvaliadores,
        ]);
    }
}
