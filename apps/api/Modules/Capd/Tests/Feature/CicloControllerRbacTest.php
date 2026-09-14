<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RBAC e parametrização do corte de elegibilidade (RN-04) em CicloController.
 */
final class CicloControllerRbacTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Ciclos RBAC',
            'slug'   => 'pref-ciclos-rbac',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->admin = User::create([
            'name'              => 'Admin Ciclos',
            'email'             => 'admin.ciclos@araucaria.pr.gov.br',
            'password'          => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->admin->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function payloadCiclo(array $overrides = []): array
    {
        return array_merge([
            'nome'             => 'Ciclo 2026',
            'ano_competencia'  => 2026,
            'data_inicio'      => '2026-01-01',
            'data_fim'         => '2026-12-31',
        ], $overrides);
    }

    public function test_usuario_sem_permissao_recebe_403_ao_criar_ciclo(): void
    {
        $semPermissao = User::create([
            'name'     => 'Servidor Comum',
            'email'    => 'servidor.ciclos@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $semPermissao->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $response = $this->actingAs($semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/ciclos', $this->payloadCiclo());

        $response->assertStatus(403);
    }

    public function test_admin_parametriza_nota_corte_nfc_ao_criar_ciclo(): void
    {
        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/ciclos', $this->payloadCiclo(['nota_corte_nfc' => 75.5]));

        $response->assertStatus(201);
        $this->assertEquals('75.5', $response->json('nota_corte_nfc'));
    }

    public function test_admin_atualiza_nota_corte_nfc_de_ciclo_existente(): void
    {
        $criado = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/ciclos', $this->payloadCiclo())
            ->json();

        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->putJson("/api/capd/ciclos/{$criado['id']}", ['nota_corte_nfc' => 80.0]);

        $response->assertStatus(200);
        $this->assertEquals('80', $response->json('nota_corte_nfc'));
    }
}
