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
 * RBAC dos endpoints de mutação de PMD (RF-09).
 */
final class PmdControllerRbacTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $admin;
    private User $semPermissao;
    private Servidor $servidor;
    private CicloAvaliacao $ciclo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária PMD RBAC',
            'slug'   => 'pref-pmd-rbac',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->admin = User::create([
            'name'              => 'Admin PMD',
            'email'             => 'admin.pmd@araucaria.pr.gov.br',
            'password'          => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->admin->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->semPermissao = User::create([
            'name'     => 'Servidor Comum PMD',
            'email'    => 'servidor.pmd.rbac@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $this->semPermissao->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidorUser = User::create(['name' => 'Alvo PMD', 'email' => 'alvo.pmd@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        $this->servidor = Servidor::create([
            'tenant_id'             => $this->tenant->id,
            'user_id'               => $servidorUser->id,
            'matricula'             => 'PMD-RBAC-001',
            'cpf'                   => '55566677788',
            'nome_completo'         => 'Alvo PMD',
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Assistente Administrativo',
            'orgao_lotacao'         => 'Secretaria de Administração',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);

        $this->ciclo = CicloAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'nome'            => 'Ciclo Anual 2026',
            'ano_competencia' => 2026,
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
            'status'          => CicloAvaliacao::STATUS_ABERTO,
            'etapa_cadencia'  => 1,
            'nota_corte_nfc'  => '70.00',
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function payloadPmd(): array
    {
        return [
            'servidor_id' => $this->servidor->id,
            'ciclo_id'    => $this->ciclo->id,
            'nfc_gatilho' => 60.00,
            'objetivos'   => 'Capacitação em redação oficial.',
            'prazo'       => '2026-12-31',
        ];
    }

    public function test_usuario_sem_permissao_recebe_403_ao_criar_pmd(): void
    {
        $response = $this->actingAs($this->semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/pmd', $this->payloadPmd());

        $response->assertStatus(403);
    }

    public function test_admin_cria_pmd_com_sucesso(): void
    {
        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/pmd', $this->payloadPmd());

        $response->assertStatus(201);
    }

    public function test_usuario_sem_permissao_recebe_403_ao_atualizar_pmd(): void
    {
        $pmd = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/pmd', $this->payloadPmd())
            ->json();

        $response = $this->actingAs($this->semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->putJson("/api/capd/pmd/{$pmd['id']}", ['objetivos' => 'Tentativa não autorizada.']);

        $response->assertStatus(403);
    }

    public function test_usuario_sem_permissao_recebe_403_ao_concluir_acoes(): void
    {
        $pmd = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/pmd', $this->payloadPmd())
            ->json();

        $response = $this->actingAs($this->semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/pmd/{$pmd['id']}/concluir-acoes");

        $response->assertStatus(403);
    }

    public function test_admin_conclui_acoes_do_pmd(): void
    {
        $pmd = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/pmd', $this->payloadPmd())
            ->json();

        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/pmd/{$pmd['id']}/concluir-acoes");

        $response->assertStatus(200);
        $this->assertEquals('concluido', $response->json('status'));
    }

    public function test_usuario_sem_permissao_recebe_403_ao_registrar_verificacao(): void
    {
        $pmd = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/pmd', $this->payloadPmd())
            ->json();

        $response = $this->actingAs($this->semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/pmd/{$pmd['id']}/verificacao", [
                'nfc_novo_ciclo' => 80.0,
                'observacoes'    => 'Tentativa não autorizada.',
            ]);

        $response->assertStatus(403);
    }
}
