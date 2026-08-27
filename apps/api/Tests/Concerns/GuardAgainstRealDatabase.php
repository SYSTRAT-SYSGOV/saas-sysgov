<?php

declare(strict_types=1);

namespace Tests\Concerns;

/**
 * Trava de segurança: impede que a suíte de testes (RefreshDatabase / migrate:fresh)
 * rode contra o banco MySQL real.
 *
 * O cenário que esta guarda bloqueia: rodar `php artisan config:cache` (que grava
 * DB_CONNECTION=mysql em bootstrap/cache/config.php) e em seguida `phpunit`. Com o
 * config em cache, os envs do phpunit.xml (sqlite/:memory:) são ignorados e o
 * RefreshDatabase apagaria todas as tabelas do banco de produção.
 *
 * Uso: chamar $this->assertTestDatabaseIsSafe() no final de createApplication()
 * de cada TestCase base.
 */
trait GuardAgainstRealDatabase
{
    protected function assertTestDatabaseIsSafe(): void
    {
        $default = (string) config('database.default');
        $database = (string) config("database.connections.{$default}.database", '');

        $safe = $default === 'sqlite' && $database === ':memory:';

        if (!$safe) {
            throw new \RuntimeException(
                'BLOQUEADO: os testes estão apontando para o banco ' . strtoupper($default) . ' (' . $database . '). '
                . 'NUNCA rode phpunit/RefreshDatabase contra o banco real. '
                . 'Execute "php artisan config:clear" e garanta que DB_CONNECTION=sqlite e '
                . 'DB_DATABASE=:memory: estejam ativos no ambiente de teste.'
            );
        }
    }
}
