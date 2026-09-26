<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Support\Geo;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/gis (tarefas 4.2–4.7), na suíte sqlite. */
final class GisTest extends CemiteriosTestCase
{
    /** Referência: Curitiba. Retângulos são dados em metros a partir daqui. */
    private const REF = [-49.27, -25.43];

    private Tenant $tenant;

    private User $admin;

    private Cemiterio $parque;

    private Setor $setor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->admin = $this->admin($this->tenant);
        $this->parque = Cemiterio::create(['codigo' => 'C1', 'nome' => 'Central']);
        $this->setor = $this->parque->setores()->create(['codigo' => 'Q1', 'tipo_zona' => 'jazigos']);

        $this->salvar('parque', $this->parque->id, $this->ret(-10, -10, 100, 100))->assertOk();
        $this->salvar('setor', $this->setor->id, $this->ret(0, 0, 40, 35))->assertOk();
    }

    // 4.2

    public function test_geojson_ida_e_volta_e_area_do_setor(): void
    {
        $jazigo = $this->jazigo('J1');
        $geojson = $this->ret(1, 1, 2.5, 1.2);
        $this->salvar('jazigo', $jazigo->id, $geojson)->assertOk();

        $this->noTenant($this->tenant);
        self::assertEqualsWithDelta(1400.0, (float) $this->setor->refresh()->area_m2, 0.5);
        self::assertEqualsWithDelta(2.5, $jazigo->refresh()->comprimento_m, 0.01);
        self::assertEqualsWithDelta(1.2, $jazigo->largura_m, 0.01);

        $feicao = $this->camada('jazigos', [-49.3, -25.5, -49.2, -25.4])->json('features.0');
        self::assertSame('disponivel', $feicao['properties']['estado']);
        foreach ($feicao['geometry']['coordinates'][0] as $i => $ponto) {
            self::assertEqualsWithDelta($geojson['coordinates'][0][$i][0], $ponto[0], 1e-8);
            self::assertEqualsWithDelta($geojson['coordinates'][0][$i][1], $ponto[1], 1e-8);
        }
    }

    public function test_poligono_auto_intersectante_ou_aberto_e_rejeitado(): void
    {
        $jazigo = $this->jazigo('J1');
        $gravata = $this->ret(1, 1, 2, 2);
        [$a, $b, $c, $d] = $gravata['coordinates'][0];
        $gravata['coordinates'][0] = [$a, $c, $b, $d, $a];

        $this->salvar('jazigo', $jazigo->id, $gravata)->assertUnprocessable()->assertJsonPath('code', 'geometria.auto_intersecao');

        $aberto = $this->ret(1, 1, 2, 2);
        array_pop($aberto['coordinates'][0]);
        $this->salvar('jazigo', $jazigo->id, $aberto)->assertUnprocessable()->assertJsonPath('code', 'geometria.anel_aberto');
    }

    // 4.3

    public function test_validacao_topologica(): void
    {
        $this->salvar('jazigo', $this->jazigo('J1')->id, $this->ret(1, 1, 2.5, 1.2))->assertOk();

        // Vizinho a 0,30 m (mínimo de referência 0,50 m).
        $this->salvar('jazigo', $this->jazigo('J2')->id, $this->ret(1, 2.5, 2.5, 1.2))
            ->assertUnprocessable()->assertJsonPath('code', 'jazigo.distanciamento')
            ->assertJsonPath('distancia_m', 0.3)->assertJsonPath('minimo_m', 0.5);

        // Jazigo que extrapola o setor.
        $this->salvar('jazigo', $this->jazigo('J3')->id, $this->ret(39, 10, 2.5, 1.2))
            ->assertUnprocessable()->assertJsonPath('code', 'geometria.fora_do_setor');

        // Túmulo de 3,40 m × 2,00 m (máximo 3,00 × 2,10).
        $this->salvar('jazigo', $this->jazigo('J4')->id, $this->ret(10, 10, 3.4, 2.0))
            ->assertUnprocessable()->assertJsonPath('code', 'jazigo.dimensao_excedida')->assertJsonPath('comprimento_m', 3.4);

        // Setor fora do cemitério.
        $this->noTenant($this->tenant);
        $outro = $this->parque->setores()->create(['codigo' => 'Q2', 'tipo_zona' => 'jazigos']);
        $this->salvar('setor', $outro->id, $this->ret(95, 95, 20, 20))->assertUnprocessable()->assertJsonPath('code', 'geometria.fora_do_parque');

        // Distância suficiente é aceita.
        $this->salvar('jazigo', $this->jazigo('J5')->id, $this->ret(1, 2.8, 2.5, 1.2))->assertOk();
    }

    // 4.4

    public function test_grade_de_10_por_20_cria_200_jazigos_validos(): void
    {
        $this->grade()->assertCreated()->assertJsonPath('criados', 200)->assertJsonPath('descartados', [])->assertJsonPath('duplicados', []);

        $this->noTenant($this->tenant);
        $codigos = Jazigo::where('sector_id', $this->setor->id)->pluck('codigo');
        self::assertCount(200, $codigos);
        self::assertCount(200, $codigos->unique());
        self::assertSame(200, Jazigo::where('estado', 'disponivel')->count());
        self::assertTrue($codigos->contains('Q1-J200'));

        // Reexecutar não duplica códigos.
        $this->grade()->assertCreated()->assertJsonPath('criados', 0)->assertJsonCount(200, 'duplicados');
    }

    public function test_grade_recusa_espacamento_abaixo_do_minimo_e_descarta_o_que_sai_do_setor(): void
    {
        $this->grade(['espacamento_m' => 0.30])->assertUnprocessable()->assertJsonPath('code', 'grade.espacamento_minimo');
        $this->noTenant($this->tenant);
        self::assertSame(0, Jazigo::count());

        $this->grade(['colunas' => 25, 'padrao' => 'X-{linha}-{coluna}'])->assertCreated()
            ->assertJsonPath('criados', 220)->assertJsonCount(30, 'descartados');
    }

    // 4.5

    public function test_camada_recorta_por_bbox_e_tenant_e_a_edicao_invalida_o_cache(): void
    {
        $this->salvar('jazigo', $this->jazigo('J1')->id, $this->ret(1, 1, 2.5, 1.2))->assertOk();
        $this->salvar('jazigo', $this->jazigo('J2')->id, $this->ret(30, 30, 2.5, 1.2))->assertOk();

        $bboxJ1 = $this->bbox(0, 0, 5, 5);
        $this->camada('jazigos', $bboxJ1)->assertOk()->assertJsonCount(1, 'features')->assertJsonPath('features.0.properties.codigo', 'J1');

        // Edição: J2 é movido para dentro do recorte; a mesma consulta já o traz.
        $this->noTenant($this->tenant);
        $this->salvar('jazigo', (int) Jazigo::where('codigo', 'J2')->value('id'), $this->ret(1, 3, 2.5, 1.2))->assertOk();
        $this->camada('jazigos', $bboxJ1)->assertJsonCount(2, 'features');

        // Outro tenant não enxerga as geometrias.
        $b = $this->criarTenant('pref-b');
        $this->como($this->admin($b), $b)->getJson('/api/cemiterios/gis/camadas?camada=jazigos&bbox=' . implode(',', $bboxJ1))
            ->assertOk()->assertJsonCount(0, 'features');
    }

    // 4.6

    public function test_sessao_do_mapa_base_google_e_troca_para_esri(): void
    {
        config(['cemiterios.mapa_base.provedor' => 'google', 'cemiterios.mapa_base.google_api_key' => 'CHAVE-TESTE']);
        Http::fake(['tile.googleapis.com/*' => Http::response(['session' => 'SESSAO123', 'expiry' => (string) (time() + 86400)])]);

        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/gis/mapa-base/sessao')
            ->assertOk()->assertJsonPath('provedor', 'google')
            ->assertJsonPath('url', fn ($u) => str_contains($u, 'session=SESSAO123') && str_contains($u, 'key=CHAVE-TESTE'));
        Http::assertSent(fn ($r) => str_contains($r->url(), 'createSession') && $r['mapType'] === 'satellite');

        config(['cemiterios.mapa_base.provedor' => 'esri']);
        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/gis/mapa-base/sessao')
            ->assertOk()->assertJsonPath('provedor', 'esri')
            ->assertJsonCount(4, 'catalogo')
            ->assertJsonPath('catalogo.0.id', 'esri')
            ->assertJsonPath('catalogo.1.id', 'osm');
        Http::assertSentCount(1);
    }

    public function test_exportar_gis_geojson_e_kml(): void
    {
        $jazigo = $this->jazigo('J-EXP-1');
        $this->salvar('jazigo', $jazigo->id, $this->ret(2, 2, 2.5, 1.2))->assertOk();

        // GeoJSON
        $resGeojson = $this->como($this->admin, $this->tenant)
            ->getJson("/api/cemiterios/gis/exportar?park_id={$this->parque->id}&formato=geojson");
        $resGeojson->assertOk()
            ->assertJsonPath('type', 'FeatureCollection')
            ->assertJsonPath('name', 'Central');

        /** @var array<int, array<string, mixed>> $features */
        $features = (array) $resGeojson->json('features');
        self::assertNotEmpty($features);
        $jazigoFeature = collect($features)->first(fn (array $f): bool => ($f['id'] ?? '') === "jazigo-{$jazigo->id}");
        self::assertNotNull($jazigoFeature);
        self::assertSame('J-EXP-1', $jazigoFeature['properties']['codigo']);

        // KML
        $resKml = $this->como($this->admin, $this->tenant)
            ->get("/api/cemiterios/gis/exportar?park_id={$this->parque->id}&formato=kml");
        $resKml->assertOk();
        self::assertStringContainsString('application/vnd.google-earth.kml+xml', (string) $resKml->headers->get('Content-Type'));
        self::assertStringContainsString('<kml xmlns="http://www.opengis.net/kml/2.2">', $resKml->getContent());
        self::assertStringContainsString('J-EXP-1', $resKml->getContent());
    }

    // 4.7

    public function test_busca_unificada_com_cpf_so_para_perfil_autorizado(): void
    {
        $jazigo = $this->jazigo('Q12-J045');
        $this->salvar('jazigo', $jazigo->id, $this->ret(5, 5, 2.5, 1.2))->assertOk();
        $cpf = $this->cpfValido();
        $this->noTenant($this->tenant);
        $this->concessao($jazigo, Concessionario::create(['nome' => 'Carlos Titular', 'tipo_doc' => 'cpf', 'documento' => $cpf]));

        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/busca?q=Q12-J045')
            ->assertOk()->assertJsonPath('0.jazigo_codigo', 'Q12-J045')->assertJsonPath('0.envelope', fn ($e) => count($e) === 4);

        $this->como($this->admin, $this->tenant)->getJson("/api/cemiterios/busca?q={$cpf}")
            ->assertOk()->assertJsonPath('0.tipo', 'concessao')->assertJsonPath('0.jazigo_id', $jazigo->id);

        $this->como($this->usuario($this->tenant, ['cemiterios.view']), $this->tenant)->getJson("/api/cemiterios/busca?q={$cpf}")
            ->assertOk()->assertJsonCount(0);
    }

    public function test_geo_distancia_e_dimensoes_em_metros(): void
    {
        $a = [[0.0, 0.0], [2.0, 0.0], [2.0, 1.0], [0.0, 1.0]];
        $b = [[2.5, 0.0], [4.5, 0.0], [4.5, 1.0], [2.5, 1.0]];

        self::assertEqualsWithDelta(0.5, Geo::distancia($a, $b), 1e-9);
        self::assertTrue(Geo::sobrepoe($a, $a));
        self::assertSame(['comprimento' => 2.0, 'largura' => 1.0], Geo::dimensoes($a));
        self::assertEqualsWithDelta(2.0, Geo::area($a), 1e-9);
    }

    private function jazigo(string $codigo): Jazigo
    {
        $this->noTenant($this->tenant);

        return Jazigo::create(['park_id' => $this->parque->id, 'sector_id' => $this->setor->id, 'codigo' => $codigo, 'tipo' => 'jazigo', 'capacidade' => 2]);
    }

    /**
     * Retângulo alinhado aos eixos, em metros a partir de REF: canto (x, y), largura leste × altura norte.
     *
     * @return array<string, mixed>
     */
    private function ret(float $x, float $y, float $largura, float $altura): array
    {
        return Geo::geojson(Geo::desprojetar([[$x, $y], [$x + $largura, $y], [$x + $largura, $y + $altura], [$x, $y + $altura]], self::REF));
    }

    /** @return list<float> */
    private function bbox(float $x0, float $y0, float $x1, float $y1): array
    {
        [$min, $max] = Geo::desprojetar([[$x0, $y0], [$x1, $y1]], self::REF);

        return [$min[0], $min[1], $max[0], $max[1]];
    }

    /**
     * @param array<string, mixed> $geojson
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function salvar(string $tipo, int $id, array $geojson): TestResponse
    {
        return $this->como($this->admin, $this->tenant)->putJson("/api/cemiterios/gis/geometrias/{$tipo}/{$id}", ['geojson' => $geojson]);
    }

    /**
     * @param list<float> $bbox
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function camada(string $camada, array $bbox): TestResponse
    {
        return $this->como($this->admin, $this->tenant)->getJson("/api/cemiterios/gis/camadas?camada={$camada}&bbox=" . implode(',', $bbox));
    }

    /**
     * @param array<string, mixed> $ajustes
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function grade(array $ajustes = []): TestResponse
    {
        [$origem, $direcao] = Geo::desprojetar([[1, 1], [10, 1]], self::REF);

        return $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/gis/setores/{$this->setor->id}/gerar-grade", $ajustes + [
            'origem' => $origem, 'direcao' => $direcao, 'linhas' => 10, 'colunas' => 20,
            'comprimento_m' => 2.5, 'largura_m' => 1.2, 'espacamento_m' => 0.6,
            'padrao' => 'Q1-J{n}', 'tipo' => 'jazigo', 'capacidade' => 3,
        ]);
    }
}
