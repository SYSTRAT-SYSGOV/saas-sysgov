<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Tests\CemiteriosTestCase;
use PHPUnit\Framework\Attributes\Group;

/** Sanidade do ambiente espacial (ADR-001). Só roda no job api-mysql do CI. */
#[Group('mysql')]
final class MysqlEspacialTest extends CemiteriosTestCase
{
    public function test_mysql_suporta_geojson_com_srid_4326(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            self::markTestSkipped('Requer MySQL 8 (grupo mysql).');
        }

        $geojson = DB::scalar("SELECT ST_AsGeoJSON(ST_GeomFromGeoJSON('{\"type\":\"Point\",\"coordinates\":[-49.27,-25.43]}', 1, 4326))");

        self::assertSame([-49.27, -25.43], json_decode((string) $geojson, true)['coordinates']);
    }
}
