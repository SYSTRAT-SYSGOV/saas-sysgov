<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Via;
use Modules\Cemiterios\Services\GisService;
use Modules\Cemiterios\Support\Geo;
use Modules\Cemiterios\Tests\CemiteriosTestCase;
use PHPUnit\Framework\Attributes\Group;

/**
 * spec: cemiterio/mapa-gis › vias/equipamentos com índice espacial real e ST_Simplify
 * (cemiterios-mapa-gis-avancado, tarefa 4.1). Só roda no job api-mysql do CI, mesmo padrão de
 * GisMysqlTest.php.
 */
#[Group('mysql')]
final class GisAvancadoMysqlTest extends CemiteriosTestCase
{
    private const REF = [-49.27, -25.43];

    private Tenant $tenant;

    private Cemiterio $parque;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::getDriverName() !== 'mysql') {
            self::markTestSkipped('Requer MySQL 8 (grupo mysql).');
        }
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->parque = Cemiterio::create(['codigo' => 'P1', 'nome' => 'Parque']);
    }

    public function test_recorte_de_vias_por_bbox_usa_o_indice_espacial(): void
    {
        $this->criarVia('AL-01', [0, 0], [0, 50]);
        $this->criarVia('AL-02', [500, 500], [500, 550]);

        $plano = DB::select(
            "EXPLAIN SELECT id FROM cemetery_paths
             WHERE tenant_id = ? AND park_id = ?
               AND MBRIntersects(geom, ST_GeomFromText(?, 4326, 'axis-order=long-lat'))",
            [$this->tenant->id, $this->parque->id, $this->wkt(-10, -10, 10, 60)]
        );

        self::assertStringContainsString('geom', (string) $plano[0]->key, 'O recorte de vias deveria usar o SPATIAL INDEX de geom.');

        $camada = app(GisService::class)->camadaNecropole('via', $this->parque->id, $this->bbox(-10, -10, 10, 60));
        self::assertCount(1, $camada['features']);
        self::assertSame('AL-01', $camada['features'][0]['properties']['via_codigo']);
    }

    public function test_st_simplify_reduz_pontos_da_geometria_em_zoom_baixo(): void
    {
        // Polígono com muitos vértices (aproximação de círculo) para o ST_Simplify ter o que reduzir.
        $anel = [];
        for ($i = 0; $i < 64; $i++) {
            $ang = 2 * M_PI * $i / 64;
            $anel[] = [10 * cos($ang), 10 * sin($ang)];
        }
        $setor = $this->parque->setores()->create(['codigo' => 'S1', 'tipo_zona' => 'jazigos']);
        $geojson = Geo::geojson(Geo::desprojetar($anel, self::REF));
        DB::table('cemetery_geometries')->insert([
            'tenant_id' => $this->tenant->id, 'geometriavel_type' => 'setor', 'geometriavel_id' => $setor->id,
            'geojson' => json_encode($geojson),
            'geom' => DB::raw("ST_GeomFromGeoJSON('" . json_encode($geojson) . "', 1, 4326)"),
            ...Geo::caixa(Geo::desprojetar($anel, self::REF)),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $bbox = $this->bbox(-15, -15, 15, 15);
        $exata = app(GisService::class)->camada('setor', $bbox);
        $simplificada = app(GisService::class)->camada('setor', $bbox, 10); // zoom bem distante

        $pontosExatos = count($exata['features'][0]['geometry']['coordinates'][0]);
        $pontosSimplificados = count($simplificada['features'][0]['geometry']['coordinates'][0]);

        self::assertSame(65, $pontosExatos); // 64 vértices + fechamento do anel
        self::assertLessThan($pontosExatos, $pontosSimplificados);
    }

    /**
     * @param array{0: float, 1: float} $a metros a partir de REF
     * @param array{0: float, 1: float} $b metros a partir de REF
     */
    private function criarVia(string $codigo, array $a, array $b): Via
    {
        $geojson = ['type' => 'LineString', 'coordinates' => Geo::desprojetar([$a, $b], self::REF)];
        $pontos = $geojson['coordinates'];
        $valores = [
            'park_id' => $this->parque->id, 'via_codigo' => $codigo, 'geojson' => $geojson,
            'min_lng' => min(array_column($pontos, 0)), 'max_lng' => max(array_column($pontos, 0)),
            'min_lat' => min(array_column($pontos, 1)), 'max_lat' => max(array_column($pontos, 1)),
        ];
        if (DB::getDriverName() === 'mysql') {
            $valores['geom'] = DB::raw("ST_GeomFromGeoJSON('" . json_encode($geojson) . "', 1, 4326)");
        }
        $via = Via::create($valores);

        return $via->refresh();
    }

    /** @return list<float> */
    private function bbox(float $x0, float $y0, float $x1, float $y1): array
    {
        [$min, $max] = Geo::desprojetar([[$x0, $y0], [$x1, $y1]], self::REF);

        return [$min[0], $min[1], $max[0], $max[1]];
    }

    private function wkt(float $x0, float $y0, float $x1, float $y1): string
    {
        [$a, $b] = Geo::desprojetar([[$x0, $y0], [$x1, $y1]], self::REF);

        return sprintf('POLYGON((%1$F %2$F,%3$F %2$F,%3$F %4$F,%1$F %4$F,%1$F %2$F))', $a[0], $a[1], $b[0], $b[1]);
    }
}
