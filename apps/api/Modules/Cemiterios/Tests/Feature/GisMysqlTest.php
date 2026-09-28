<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Services\GisService;
use Modules\Cemiterios\Support\Geo;
use Modules\Cemiterios\Tests\CemiteriosTestCase;
use PHPUnit\Framework\Attributes\Group;

/** spec: gis › Desempenho geoespacial (tarefas 4.1 e 4.9). Só roda no job api-mysql do CI. */
#[Group('mysql')]
final class GisMysqlTest extends CemiteriosTestCase
{
    private const REF = [-49.27, -25.43];

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::getDriverName() !== 'mysql') {
            self::markTestSkipped('Requer MySQL 8 (grupo mysql).');
        }
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_recorte_por_bbox_usa_o_indice_espacial(): void
    {
        $this->semear(60, 50); // 3.000 jazigos

        $plano = DB::select(
            "EXPLAIN SELECT geometriavel_id FROM cemetery_geometries
             WHERE tenant_id = ? AND geometriavel_type = 'jazigo'
               AND MBRIntersects(geom, ST_GeomFromText(?, 4326, 'axis-order=long-lat'))",
            [$this->tenant->id, $this->wkt(0, 0, 10, 10)]
        );

        self::assertStringContainsString('geom', (string) $plano[0]->key, 'O recorte deveria usar o SPATIAL INDEX de geom.');
    }

    public function test_recorte_de_2000_jazigos_em_cemiterio_de_50000_abaixo_de_1s(): void
    {
        $this->semear(250, 200); // 50.000 jazigos

        // 50 colunas × 40 linhas = 2.000 jazigos no recorte (passo 1,8 m × 3,1 m).
        [$min, $max] = Geo::desprojetar([[0.1, 0.1], [50 * 1.8 - 0.7, 40 * 3.1 - 0.7]], self::REF);

        $inicio = hrtime(true);
        $camada = app(GisService::class)->camada('jazigo', [$min[0], $min[1], $max[0], $max[1]]);
        $ms = (hrtime(true) - $inicio) / 1e6;

        fwrite(STDERR, sprintf("\n[RNF-03] recorte: %d jazigos de 50.000 em %.1f ms\n", count($camada['features']), $ms));
        self::assertCount(2000, $camada['features']);
        self::assertLessThan(1000, $ms);
    }

    /** Grade sintética de $colunas × $linhas jazigos de 1,2 m × 2,5 m com 0,6 m de espaçamento. */
    private function semear(int $colunas, int $linhas): void
    {
        $parque = Cemiterio::create(['codigo' => 'P1', 'nome' => 'Parque']);
        $setor = Setor::create(['park_id' => $parque->id, 'codigo' => 'S1', 'tipo_zona' => 'jazigos']);
        $agora = now()->toDateTimeString();
        $tenant = $this->tenant->id;

        for ($l = 0; $l < $linhas; $l++) {
            $jazigos = [];
            for ($c = 0; $c < $colunas; $c++) {
                $jazigos[] = [
                    'tenant_id' => $tenant, 'park_id' => $parque->id, 'sector_id' => $setor->id, 'codigo' => "L{$l}C{$c}",
                    'tipo' => 'jazigo', 'capacidade' => 3, 'estado' => 'disponivel', 'created_at' => $agora, 'updated_at' => $agora,
                ];
            }
            DB::table('plot_inventory')->insert($jazigos);
            $ids = DB::table('plot_inventory')->where('sector_id', $setor->id)->where('codigo', 'like', "L{$l}C%")->pluck('id', 'codigo');

            $geometrias = [];
            for ($c = 0; $c < $colunas; $c++) {
                $x = $c * 1.8;
                $y = $l * 3.1;
                $anel = Geo::desprojetar([[$x, $y], [$x + 1.2, $y], [$x + 1.2, $y + 2.5], [$x, $y + 2.5]], self::REF);
                $geojson = Geo::geojson($anel);
                $geometrias[] = [
                    'tenant_id' => $tenant, 'geometriavel_type' => 'jazigo', 'geometriavel_id' => $ids["L{$l}C{$c}"],
                    'geojson' => json_encode($geojson),
                    'geom' => DB::raw("ST_GeomFromGeoJSON('" . json_encode($geojson) . "', 1, 4326)"),
                    'created_at' => $agora, 'updated_at' => $agora,
                ] + Geo::caixa($anel);
            }
            DB::table('cemetery_geometries')->insert($geometrias);
        }

        DB::statement('ANALYZE TABLE cemetery_geometries');
    }

    private function wkt(float $x0, float $y0, float $x1, float $y1): string
    {
        [$a, $b] = Geo::desprojetar([[$x0, $y0], [$x1, $y1]], self::REF);

        return sprintf('POLYGON((%1$F %2$F,%3$F %2$F,%3$F %4$F,%1$F %4$F,%1$F %2$F))', $a[0], $a[1], $b[0], $b[1]);
    }
}
