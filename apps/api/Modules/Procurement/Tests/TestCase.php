<?php

declare(strict_types=1);

namespace Modules\Procurement\Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    use \Tests\Concerns\GuardAgainstRealDatabase;

    public function createApplication(): \Illuminate\Contracts\Foundation\Application
    {
        $app = require __DIR__.'/../../../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();
        $this->assertTestDatabaseIsSafe();
        return $app;
    }

    /**
     * O CACHE_STORE de teste é 'array', que vive durante todo o processo PHPUnit e
     * não é resetado junto com o banco. Como RefreshDatabase recria o schema a cada
     * teste, os IDs auto-incrementados são reciclados — sem este flush, um cache
     * (ex.: HasPermissions::rolesForTenant/permissionsForTenant, chaveado por ID)
     * de um teste anterior com o mesmo ID vaza para o teste seguinte.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }
}
