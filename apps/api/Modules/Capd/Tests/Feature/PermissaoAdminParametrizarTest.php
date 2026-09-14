<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Servidor;
use Tests\TestCase;

/**
 * Gap de policies (sub-projeto E): endpoints administrativos de
 * parametrização (Fatores, Consolidação, Quinquênios) devem exigir a
 * permissão capd.admin.parametrizar, não apenas autenticação.
 */
final class PermissaoAdminParametrizarTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $usuarioSemPermissao;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Município de Araucária Permissao', 'slug' => 'pref-permissao', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $this->usuarioSemPermissao = User::create(['name' => 'Servidor Comum', 'email' => 'servidor.comum@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $this->usuarioSemPermissao->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);
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

    public function test_criar_fator_exige_permissao_admin_parametrizar(): void
    {
        $response = $this->actingAs($this->usuarioSemPermissao)
            ->withHeaders($this->headers())
            ->postJson('/api/capd/fatores', [
                'codigo' => 'F9', 'nome' => 'Inovação', 'descricao' => 'Teste.',
                'peso_geral' => 10.00, 'peso_magisterio' => 10.00,
            ]);

        $response->assertStatus(403);
    }

    public function test_processar_consolidacao_exige_permissao_admin_parametrizar(): void
    {
        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $this->tenant->id, 'nome' => 'Ciclo Permissao', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $response = $this->actingAs($this->usuarioSemPermissao)
            ->withHeaders($this->headers())
            ->postJson("/api/capd/consolidacao/{$ciclo->id}/processar");

        $response->assertStatus(403);
    }

    public function test_gerar_quinquenios_exige_permissao_admin_parametrizar(): void
    {
        $servidorUser = User::create(['name' => 'Servidor Permissao', 'email' => 'servidor.permissao@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $servidor = Servidor::create([
            'tenant_id' => $this->tenant->id, 'user_id' => $servidorUser->id, 'matricula' => 'MAT-P1', 'cpf' => '99988877766',
            'nome_completo' => 'Servidor Permissao', 'data_nascimento' => '1985-01-01', 'data_admissao' => now()->subYears(6)->toDateString(),
            'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps', 'cargo_efetivo' => 'Analista',
            'orgao_lotacao' => 'Secretaria', 'situacao_funcional' => 'ativo', 'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
        ]);

        $response = $this->actingAs($this->usuarioSemPermissao)
            ->withHeaders($this->headers())
            ->postJson("/api/capd/servidores/{$servidor->id}/quinquenios/gerar");

        $response->assertStatus(403);
    }
}
