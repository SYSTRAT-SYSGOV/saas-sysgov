<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\Proposicao;

final class RelatorioController extends Controller
{
    /** Sem Policy própria pra relatórios agregados (não há um único recurso aqui). */
    private function autorizar(Request $request): void
    {
        if (!$request->user()?->hasPermission('requerimentos.relatorios')) {
            abort(403);
        }
    }

    /**
     * Relatório quantitativo: proposições por tipo, autor, período, área temática e situação.
     */
    public function quantitativo(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $request->validate([
            'tipo_slug'      => ['nullable', 'string'],
            'periodo_inicio' => ['nullable', 'date'],
            'periodo_fim'    => ['nullable', 'date'],
            'area_tematica'  => ['nullable', 'string'],
        ]);

        $query = Proposicao::query();

        if ($tipoSlug = $request->input('tipo_slug')) {
            $query->whereHas('tipoInstrumento', fn ($q) => $q->where('slug', $tipoSlug));
        }

        if ($inicio = $request->input('periodo_inicio')) {
            $query->where('created_at', '>=', $inicio);
        }

        if ($fim = $request->input('periodo_fim')) {
            $query->where('created_at', '<=', $fim . ' 23:59:59');
        }

        if ($area = $request->input('area_tematica')) {
            $query->where('area_tematica', $area);
        }

        // Agregações
        $porTipo = (clone $query)->selectRaw('tipo_instrumento_id, count(*) as total')
            ->groupBy('tipo_instrumento_id')
            ->with('tipoInstrumento:id,nome,slug')
            ->get()
            ->map(fn ($item) => [
                'tipo'  => $item->tipoInstrumento?->nome,
                'slug'  => $item->tipoInstrumento?->slug,
                'total' => $item->total,
            ]);

        $porStatus = (clone $query)->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->get()
            ->pluck('total', 'status');

        $porArea = (clone $query)->selectRaw('area_tematica, count(*) as total')
            ->whereNotNull('area_tematica')
            ->groupBy('area_tematica')
            ->orderByDesc('total')
            ->get();

        $porAutor = (clone $query)->selectRaw('autor_principal_id, count(*) as total')
            ->groupBy('autor_principal_id')
            ->orderByDesc('total')
            ->limit(20)
            ->with('autorPrincipal:id,name')
            ->get()
            ->map(fn ($item) => [
                'autor' => $item->autorPrincipal?->name,
                'total' => $item->total,
            ]);

        return response()->json([
            'total'       => (clone $query)->count(),
            'por_tipo'    => $porTipo,
            'por_status'  => $porStatus,
            'por_area'    => $porArea,
            'por_autor'   => $porAutor,
        ]);
    }

    /**
     * Indicador de tempo médio de tramitação por tipo de instrumento.
     */
    public function tempoMedio(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $request->validate([
            'exercicio' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $exercicio = $request->input('exercicio', (int) date('Y'));

        // DATEDIFF() é específico do MySQL (quebra na suíte padrão, que roda em SQLite) — a
        // diferença de dias é calculada em PHP com os dois `date` já convertidos em Carbon.
        $stats = \Modules\Requerimentos\Models\TramitacaoPoderes::query()
            ->whereHas('proposicao', fn ($q) => $q->doExercicio($exercicio))
            ->whereNotNull('data_recebimento')
            ->whereNotNull('data_encaminhamento')
            ->select(['proposicao_id', 'data_encaminhamento', 'data_recebimento'])
            ->get();

        // Agrupa por tipo via proposição
        $porTipo = [];
        foreach ($stats as $stat) {
            $proposicao = Proposicao::with('tipoInstrumento')->find($stat->proposicao_id);
            if (! $proposicao) {
                continue;
            }

            $slug = $proposicao->tipoInstrumento?->slug ?? 'desconhecido';
            if (! isset($porTipo[$slug])) {
                $porTipo[$slug] = [
                    'tipo'   => $proposicao->tipoInstrumento?->nome ?? $slug,
                    'dias'   => [],
                ];
            }
            $porTipo[$slug]['dias'][] = $stat->data_encaminhamento->diffInDays($stat->data_recebimento);
        }

        $resultado = [];
        foreach ($porTipo as $slug => $data) {
            $dias = $data['dias'];
            sort($dias);
            $count = count($dias);

            if ($count === 0) {
                continue;
            }

            $media = array_sum($dias) / $count;
            $mediana = $count % 2 === 0
                ? ($dias[$count / 2 - 1] + $dias[$count / 2]) / 2
                : $dias[(int) ($count / 2)];

            $somaQuadrados = array_sum(array_map(fn ($d) => ($d - $media) ** 2, $dias));
            $desvioPadrao = $count > 1 ? sqrt($somaQuadrados / ($count - 1)) : 0;

            $resultado[] = [
                'tipo'          => $data['tipo'],
                'slug'          => $slug,
                'total'         => $count,
                'media_dias'    => round($media, 1),
                'mediana_dias'  => $mediana,
                'desvio_padrao' => round($desvioPadrao, 1),
            ];
        }

        return response()->json([
            'exercicio'   => $exercicio,
            'por_tipo'    => $resultado,
        ]);
    }

    /**
     * Indicador de cumprimento de prazos regimentais.
     */
    public function cumprimentoPrazos(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $request->validate([
            'exercicio' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $exercicio = $request->input('exercicio', (int) date('Y'));

        $tramitacoes = \Modules\Requerimentos\Models\TramitacaoPoderes::query()
            ->whereHas('proposicao', fn ($q) => $q->doExercicio($exercicio))
            ->with('proposicao.tipoInstrumento')
            ->get();

        $porTipo = [];

        foreach ($tramitacoes as $t) {
            if (! $t->proposicao?->tipoInstrumento) {
                continue;
            }

            $slug = $t->proposicao->tipoInstrumento->slug;
            if (! isset($porTipo[$slug])) {
                $porTipo[$slug] = [
                    'tipo'      => $t->proposicao->tipoInstrumento->nome,
                    'total'     => 0,
                    'no_prazo'  => 0,
                    'em_alerta' => 0,
                    'vencido'   => 0,
                ];
            }

            $porTipo[$slug]['total']++;

            switch ($t->status) {
                case \Modules\Requerimentos\Models\TramitacaoPoderes::STATUS_RESPONDIDO:
                    $porTipo[$slug]['no_prazo']++;
                    break;
                case \Modules\Requerimentos\Models\TramitacaoPoderes::STATUS_VENCIDO:
                    $porTipo[$slug]['vencido']++;
                    break;
                default:
                    if ($t->data_limite_resposta && $t->data_limite_resposta->isPast()) {
                        $porTipo[$slug]['vencido']++;
                    } elseif ($t->data_limite_resposta && $t->data_limite_resposta->diffInDays(now()) <= 5) {
                        $porTipo[$slug]['em_alerta']++;
                    } else {
                        $porTipo[$slug]['no_prazo']++;
                    }
                    break;
            }
        }

        $resultado = [];
        foreach ($porTipo as $slug => $data) {
            $total = $data['total'];
            $resultado[] = [
                'tipo'                => $data['tipo'],
                'slug'                => $slug,
                'total'               => $total,
                'no_prazo'            => $data['no_prazo'],
                'no_prazo_pct'        => $total > 0 ? round($data['no_prazo'] / $total * 100, 1) : 0,
                'em_alerta'           => $data['em_alerta'],
                'em_alerta_pct'       => $total > 0 ? round($data['em_alerta'] / $total * 100, 1) : 0,
                'vencido'             => $data['vencido'],
                'vencido_pct'         => $total > 0 ? round($data['vencido'] / $total * 100, 1) : 0,
            ];
        }

        return response()->json([
            'exercicio' => $exercicio,
            'por_tipo'  => $resultado,
        ]);
    }
}