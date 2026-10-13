<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Support\TenantContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Models\ParcelaMulta;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\Vistoria\Models\ProcessoSancionatorio;

/**
 * Painel de indicadores ambientais — mesma abordagem de
 * `Modules\Vistoria\Services\PainelGerencialService` (período opcional, cache por
 * tenant+período no Redis com TTL de 1h, mapa em GeoJSON).
 */
final class PainelIndicadoresAmbientaisService
{
    private const CACHE_TTL_SEGUNDOS = 3600;

    private const HECTARES_POR_KM2 = 100;

    public function __construct(
        private TenantContext $tenantContext,
    ) {}

    /**
     * @param array{data_inicio?: string, data_fim?: string} $filtros
     *
     * @return array<string, mixed>
     */
    public function obterIndicadores(array $filtros): array
    {
        [$inicio, $fim] = $this->resolverPeriodo($filtros);
        $chave = sprintf('meio_ambiente:painel:indicadores:%d:%s:%s', $this->tenantContext->id(), $inicio->toDateString(), $fim->toDateString());

        return Cache::remember($chave, self::CACHE_TTL_SEGUNDOS, fn (): array => [
            'periodo' => ['data_inicio' => $inicio->toDateString(), 'data_fim' => $fim->toDateString()],
            'licencas_emitidas' => $this->licencasEmitidas($inicio, $fim),
            'multas' => $this->multas($inicio, $fim),
            'queimadas' => $this->queimadas($inicio, $fim),
            'coleta_seletiva' => $this->coletaSeletiva($inicio, $fim),
        ]);
    }

    /**
     * Ocorrências de queimada do período e empreendimentos com licença deferida no
     * período, numa única `FeatureCollection` (propriedade `camada` distingue as duas).
     *
     * @param array{data_inicio?: string, data_fim?: string} $filtros
     *
     * @return array{type: string, features: list<array<string, mixed>>}
     */
    public function mapa(array $filtros): array
    {
        [$inicio, $fim] = $this->resolverPeriodo($filtros);

        $queimadas = OcorrenciaQueimada::query()
            ->whereBetween('data_ocorrencia', [$inicio->toDateString(), $fim->toDateString()])
            ->get()
            ->map(fn (OcorrenciaQueimada $o): array => $this->ponto("queimada-{$o->id}", (float) $o->longitude, (float) $o->latitude, [
                'camada' => 'queimada',
                'data_ocorrencia' => $o->data_ocorrencia->toDateString(),
                'area_queimada_ha' => $o->area_queimada_ha !== null ? (float) $o->area_queimada_ha : null,
                'situacao' => $o->situacao,
            ]));

        $licenciados = ProcessoLicenciamento::query()
            ->where('status', ProcessoLicenciamento::STATUS_DEFERIDO)
            ->whereBetween('data_deferimento', [$inicio->toDateString(), $fim->toDateString()])
            ->with('empreendimento.titular')
            ->get()
            ->filter(fn (ProcessoLicenciamento $p): bool => $p->empreendimento !== null)
            ->map(fn (ProcessoLicenciamento $p): array => $this->ponto("licenca-{$p->id}", (float) $p->empreendimento->longitude, (float) $p->empreendimento->latitude, [
                'camada' => 'licenca',
                'numero' => $p->numero,
                'fase' => $p->fase,
                'empreendimento' => $p->empreendimento->razao_social ?? $p->empreendimento->titular?->nome,
            ]));

        return [
            'type' => 'FeatureCollection',
            'features' => $queimadas->concat($licenciados)->values()->all(),
        ];
    }

    /** @return array{total: int, por_fase: array<string, int>} */
    private function licencasEmitidas(Carbon $inicio, Carbon $fim): array
    {
        $porFase = ProcessoLicenciamento::query()
            ->where('status', ProcessoLicenciamento::STATUS_DEFERIDO)
            ->whereBetween('data_deferimento', [$inicio->toDateString(), $fim->toDateString()])
            ->selectRaw('fase, COUNT(*) as total')
            ->groupBy('fase')
            ->pluck('total', 'fase')
            ->map(fn ($total): int => (int) $total);

        return ['total' => (int) $porFase->sum(), 'por_fase' => $porFase->all()];
    }

    /**
     * Aplicado = penalidade fixada no julgamento (Vistoria) dos processos que nasceram
     * de um auto de infração **ambiental**, julgados no período. Arrecadado = parcelas
     * de multa pagas no período (pagamento à vista é um parcelamento de 1 parcela).
     *
     * @return array{valor_aplicado_centavos: int, valor_arrecadado_centavos: int}
     */
    private function multas(Carbon $inicio, Carbon $fim): array
    {
        $aplicado = (int) ProcessoSancionatorio::query()
            ->whereIn('documento_id', AutoInfracaoAmbiental::query()->select('documento_id'))
            ->whereNotNull('penalidade_centavos')
            ->whereBetween('julgado_em', [$inicio, $fim])
            ->sum('penalidade_centavos');

        $arrecadado = (int) ParcelaMulta::query()
            ->where('pago', true)
            ->whereBetween('pago_em', [$inicio, $fim])
            ->sum('valor_centavos');

        return ['valor_aplicado_centavos' => $aplicado, 'valor_arrecadado_centavos' => $arrecadado];
    }

    /** @return array{area_queimada_km2: float, ocorrencias: int, evolucao_mensal: list<array{mes: string, area_km2: float}>} */
    private function queimadas(Carbon $inicio, Carbon $fim): array
    {
        $ocorrencias = OcorrenciaQueimada::query()
            ->whereBetween('data_ocorrencia', [$inicio->toDateString(), $fim->toDateString()])
            ->get(['data_ocorrencia', 'area_queimada_ha']);

        $paraKm2 = fn (Collection $itens): float => round((float) $itens->sum('area_queimada_ha') / self::HECTARES_POR_KM2, 4);

        return [
            'area_queimada_km2' => $paraKm2($ocorrencias),
            'ocorrencias' => $ocorrencias->count(),
            'evolucao_mensal' => $this->porMes($inicio, $fim, $ocorrencias->groupBy(fn (OcorrenciaQueimada $o): string => $o->data_ocorrencia->format('Y-m'))->map($paraKm2)->all(), 'area_km2'),
        ];
    }

    /** @return array{coleta_seletiva_toneladas: float, evolucao_mensal: list<array{mes: string, toneladas: float}>} */
    private function coletaSeletiva(Carbon $inicio, Carbon $fim): array
    {
        $coletas = ColetaResiduo::query()
            ->where('tipo_coleta', ColetaResiduo::TIPO_COLETA_SELETIVA)
            ->whereBetween('coletada_em', [$inicio->toDateString(), $fim->toDateString()])
            ->get(['coletada_em', 'volume_kg']);

        $paraToneladas = fn (Collection $itens): float => round((float) $itens->sum('volume_kg') / 1000, 3);

        return [
            'coleta_seletiva_toneladas' => $paraToneladas($coletas),
            'evolucao_mensal' => $this->porMes($inicio, $fim, $coletas->groupBy(fn (ColetaResiduo $c): string => $c->coletada_em->format('Y-m'))->map($paraToneladas)->all(), 'toneladas'),
        ];
    }

    /**
     * Série mensal contínua (meses sem registro aparecem com zero, para o gráfico não
     * "pular" meses).
     *
     * @param array<array-key, float> $valoresPorMes chave 'Y-m'
     *
     * @return list<array<string, string|float>>
     */
    private function porMes(Carbon $inicio, Carbon $fim, array $valoresPorMes, string $campo): array
    {
        $serie = [];
        for ($mes = $inicio->copy()->startOfMonth(); $mes->lte($fim); $mes->addMonth()) {
            $chave = $mes->format('Y-m');
            $serie[] = ['mes' => $chave, $campo => $valoresPorMes[$chave] ?? 0.0];
        }

        return $serie;
    }

    /**
     * @param array<string, mixed> $propriedades
     *
     * @return array<string, mixed>
     */
    private function ponto(string $id, float $longitude, float $latitude, array $propriedades): array
    {
        return [
            'type' => 'Feature',
            'id' => $id,
            'geometry' => ['type' => 'Point', 'coordinates' => [$longitude, $latitude]],
            'properties' => $propriedades,
        ];
    }

    /**
     * Sem período informado, o painel mostra o ano corrente até hoje — indicadores
     * ambientais são lidos por exercício (diferente dos 30 dias do painel do Vistoria).
     *
     * @param array{data_inicio?: string, data_fim?: string} $filtros
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolverPeriodo(array $filtros): array
    {
        $fim = isset($filtros['data_fim']) ? Carbon::parse($filtros['data_fim'])->endOfDay() : now()->endOfDay();
        $inicio = isset($filtros['data_inicio'])
            ? Carbon::parse($filtros['data_inicio'])->startOfDay()
            : $fim->copy()->startOfYear();

        return [$inicio, $fim];
    }
}
