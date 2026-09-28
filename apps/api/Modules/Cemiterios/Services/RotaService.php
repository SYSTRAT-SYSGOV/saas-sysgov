<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Support\TenantContext;
use Illuminate\Support\Facades\Cache;
use Modules\Cemiterios\Models\Via;
use Modules\Cemiterios\Support\Geo;

/**
 * Roteirização pedestre portaria→jazigo por grafo local derivado de
 * `cemetery_paths` (ADR-006): vértices são os pontos de cada via, arestas são
 * os trechos consecutivos com custo em metros (projeção equirretangular já
 * usada em `Geo::projetar`/`Geo::dist`), resolvido com Dijkstra simples — o
 * grafo de uma necrópole tem no máximo algumas centenas de vértices.
 */
final readonly class RotaService
{
    private const TTL_GRAFO_SEGUNDOS = 86_400;

    public function __construct(private TenantContext $tenant) {}

    /**
     * @return array{encontrada: bool, distancia_metros: float, rota: array<string, mixed>|null}
     */
    public function calcular(int $parkId, float $origemLat, float $origemLng, float $destinoLat, float $destinoLng): array
    {
        $grafo = $this->grafo($parkId);
        if ($grafo['vertices'] === []) {
            return ['encontrada' => false, 'distancia_metros' => 0, 'rota' => null];
        }

        $origem = [$origemLng, $origemLat];
        $destino = [$destinoLng, $destinoLat];
        $verticeOrigem = $this->maisProximo($origem, $grafo['vertices']);
        $verticeDestino = $this->maisProximo($destino, $grafo['vertices']);

        $caminho = $this->dijkstra($grafo['vertices'], $grafo['arestas'], $verticeOrigem, $verticeDestino);
        if ($caminho === null) {
            return ['encontrada' => false, 'distancia_metros' => 0, 'rota' => null];
        }

        return $this->paraResposta($grafo['vertices'], $grafo['arestas'], $caminho, $origem, $destino);
    }

    /** Invalida o grafo cacheado (chamar ao criar/editar/excluir uma via do parque). */
    public function invalidarGrafo(int $parkId): void
    {
        Cache::forget($this->chaveGrafo($parkId));
    }

    /**
     * @return array{vertices: array<string, array{0: float, 1: float}>, arestas: array<string, list<array{para: string, custo: float, via_codigo: string}>>}
     */
    private function grafo(int $parkId): array
    {
        return Cache::remember($this->chaveGrafo($parkId), self::TTL_GRAFO_SEGUNDOS, function () use ($parkId): array {
            $vertices = [];
            $arestas = [];

            foreach (Via::where('park_id', $parkId)->get() as $via) {
                $pontos = $via->geojson['coordinates'] ?? [];
                for ($i = 0; $i < count($pontos) - 1; $i++) {
                    $a = $this->chaveVertice($pontos[$i]);
                    $b = $this->chaveVertice($pontos[$i + 1]);
                    $vertices[$a] = $pontos[$i];
                    $vertices[$b] = $pontos[$i + 1];

                    // Custo do trecho: projeta os dois pontos num plano métrico local com
                    // referência no primeiro ponto (fica em [0,0]) e mede a distância no outro.
                    $projetado = Geo::projetar([$pontos[$i], $pontos[$i + 1]], $pontos[$i]);
                    $custo = Geo::dist($projetado[0], $projetado[1]);

                    $arestas[$a][] = ['para' => $b, 'custo' => $custo, 'via_codigo' => $via->via_codigo];
                    $arestas[$b][] = ['para' => $a, 'custo' => $custo, 'via_codigo' => $via->via_codigo];
                }
            }

            return ['vertices' => $vertices, 'arestas' => $arestas];
        });
    }

    /** @param array{0: float, 1: float} $ponto [lng, lat] */
    private function chaveVertice(array $ponto): string
    {
        return sprintf('%.7f,%.7f', $ponto[0], $ponto[1]);
    }

    /**
     * @param array{0: float, 1: float} $ponto [lng, lat]
     * @param array<string, array{0: float, 1: float}> $vertices
     */
    private function maisProximo(array $ponto, array $vertices): string
    {
        $projetados = Geo::projetar(array_values($vertices), $ponto);
        $chaves = array_keys($vertices);

        $melhorChave = $chaves[0];
        $melhorDistancia = INF;
        foreach ($projetados as $i => $p) {
            $d = Geo::dist([0.0, 0.0], $p);
            if ($d < $melhorDistancia) {
                $melhorDistancia = $d;
                $melhorChave = $chaves[$i];
            }
        }

        return $melhorChave;
    }

    /**
     * Dijkstra simples (varredura O(V²)) — suficiente para o grafo pequeno de uma necrópole (ADR-006).
     *
     * @param array<string, array{0: float, 1: float}> $vertices
     * @param array<string, list<array{para: string, custo: float, via_codigo: string}>> $arestas
     * @return list<string>|null sequência de chaves de vértice, ou null se não houver caminho
     */
    private function dijkstra(array $vertices, array $arestas, string $origem, string $destino): ?array
    {
        $distancias = array_fill_keys(array_keys($vertices), INF);
        $anteriores = [];
        $visitados = [];
        $distancias[$origem] = 0.0;

        while (true) {
            $atual = null;
            $menor = INF;
            foreach ($distancias as $v => $d) {
                if (!isset($visitados[$v]) && $d < $menor) {
                    $menor = $d;
                    $atual = $v;
                }
            }
            if ($atual === null) {
                break;
            }
            if ($atual === $destino) {
                break;
            }
            $visitados[$atual] = true;

            foreach ($arestas[$atual] ?? [] as $aresta) {
                $novaDistancia = $distancias[$atual] + $aresta['custo'];
                if ($novaDistancia < $distancias[$aresta['para']]) {
                    $distancias[$aresta['para']] = $novaDistancia;
                    $anteriores[$aresta['para']] = $atual;
                }
            }
        }

        if (!is_finite($distancias[$destino])) {
            return null;
        }

        $caminho = [$destino];
        $v = $destino;
        while ($v !== $origem) {
            $v = $anteriores[$v];
            $caminho[] = $v;
        }

        return array_reverse($caminho);
    }

    /**
     * Monta a resposta incluindo os trechos de acesso (origem/destino reais até o vértice do grafo mais
     * próximo), para a rota conectar visualmente e na distância os pontos realmente pedidos, não só os
     * vértices internos do grafo.
     *
     * @param array<string, array{0: float, 1: float}> $vertices
     * @param array<string, list<array{para: string, custo: float, via_codigo: string}>> $arestas
     * @param list<string> $caminho
     * @param array{0: float, 1: float} $origem [lng, lat]
     * @param array{0: float, 1: float} $destino [lng, lat]
     * @return array{encontrada: bool, distancia_metros: float, rota: array<string, mixed>}
     */
    private function paraResposta(array $vertices, array $arestas, array $caminho, array $origem, array $destino): array
    {
        $features = [];
        $distanciaTotal = 0.0;
        $ordem = 1;

        $acesso = function (array $de, array $para) use (&$features, &$distanciaTotal, &$ordem): void {
            $custo = Geo::dist([0.0, 0.0], Geo::projetar([$para], $de)[0]);
            if ($custo < 0.01) {
                return;
            }
            $distanciaTotal += $custo;
            $features[] = [
                'type' => 'Feature',
                'properties' => ['tipo' => 'acesso', 'via_codigo' => null, 'trecho_ordem' => $ordem++],
                'geometry' => ['type' => 'LineString', 'coordinates' => [$de, $para]],
            ];
        };

        $acesso($origem, $vertices[$caminho[0]]);

        for ($i = 0; $i < count($caminho) - 1; $i++) {
            $de = $caminho[$i];
            $para = $caminho[$i + 1];
            $aresta = collect($arestas[$de])->firstWhere('para', $para);
            $distanciaTotal += $aresta['custo'];

            $features[] = [
                'type' => 'Feature',
                'properties' => ['tipo' => 'trecho', 'via_codigo' => $aresta['via_codigo'], 'trecho_ordem' => $ordem++],
                'geometry' => ['type' => 'LineString', 'coordinates' => [$vertices[$de], $vertices[$para]]],
            ];
        }

        $acesso($vertices[$caminho[count($caminho) - 1]], $destino);

        return [
            'encontrada' => true,
            'distancia_metros' => round($distanciaTotal, 2),
            'rota' => ['type' => 'FeatureCollection', 'features' => $features],
        ];
    }

    private function chaveGrafo(int $parkId): string
    {
        return "cemiterios:gis:{$this->tenant->id()}:grafo:{$parkId}";
    }
}
