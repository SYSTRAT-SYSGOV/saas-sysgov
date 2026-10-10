<?php

declare(strict_types=1);

namespace Modules\Campanha\Services\Referencia;

use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Modules\Campanha\Models\Referencia\RefMalha;
use Modules\Campanha\Models\Referencia\RefMunicipio;

/** Municípios e regiões, população estimada e malha geográfica — APIs abertas do IBGE (D4). */
final class ImportadorIbge
{
    /** Municípios da UF com meso/microrregião e regiões intermediária/imediata. */
    public function municipios(string $uf): int
    {
        $lista = $this->json(config('campanha.fontes.ibge_localidades') . '/estados/' . UnidadesFederativas::codigo($uf) . '/municipios');
        $agora = now();
        $linhas = array_map(fn (array $m): array => [
            'codigo_ibge' => (int) $m['id'],
            'uf' => strtoupper($uf),
            'nome' => (string) $m['nome'],
            'nome_normalizado' => RefMunicipio::normalizar((string) $m['nome']),
            'mesorregiao' => $m['microrregiao']['mesorregiao']['nome'] ?? null,
            'microrregiao' => $m['microrregiao']['nome'] ?? null,
            'regiao_intermediaria' => $m['regiao-imediata']['regiao-intermediaria']['nome'] ?? null,
            'regiao_imediata' => $m['regiao-imediata']['nome'] ?? null,
            'created_at' => $agora,
            'updated_at' => $agora,
        ], $lista);
        DB::transaction(fn () => RefMunicipio::query()->upsert($linhas, ['codigo_ibge'], ['uf', 'nome', 'nome_normalizado', 'mesorregiao', 'microrregiao', 'regiao_intermediaria', 'regiao_imediata', 'updated_at']));

        return count($linhas);
    }

    /** População residente estimada (SIDRA 6579, variável 9324, último ano disponível). */
    public function populacao(string $uf): int
    {
        $url = config('campanha.fontes.ibge_sidra') . '/t/6579/n6/in%20n3%20' . UnidadesFederativas::codigo($uf) . '/v/9324/p/last';
        $linhas = array_slice($this->json($url), 1); // a 1ª linha é o dicionário das colunas
        $atualizados = 0;
        DB::transaction(function () use ($linhas, &$atualizados): void {
            foreach ($linhas as $l) {
                if (!ctype_digit((string) ($l['V'] ?? ''))) {
                    continue; // "..." / "-": sem estimativa
                }
                $atualizados += RefMunicipio::query()->whereKey((int) $l['D1C'])->update(['populacao' => (int) $l['V'], 'ano_populacao' => (int) $l['D3N'], 'updated_at' => now()]);
            }
        });

        return $atualizados;
    }

    /** Malha dos municípios da UF (GeoJSON, propriedade `codarea` = código IBGE). */
    public function malha(string $uf): int
    {
        $qualidade = (string) config('campanha.qualidade_malha', 'intermediaria');
        $url = config('campanha.fontes.ibge_malhas') . '/estados/' . UnidadesFederativas::codigo($uf) . '?formato=application/vnd.geo%2Bjson&intrarregiao=municipio&qualidade=' . $qualidade;
        $geo = $this->json($url);
        $feicoes = $geo['features'] ?? [];
        if ($feicoes === []) {
            throw new DomainException('A malha do IBGE veio sem municípios.');
        }
        RefMalha::query()->updateOrCreate(['uf' => strtoupper($uf)], [
            'geojson' => json_encode($geo, JSON_UNESCAPED_UNICODE),
            'qualidade' => $qualidade,
            'fonte' => 'IBGE — API de malhas v3',
        ]);

        return count($feicoes);
    }

    /** @return array<int|string, mixed> */
    private function json(string $url): array
    {
        $resposta = Http::timeout(120)->retry(2, 2000, throw: false)->acceptJson()->get($url);
        if (!$resposta->successful() || !is_array($resposta->json())) {
            throw new DomainException("Falha ao consultar {$url} (HTTP {$resposta->status()}).");
        }

        return $resposta->json();
    }
}
