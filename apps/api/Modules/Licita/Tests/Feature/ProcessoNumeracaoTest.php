<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Tests\TestCase;

/**
 * RN: o usuário não escolhe número/ano do processo ao criar — só o objeto
 * preliminar. O ano é sempre o corrente e o número é sequencial dentro do
 * ano, por tenant.
 */
final class ProcessoNumeracaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_numero_e_sequencial_e_ano_e_o_corrente(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
        $user = User::create(['name' => 'Fulano', 'email' => 'fulano@teste.gov.br', 'password' => bcrypt('secret')]);

        $service = app(ProcessoService::class);

        $p1 = $service->criar(['objeto' => 'Primeiro'], $user);
        $p2 = $service->criar(['objeto' => 'Segundo'], $user);
        $p3 = $service->criar(['objeto' => 'Terceiro'], $user);

        self::assertSame((int) now()->year, $p1->ano);
        self::assertSame('001', $p1->numero);
        self::assertSame('002', $p2->numero);
        self::assertSame('003', $p3->numero);
    }

    public function test_numeracao_e_isolada_por_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'type' => 'prefeitura', 'status' => 'active']);
        $context = app(TenantContext::class);
        $service = app(ProcessoService::class);

        $context->set($tenantA);
        $userA = User::create(['name' => 'A', 'email' => 'a@teste.gov.br', 'password' => bcrypt('secret')]);
        $service->criar(['objeto' => 'A1'], $userA);
        $processoA2 = $service->criar(['objeto' => 'A2'], $userA);

        $context->set($tenantB);
        $userB = User::create(['name' => 'B', 'email' => 'b@teste.gov.br', 'password' => bcrypt('secret')]);
        $processoB1 = $service->criar(['objeto' => 'B1'], $userB);

        // Tenant B começa do 001 de novo — a sequência não vaza entre tenants.
        self::assertSame('002', $processoA2->numero);
        self::assertSame('001', $processoB1->numero);
    }
}
