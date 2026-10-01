<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    use \Tests\Concerns\GuardAgainstRealDatabase;

    public function createApplication(): \Illuminate\Contracts\Foundation\Application
    {
        $app = require __DIR__ . '/../../../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();
        $this->assertTestDatabaseIsSafe();

        return $app;
    }

    /**
     * Vários testes do módulo passam por limitadores nomeados (cursos-publico,
     * cursos-respostas...). RateLimiter::clear() só limpa a chave literal do nome, não a chave
     * com ->by($ip)/->by($user) que o limitador de fato usa — então, sem isso, contagem de um
     * teste anterior no mesmo processo do phpunit vaza pro próximo e gera 429 em requisição que
     * deveria passar (achado ao investigar flakiness na tarefa 2.3).
     */
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }
}
