<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Coordenador;
use Modules\Campanha\Models\Vereador;
use Modules\Campanha\Support\CampanhaContext;

/** Dados do mapa (uma chamada para as três camadas — D6) e indicadores do painel. */
final class PainelService
{
    public function __construct(
        private readonly MunicipioService $municipios,
        private readonly CampanhaContext $campanha,
    ) {}

    /** @return array<int, array<string, mixed>> por código IBGE */
    public function mapa(): array
    {
        $mapa = [];
        foreach ($this->municipios->linhas() as $l) {
            $mapa[$l['codigo_ibge']] = [
                'nome' => $l['nome'],
                'situacao' => $l['situacao'],
                'meta_votos' => $l['meta_votos'],
                'coordenador' => $l['coordenador']['nome'] ?? null,
                'prefeito' => $l['prefeito']['nome'],
                'partido_prefeito' => $l['prefeito']['partido'],
                'vice' => $l['prefeito']['vice'],
                'relacao_prefeito' => $l['prefeito']['relacao'],
                'cabos' => $l['cabos'],
                'eleitores' => $l['eleitores'],
            ];
        }

        return $mapa;
    }

    /** @return array<string, mixed> */
    public function painel(): array
    {
        $linhas = $this->municipios->linhas();
        $porSituacao = array_fill_keys(Campanha::SITUACOES, 0);
        foreach ($linhas as $l) {
            $porSituacao[$l['situacao']]++;
        }

        return [
            'municipios' => $linhas->count(),
            'por_situacao' => $porSituacao,
            'coordenadores' => Coordenador::query()->count(),
            'cabos_eleitorais' => CaboEleitoral::query()->count(),
            'prefeitos_aliados' => $linhas->where('prefeito.relacao', 'aliado')->count(),
            'vereadores_aliados' => Vereador::query()->where('aliado', true)->count(),
            'meta_total' => $linhas->sum('meta_votos'),
            'meta_global' => $this->campanha->get()->meta_votos_global,
            'eleitores' => $linhas->sum('eleitores'),
            'por_regiao' => $linhas->groupBy('regiao_intermediaria')->map(fn ($grupo, $regiao): array => [
                'regiao' => (string) $regiao,
                'municipios' => $grupo->count(),
                'meta_votos' => $grupo->sum('meta_votos'),
                'eleitores' => $grupo->sum('eleitores'),
                'consolidados' => $grupo->where('situacao', 'consolidado')->count(),
            ])->sortBy('regiao')->values(),
        ];
    }
}
