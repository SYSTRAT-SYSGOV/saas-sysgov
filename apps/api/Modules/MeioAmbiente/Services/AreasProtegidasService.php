<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Support\RegraNegocioException;

/**
 * Cadastro de áreas protegidas (APP, reserva legal, unidade de conservação) e
 * verificação de sobreposição com empreendimentos — ver spec
 * `meio-ambiente/areas-protegidas` e design.md (decisões D6/D7).
 *
 * `Empreendimento` só guarda um ponto (latitude/longitude), não um polígono de
 * território próprio (ver design.md D2) — por isso a "sobreposição" verificada
 * aqui é um teste de ponto-dentro-do-polígono (o ponto do empreendimento contido
 * na geometria da área protegida), não interseção polígono-polígono.
 */
final readonly class AreasProtegidasService
{
    /** @param array{tipo: string, subtipo?: string|null, geometria: array<string, mixed>, ato_legal?: string|null} $dados */
    public function cadastrarAreaProtegida(array $dados): AreaProtegida
    {
        $this->garantirGeometriaValida($dados['geometria']);

        return AreaProtegida::create($dados);
    }

    /** @return list<AreaProtegida> áreas protegidas cujo polígono contém o ponto do empreendimento */
    public function verificarSobreposicao(Empreendimento $empreendimento): array
    {
        $ponto = [(float) $empreendimento->longitude, (float) $empreendimento->latitude];

        return AreaProtegida::query()
            ->get()
            ->filter(fn (AreaProtegida $area): bool => $this->pontoDentroDaGeometria($ponto, $area->geometria))
            ->values()
            ->all();
    }

    /**
     * @param array{tipo?: string} $filtros
     * @return array<int, array<string, mixed>>
     */
    public function listarParaMapa(array $filtros = []): array
    {
        return AreaProtegida::query()
            ->when($filtros['tipo'] ?? null, fn ($query, string $tipo) => $query->where('tipo', $tipo))
            ->get()
            ->map(fn (AreaProtegida $area): array => [
                'type' => 'Feature',
                'geometry' => $area->geometria,
                'properties' => [
                    'id' => $area->id,
                    'tipo' => $area->tipo,
                    'subtipo' => $area->subtipo,
                    'ato_legal' => $area->ato_legal,
                ],
            ])
            ->values()
            ->all();
    }

    /** @param array<string, mixed> $geometria */
    private function garantirGeometriaValida(array $geometria): void
    {
        $tipo = $geometria['type'] ?? null;
        $coordenadas = $geometria['coordinates'] ?? null;

        if (! in_array($tipo, ['Polygon', 'MultiPolygon'], true) || ! is_array($coordenadas)) {
            throw new RegraNegocioException('geometria_invalida', 'Geometria da área protegida inválida.');
        }

        $aneisExternos = $tipo === 'Polygon' ? [$coordenadas[0] ?? null] : array_map(fn ($poligono) => $poligono[0] ?? null, $coordenadas);

        foreach ($aneisExternos as $anel) {
            if (! is_array($anel) || count($anel) < 4) {
                throw new RegraNegocioException('geometria_invalida', 'Geometria da área protegida inválida.');
            }
        }
    }

    /**
     * @param array{0: float, 1: float} $ponto [longitude, latitude]
     * @param array<string, mixed> $geometria
     */
    private function pontoDentroDaGeometria(array $ponto, array $geometria): bool
    {
        $aneisExternos = $geometria['type'] === 'Polygon'
            ? [$geometria['coordinates'][0] ?? []]
            : array_map(fn ($poligono) => $poligono[0] ?? [], $geometria['coordinates'] ?? []);

        foreach ($aneisExternos as $anel) {
            if (is_array($anel) && $this->pontoDentroDoAnel($ponto, $anel)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Ray casting — padrão para teste ponto-em-polígono, sem dependência de
     * extensão nativa (ver design.md D6/D7).
     *
     * @param array{0: float, 1: float} $ponto
     * @param array<int, array{0: float, 1: float}> $anel
     */
    private function pontoDentroDoAnel(array $ponto, array $anel): bool
    {
        [$lng, $lat] = $ponto;
        $dentro = false;
        $n = count($anel);

        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            [$lngI, $latI] = $anel[$i];
            [$lngJ, $latJ] = $anel[$j];

            if ((($latI > $lat) !== ($latJ > $lat))
                && ($lng < ($lngJ - $lngI) * ($lat - $latI) / ($latJ - $latI) + $lngI)
            ) {
                $dentro = ! $dentro;
            }
        }

        return $dentro;
    }
}
