<?php

declare(strict_types=1);

namespace Modules\Procurement\Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

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
}
