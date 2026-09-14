<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\FatorAvaliacao;
use Tests\TestCase;

/**
 * CRUD dinâmico de Fatores de Avaliação (RF-02) — permite à Comissão
 * criar, editar e desativar fatores além do conjunto F1-F8 padrão.
 */
final class FatorControllerTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Fatores',
            'slug'   => 'pref-fatores',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create([
            'name'     => 'Comissao Fatores',
            'email'    => 'comissao.fatores@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function headers(): array
    {
        return ['X-Tenant-ID' => (string) $this->tenant->id];
    }

    public function test_lista_fatores_do_tenant(): void
    {
        FatorAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'F1',
            'nome'            => 'Produtividade',
            'descricao'       => 'Quantidade de trabalho executado.',
            'peso_geral'      => 15.00,
            'peso_magisterio' => 15.00,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->getJson('/api/capd/fatores');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
    }

    public function test_cria_fator_customizado(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->postJson('/api/capd/fatores', [
                'codigo'          => 'F9',
                'nome'            => 'Inovação',
                'descricao'       => 'Proposição de melhorias de processo.',
                'peso_geral'      => 10.00,
                'peso_magisterio' => 10.00,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('capd_fatores_avaliacao', [
            'tenant_id' => $this->tenant->id,
            'codigo'    => 'F9',
            'nome'      => 'Inovação',
            'ativo'     => true,
        ]);
    }

    public function test_impede_codigo_duplicado_no_mesmo_tenant(): void
    {
        FatorAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'F1',
            'nome'            => 'Produtividade',
            'descricao'       => 'Quantidade de trabalho executado.',
            'peso_geral'      => 15.00,
            'peso_magisterio' => 15.00,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->postJson('/api/capd/fatores', [
                'codigo'          => 'F1',
                'nome'            => 'Duplicado',
                'descricao'       => 'Tentativa de duplicar código.',
                'peso_geral'      => 5.00,
                'peso_magisterio' => 5.00,
            ]);

        $response->assertStatus(422);
    }

    public function test_atualiza_fator(): void
    {
        $fator = FatorAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'F1',
            'nome'            => 'Produtividade',
            'descricao'       => 'Quantidade de trabalho executado.',
            'peso_geral'      => 15.00,
            'peso_magisterio' => 15.00,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->putJson("/api/capd/fatores/{$fator->id}", [
                'nome'      => 'Produtividade Revisada',
                'descricao' => 'Nova descrição objetiva.',
            ]);

        $response->assertStatus(200);
        $this->assertSame('Produtividade Revisada', $fator->fresh()->nome);
    }

    public function test_desativar_fator_nao_apaga_o_registro(): void
    {
        $fator = FatorAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'F1',
            'nome'            => 'Produtividade',
            'descricao'       => 'Quantidade de trabalho executado.',
            'peso_geral'      => 15.00,
            'peso_magisterio' => 15.00,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->deleteJson("/api/capd/fatores/{$fator->id}");

        $response->assertStatus(200);
        $this->assertDatabaseHas('capd_fatores_avaliacao', ['id' => $fator->id, 'ativo' => false]);
    }
}
