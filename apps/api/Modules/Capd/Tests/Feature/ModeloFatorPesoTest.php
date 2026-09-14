<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\ModeloFormulario;
use Tests\TestCase;

/**
 * Testes de Pesos por Fator Configuráveis por Formulário (RF-02).
 */
final class ModeloFatorPesoTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $admin;
    private ModeloFormulario $modelo;
    private FatorAvaliacao $fator1;
    private FatorAvaliacao $fator2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Pesos',
            'slug'   => 'pref-pesos',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->admin = User::create([
            'name'              => 'Admin Pesos',
            'email'             => 'admin.pesos@araucaria.pr.gov.br',
            'password'          => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->admin->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->modelo = ModeloFormulario::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'MOD_PESOS_2026',
            'nome'            => 'Modelo com Pesos Customizados',
            'versao'          => 1,
            'vigencia_inicio' => '2026-01-01',
            'ativo'           => true,
        ]);

        $this->fator1 = FatorAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'F1',
            'nome'            => 'Produtividade',
            'descricao'       => 'Fator de produtividade no trabalho.',
            'peso_geral'      => 1.0,
            'peso_magisterio' => 1.0,
            'ordem'           => 1,
            'ativo'           => true,
        ]);

        $this->fator2 = FatorAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'F2',
            'nome'            => 'Assiduidade',
            'descricao'       => 'Fator de assiduidade e pontualidade.',
            'peso_geral'      => 1.0,
            'peso_magisterio' => 1.0,
            'ordem'           => 2,
            'ativo'           => true,
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_sync_com_soma_100_persiste_pesos(): void
    {
        $payload = [
            'fatores' => [
                ['fator_id' => $this->fator1->id, 'peso' => 60.00],
                ['fator_id' => $this->fator2->id, 'peso' => 40.00],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/modelos-formulario/{$this->modelo->id}/fatores-pesos/sync", $payload);

        $response->assertStatus(200);
        $this->assertEquals(100.0, $response->json('soma_pesos'));
        $this->assertDatabaseHas('capd_modelo_fator_pesos', [
            'modelo_id' => $this->modelo->id,
            'fator_id'  => $this->fator1->id,
            'peso'      => 60.00,
        ]);
    }

    public function test_sync_rejeita_soma_diferente_de_100(): void
    {
        $payload = [
            'fatores' => [
                ['fator_id' => $this->fator1->id, 'peso' => 50.00],
                ['fator_id' => $this->fator2->id, 'peso' => 30.00],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/modelos-formulario/{$this->modelo->id}/fatores-pesos/sync", $payload);

        $response->assertStatus(422);
    }

    public function test_usuario_sem_permissao_recebe_403_ao_sincronizar_pesos(): void
    {
        $semPermissao = User::create([
            'name'     => 'Servidor Comum',
            'email'    => 'servidor.pesos@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $semPermissao->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $payload = [
            'fatores' => [
                ['fator_id' => $this->fator1->id, 'peso' => 60.00],
                ['fator_id' => $this->fator2->id, 'peso' => 40.00],
            ],
        ];

        $response = $this->actingAs($semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/modelos-formulario/{$this->modelo->id}/fatores-pesos/sync", $payload);

        $response->assertStatus(403);
    }
}
