<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RF-12 — PainelGerencialController exige capd.dashboard.view em todos os
 * endpoints (dados agregados/individuais de todos os servidores do tenant).
 */
final class PainelGerencialRbacTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $admin;
    private User $semPermissao;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Painel RBAC',
            'slug'   => 'pref-painel-rbac',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->admin = User::create([
            'name'              => 'Admin Painel',
            'email'             => 'admin.painel@araucaria.pr.gov.br',
            'password'          => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->admin->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->semPermissao = User::create([
            'name'     => 'Servidor Comum Painel',
            'email'    => 'servidor.painel@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $this->semPermissao->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_usuario_sem_permissao_recebe_403_ao_listar_servidores_do_painel(): void
    {
        $response = $this->actingAs($this->semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/capd/painel/servidores');

        $response->assertStatus(403);
    }

    public function test_usuario_sem_permissao_recebe_403_ao_exportar_csv(): void
    {
        $response = $this->actingAs($this->semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/capd/painel/export');

        $response->assertStatus(403);
    }

    public function test_admin_lista_servidores_do_painel_com_sucesso(): void
    {
        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/capd/painel/servidores');

        $response->assertStatus(200);
    }
}
