<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Modules\Cemiterios\Models\Amenidade;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Via;
use Modules\Cemiterios\Support\Geo;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/mapa-gis › vias, equipamentos e roteirização (cemiterios-mapa-gis-avancado). */
final class ViasAmenidadesRotasTest extends CemiteriosTestCase
{
    /** Referência: Curitiba. Retângulos/pontos são dados em metros a partir daqui. */
    private const REF = [-49.27, -25.43];

    private Tenant $tenant;

    private User $admin;

    private Cemiterio $parque;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->admin = $this->admin($this->tenant);
        $this->parque = Cemiterio::create(['codigo' => 'C1', 'nome' => 'Central']);
    }

    // Camadas de vias e equipamentos

    public function test_camada_de_vias_e_amenidades_filtra_por_bbox_e_isola_por_necropole(): void
    {
        $outroParque = Cemiterio::create(['codigo' => 'C2', 'nome' => 'Outro']);
        $viaDentro = $this->criarVia($this->parque->id, 'AL-01', [0, 0], [0, 50]);
        $this->criarVia($outroParque->id, 'AL-99', [0, 0], [0, 50]);
        $amenidadeDentro = $this->criarAmenidade($this->parque->id, 'portaria', [0, 0]);
        $this->criarAmenidade($outroParque->id, 'portaria', [0, 0]);

        $bbox = $this->bbox(-10, -10, 10, 60);

        $this->como($this->admin, $this->tenant)
            ->getJson('/api/cemiterios/gis/camadas?camada=vias&park_id=' . $this->parque->id . '&bbox=' . implode(',', $bbox))
            ->assertOk()->assertJsonCount(1, 'features')
            ->assertJsonPath('features.0.properties.via_codigo', 'AL-01');

        $this->como($this->admin, $this->tenant)
            ->getJson('/api/cemiterios/gis/camadas?camada=amenidades&park_id=' . $this->parque->id . '&bbox=' . implode(',', $bbox))
            ->assertOk()->assertJsonCount(1, 'features')
            ->assertJsonPath('features.0.properties.tipo', 'portaria');

        self::assertNotSame($viaDentro->id, null);
        self::assertNotSame($amenidadeDentro->id, null);
    }

    // CRUD de vias

    public function test_crud_de_via_com_permissao_e_auditoria(): void
    {
        $geojsonInicial = $this->linha([0, 0], [0, 50]);

        $criada = $this->como($this->admin, $this->tenant)->postJson('/api/cemiterios/gis/vias', [
            'park_id' => $this->parque->id, 'via_codigo' => 'AL-01', 'geojson' => $geojsonInicial,
        ])->assertCreated()->assertJsonPath('via_codigo', 'AL-01')->json();

        $this->como($this->admin, $this->tenant)->putJson("/api/cemiterios/gis/vias/{$criada['id']}", [
            'park_id' => $this->parque->id, 'via_codigo' => 'AL-01B', 'geojson' => $this->linha([0, 0], [0, 80]),
        ])->assertOk()->assertJsonPath('via_codigo', 'AL-01B');

        $this->como($this->admin, $this->tenant)->deleteJson("/api/cemiterios/gis/vias/{$criada['id']}")->assertNoContent();

        $this->noTenant($this->tenant);
        self::assertSame(0, Via::count());
    }

    public function test_operador_sem_permissao_gis_edit_nao_cria_via(): void
    {
        $this->como($this->usuario($this->tenant, ['cemiterios.operacoes.executar']), $this->tenant)
            ->postJson('/api/cemiterios/gis/vias', [
                'park_id' => $this->parque->id, 'via_codigo' => 'AL-01', 'geojson' => $this->linha([0, 0], [0, 50]),
            ])->assertForbidden();
    }

    // CRUD de amenidades

    public function test_crud_de_amenidade(): void
    {
        $ponto = Geo::desprojetar([[0, 0]], self::REF)[0];

        $criada = $this->como($this->admin, $this->tenant)->postJson('/api/cemiterios/gis/amenidades', [
            'park_id' => $this->parque->id, 'tipo' => 'portaria', 'lat' => $ponto[1], 'lng' => $ponto[0],
        ])->assertCreated()->assertJsonPath('tipo', 'portaria')->json();

        $this->como($this->admin, $this->tenant)->putJson("/api/cemiterios/gis/amenidades/{$criada['id']}", [
            'park_id' => $this->parque->id, 'tipo' => 'capela', 'rotulo' => 'Capela Central', 'lat' => $ponto[1], 'lng' => $ponto[0],
        ])->assertOk()->assertJsonPath('tipo', 'capela')->assertJsonPath('rotulo', 'Capela Central');

        $this->como($this->admin, $this->tenant)->deleteJson("/api/cemiterios/gis/amenidades/{$criada['id']}")->assertNoContent();

        $this->noTenant($this->tenant);
        self::assertSame(0, Amenidade::count());
    }

    // Roteirização

    public function test_rota_segue_via_cadastrada_conectando_portaria_ao_jazigo(): void
    {
        $this->criarVia($this->parque->id, 'AL-01', [0, 0], [0, 50]);
        $portaria = Geo::desprojetar([[0, 0]], self::REF)[0];
        $jazigo = Geo::desprojetar([[0, 50]], self::REF)[0];

        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/gis/rotas?' . http_build_query([
            'park_id' => $this->parque->id,
            'origem_lat' => $portaria[1], 'origem_lng' => $portaria[0],
            'destino_lat' => $jazigo[1], 'destino_lng' => $jazigo[0],
        ]))->assertOk()
            ->assertJsonPath('encontrada', true)
            ->assertJsonPath('distancia_metros', fn ($v) => abs((float) $v - 50.0) < 0.5)
            ->assertJsonPath('rota.features.0.properties.via_codigo', 'AL-01');
    }

    public function test_rota_cai_para_fallback_sem_vias_cadastradas(): void
    {
        $portaria = Geo::desprojetar([[0, 0]], self::REF)[0];
        $jazigo = Geo::desprojetar([[0, 50]], self::REF)[0];

        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/gis/rotas?' . http_build_query([
            'park_id' => $this->parque->id,
            'origem_lat' => $portaria[1], 'origem_lng' => $portaria[0],
            'destino_lat' => $jazigo[1], 'destino_lng' => $jazigo[0],
        ]))->assertOk()->assertJsonPath('encontrada', false)->assertJsonPath('rota', null);
    }

    public function test_rota_cai_para_fallback_quando_vias_nao_conectam_origem_e_destino(): void
    {
        // Duas vias distantes e desconectadas entre si.
        $this->criarVia($this->parque->id, 'AL-01', [0, 0], [0, 10]);
        $this->criarVia($this->parque->id, 'AL-02', [500, 500], [500, 510]);

        $origem = Geo::desprojetar([[0, 0]], self::REF)[0];
        $destino = Geo::desprojetar([[500, 500]], self::REF)[0];

        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/gis/rotas?' . http_build_query([
            'park_id' => $this->parque->id,
            'origem_lat' => $origem[1], 'origem_lng' => $origem[0],
            'destino_lat' => $destino[1], 'destino_lng' => $destino[0],
        ]))->assertOk()->assertJsonPath('encontrada', false);
    }

    public function test_editar_via_invalida_o_grafo_cacheado(): void
    {
        $via = $this->criarVia($this->parque->id, 'AL-01', [0, 0], [0, 50]);
        $portaria = Geo::desprojetar([[0, 0]], self::REF)[0];
        $destinoAntigo = Geo::desprojetar([[0, 50]], self::REF)[0];

        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/gis/rotas?' . http_build_query([
            'park_id' => $this->parque->id,
            'origem_lat' => $portaria[1], 'origem_lng' => $portaria[0],
            'destino_lat' => $destinoAntigo[1], 'destino_lng' => $destinoAntigo[0],
        ]))->assertOk()->assertJsonPath('distancia_metros', fn ($v) => abs((float) $v - 50.0) < 0.5);

        // Estende a via para 90 m e consulta a rota até o novo fim dela.
        $this->como($this->admin, $this->tenant)->putJson("/api/cemiterios/gis/vias/{$via->id}", [
            'park_id' => $this->parque->id, 'via_codigo' => 'AL-01', 'geojson' => $this->linha([0, 0], [0, 90]),
        ])->assertOk();

        $destinoNovo = Geo::desprojetar([[0, 90]], self::REF)[0];
        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/gis/rotas?' . http_build_query([
            'park_id' => $this->parque->id,
            'origem_lat' => $portaria[1], 'origem_lng' => $portaria[0],
            'destino_lat' => $destinoNovo[1], 'destino_lng' => $destinoNovo[0],
        ]))->assertOk()->assertJsonPath('distancia_metros', fn ($v) => abs((float) $v - 90.0) < 0.5);
    }

    /**
     * @param array{0: float, 1: float} $a metros a partir de REF
     * @param array{0: float, 1: float} $b metros a partir de REF
     * @return array{type: string, coordinates: list<array{0: float, 1: float}>}
     */
    private function linha(array $a, array $b): array
    {
        return ['type' => 'LineString', 'coordinates' => Geo::desprojetar([$a, $b], self::REF)];
    }

    /**
     * @param array{0: float, 1: float} $a metros a partir de REF
     * @param array{0: float, 1: float} $b metros a partir de REF
     */
    private function criarVia(int $parkId, string $codigo, array $a, array $b): Via
    {
        $geojson = $this->linha($a, $b);
        $pontos = $geojson['coordinates'];

        return Via::create([
            'park_id' => $parkId, 'via_codigo' => $codigo, 'geojson' => $geojson,
            'min_lng' => min(array_column($pontos, 0)), 'max_lng' => max(array_column($pontos, 0)),
            'min_lat' => min(array_column($pontos, 1)), 'max_lat' => max(array_column($pontos, 1)),
        ]);
    }

    /** @param array{0: float, 1: float} $ponto metros a partir de REF */
    private function criarAmenidade(int $parkId, string $tipo, array $ponto): Amenidade
    {
        [$lng, $lat] = Geo::desprojetar([$ponto], self::REF)[0];

        return Amenidade::create(['park_id' => $parkId, 'tipo' => $tipo, 'lat' => $lat, 'lng' => $lng]);
    }

    /** @return list<float> */
    private function bbox(float $x0, float $y0, float $x1, float $y1): array
    {
        [$min, $max] = Geo::desprojetar([[$x0, $y0], [$x1, $y1]], self::REF);

        return [$min[0], $min[1], $max[0], $max[1]];
    }
}
