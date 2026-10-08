<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Support\TenantContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Models\Reinspecao;

final class PainelGerencialService
{
    /** Quando nenhum período é informado, o painel mostra os últimos 30 dias (simplificação — sem período "padrão" configurável por tenant). */
    private const PERIODO_PADRAO_DIAS = 30;

    private const CACHE_TTL_SEGUNDOS = 3600;

    public function __construct(
        private TenantContext $tenantContext,
    ) {}

    /**
     * Vistorias pendentes e realizadas georreferenciadas no período, no formato GeoJSON
     * `FeatureCollection` (mesmo padrão já usado pelo `GisService` do módulo Cemitérios),
     * uma feature por ordem de serviço com coordenadas do local fiscalizado.
     *
     * @param array{data_inicio?: string, data_fim?: string} $filtros
     *
     * @return array{type: string, features: list<array<string, mixed>>}
     */
    public function mapa(array $filtros): array
    {
        [$inicio, $fim] = $this->resolverPeriodo($filtros);

        $ordens = OrdemServico::with('local')
            ->whereDate('data_prevista', '>=', $inicio->toDateString())
            ->whereDate('data_prevista', '<=', $fim->toDateString())
            ->where('status', '!=', OrdemServico::STATUS_CANCELADA)
            ->get()
            ->filter(fn (OrdemServico $ordem): bool => $ordem->local !== null);

        return [
            'type' => 'FeatureCollection',
            'features' => $ordens->map(fn (OrdemServico $ordem): array => [
                'type' => 'Feature',
                'id' => "ordem-{$ordem->id}",
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [(float) $ordem->local->longitude, (float) $ordem->local->latitude],
                ],
                'properties' => [
                    'ordem_servico_id' => $ordem->id,
                    'local_nome' => $ordem->local->nome,
                    'tipo_acao' => $ordem->tipo_acao,
                    'status' => $ordem->status,
                    'situacao' => $ordem->status === OrdemServico::STATUS_CONCLUIDA ? 'realizada' : 'pendente',
                    'data_prevista' => $ordem->data_prevista->toDateString(),
                ],
            ])->values()->all(),
        ];
    }

    /**
     * Contagem de vistorias concluídas (execuções sincronizadas) por fiscal no período.
     *
     * @param array{data_inicio?: string, data_fim?: string} $filtros
     *
     * @return array{periodo: array{data_inicio: string, data_fim: string}, fiscais: list<array{fiscal_id: int, fiscal_nome: string|null, total_concluidas: int}>}
     */
    public function produtividade(array $filtros): array
    {
        [$inicio, $fim] = $this->resolverPeriodo($filtros);

        $fiscais = ExecucaoVistoria::query()
            ->where('status', ExecucaoVistoria::STATUS_SINCRONIZADA)
            ->whereBetween('sincronizado_em', [$inicio, $fim])
            ->selectRaw('fiscal_id, COUNT(*) as total_concluidas')
            ->groupBy('fiscal_id')
            ->with('fiscal')
            ->get()
            ->map(fn (ExecucaoVistoria $linha): array => [
                'fiscal_id' => $linha->fiscal_id,
                'fiscal_nome' => $linha->fiscal?->name,
                'total_concluidas' => (int) $linha->getAttribute('total_concluidas'),
            ])
            ->sortByDesc('total_concluidas')
            ->values();

        return [
            'periodo' => ['data_inicio' => $inicio->toDateString(), 'data_fim' => $fim->toDateString()],
            'fiscais' => $fiscais->all(),
        ];
    }

    /**
     * Autuações por tipo no período, taxa de regularização (reinspeções com regularização
     * constatada) e tempo médio entre a vistoria (execução sincronizada) e a conclusão do
     * processo sancionatório decorrente — cacheado no Redis por 1h (chave por
     * tenant+período, já que o cálculo cruza várias tabelas).
     *
     * @param array{data_inicio?: string, data_fim?: string} $filtros
     *
     * @return array{periodo: array{data_inicio: string, data_fim: string}, autuacoes_por_tipo: array<string, int>, taxa_regularizacao: float|null, tempo_medio_dias_vistoria_ate_conclusao_processo: float|null}
     */
    public function indicadores(array $filtros): array
    {
        [$inicio, $fim] = $this->resolverPeriodo($filtros);
        $chave = sprintf('vistoria:painel:indicadores:%d:%s:%s', $this->tenantContext->id(), $inicio->toDateString(), $fim->toDateString());

        return Cache::remember($chave, self::CACHE_TTL_SEGUNDOS, function () use ($inicio, $fim): array {
            $autuacoesPorTipo = Documento::query()
                ->whereBetween('created_at', [$inicio, $fim])
                ->selectRaw('tipo, COUNT(*) as total')
                ->groupBy('tipo')
                ->pluck('total', 'tipo');

            $reinspecoesConstatadas = Reinspecao::query()
                ->whereBetween('constatada_em', [$inicio, $fim])
                ->whereIn('status', [Reinspecao::STATUS_REGULARIZADO, Reinspecao::STATUS_NAO_REGULARIZADO])
                ->get();
            $totalConstatadas = $reinspecoesConstatadas->count();
            $totalRegularizadas = $reinspecoesConstatadas->where('status', Reinspecao::STATUS_REGULARIZADO)->count();
            $taxaRegularizacao = $totalConstatadas > 0 ? round($totalRegularizadas / $totalConstatadas, 4) : null;

            // "Conclusão" inclui tanto o processo concluído (recurso julgado/revelia de
            // recurso) quanto o arquivado (julgamento improcedente) — ambos são estados
            // terminais; o arquivado não tem concluido_em, por isso o fallback pro julgado_em.
            $processosConcluidos = ProcessoSancionatorio::query()
                ->whereIn('status', [ProcessoSancionatorio::STATUS_CONCLUIDO, ProcessoSancionatorio::STATUS_ARQUIVADO])
                ->with('documento.execucao')
                ->get()
                ->filter(function (ProcessoSancionatorio $processo) use ($inicio, $fim): bool {
                    $fimProcesso = $processo->concluido_em ?? $processo->julgado_em;

                    return $fimProcesso !== null && $fimProcesso->between($inicio, $fim);
                });

            $tempoMedioDias = $processosConcluidos->isEmpty() ? null : round(
                $processosConcluidos->avg(function (ProcessoSancionatorio $processo): float {
                    $inicioVistoria = $processo->documento->execucao->sincronizado_em;
                    $fimProcesso = $processo->concluido_em ?? $processo->julgado_em;

                    return (float) $inicioVistoria->diffInDays($fimProcesso);
                }),
                1,
            );

            return [
                'periodo' => ['data_inicio' => $inicio->toDateString(), 'data_fim' => $fim->toDateString()],
                'autuacoes_por_tipo' => $autuacoesPorTipo->all(),
                'taxa_regularizacao' => $taxaRegularizacao,
                'tempo_medio_dias_vistoria_ate_conclusao_processo' => $tempoMedioDias,
            ];
        });
    }

    /**
     * @param array{data_inicio?: string, data_fim?: string} $filtros
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolverPeriodo(array $filtros): array
    {
        $fim = isset($filtros['data_fim']) ? Carbon::parse($filtros['data_fim'])->endOfDay() : now()->endOfDay();
        $inicio = isset($filtros['data_inicio'])
            ? Carbon::parse($filtros['data_inicio'])->startOfDay()
            : $fim->copy()->subDays(self::PERIODO_PADRAO_DIAS - 1)->startOfDay();

        return [$inicio, $fim];
    }
}
