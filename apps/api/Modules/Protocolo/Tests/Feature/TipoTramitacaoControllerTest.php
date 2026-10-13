<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Protocolo\Models\TipoTramitacao;
use Tests\TestCase;

final class TipoTramitacaoControllerTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $userAdmin;
    private User $userComum;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a', 'type' => 'prefeitura', 'status' => 'active']);
        $this->tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'pref-b', 'type' => 'prefeitura', 'status' => 'active']);

        $permManage = Permission::firstOrCreate(['slug' => 'protocolo.tipos_tramitacao.manage'], ['name' => 'Gerenciar Tipos', 'guard_name' => 'web']);
        $permView = Permission::firstOrCreate(['slug' => 'protocolo.processos.view'], ['name' => 'Visualizar Processos', 'guard_name' => 'web']);

        $roleAdmin = Role::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Gestor Tipos',
            'slug' => 'gestor_tipos',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $roleAdmin->permissions()->sync([$permManage->id, $permView->id]);

        $this->userAdmin = User::create(['name' => 'Admin Protocolo', 'email' => 'admin@pref-a.gov.br', 'password' => bcrypt('secret')]);
        $this->tenantA->users()->attach($this->userAdmin->id, ['status' => 'active', 'is_primary' => true]);
        $this->userAdmin->roles()->attach($roleAdmin->id, ['tenant_id' => $this->tenantA->id]);
        $this->userAdmin->clearPermissionCache();

        $this->userComum = User::create(['name' => 'Usuario Comum', 'email' => 'comum@pref-a.gov.br', 'password' => bcrypt('secret')]);
        $this->tenantA->users()->attach($this->userComum->id, ['status' => 'active', 'is_primary' => true]);
    }

    private function como(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    public function test_lista_apenas_tipos_ativos_por_padrao(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        TipoTramitacao::create(['slug' => 'ativo_1', 'nome' => 'Ativo 1', 'ativo' => true]);
        TipoTramitacao::create(['slug' => 'inativo_1', 'nome' => 'Inativo 1', 'ativo' => false]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userAdmin, $this->tenantA)
            ->getJson('/api/protocolo/tipos-tramitacao');

        $response->assertStatus(200);
        $dados = $response->json();
        self::assertCount(1, $dados);
        self::assertSame('Ativo 1', $dados[0]['nome']);

        // Com ?todos=1, lista ativos e inativos
        $respTodos = $this->como($this->userAdmin, $this->tenantA)
            ->getJson('/api/protocolo/tipos-tramitacao?todos=1');
        $respTodos->assertStatus(200);
        self::assertCount(2, $respTodos->json());
    }

    public function test_cria_tipo_com_sucesso(): void
    {
        $response = $this->como($this->userAdmin, $this->tenantA)
            ->postJson('/api/protocolo/tipos-tramitacao', [
                'slug' => 'diligencia',
                'nome' => 'Diligência Fiscal',
                'descricao' => 'Verificação em campo',
                'prazo_dias' => 15,
                'ativo' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('slug', 'diligencia')
            ->assertJsonPath('prazo_dias', 15);

        $this->assertDatabaseHas('protocolo_tipos_tramitacao', [
            'tenant_id' => $this->tenantA->id,
            'slug' => 'diligencia',
        ]);
    }

    public function test_rejeita_slug_duplicado_no_mesmo_tenant(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        TipoTramitacao::create(['slug' => 'parecer', 'nome' => 'Parecer Jurídico', 'ativo' => true]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userAdmin, $this->tenantA)
            ->postJson('/api/protocolo/tipos-tramitacao', [
                'slug' => 'parecer',
                'nome' => 'Outro Parecer',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);
    }

    public function test_permite_mesmo_slug_em_tenants_diferentes(): void
    {
        app(TenantContext::class)->set($this->tenantB);
        TipoTramitacao::create(['slug' => 'parecer', 'nome' => 'Parecer B', 'ativo' => true]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userAdmin, $this->tenantA)
            ->postJson('/api/protocolo/tipos-tramitacao', [
                'slug' => 'parecer',
                'nome' => 'Parecer A',
            ]);

        $response->assertStatus(201);
    }

    public function test_rejeita_criacao_sem_permissao_manage(): void
    {
        $response = $this->como($this->userComum, $this->tenantA)
            ->postJson('/api/protocolo/tipos-tramitacao', [
                'slug' => 'tentativa',
                'nome' => 'Não Autorizado',
            ]);

        $response->assertStatus(403);
    }

    public function test_atualizacao_de_tipo(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $tipo = TipoTramitacao::create(['slug' => 'despacho', 'nome' => 'Despacho Inicial', 'prazo_dias' => 3, 'ativo' => true]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userAdmin, $this->tenantA)
            ->putJson("/api/protocolo/tipos-tramitacao/{$tipo->id}", [
                'nome' => 'Despacho Reavaliado',
                'prazo_dias' => 7,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('nome', 'Despacho Reavaliado')
            ->assertJsonPath('prazo_dias', 7);

        self::assertSame('Despacho Reavaliado', $tipo->fresh()->nome);
    }

    public function test_exclusao_aplica_soft_delete(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $tipo = TipoTramitacao::create(['slug' => 'obsoleto', 'nome' => 'Tipo Obsoleto', 'ativo' => true]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userAdmin, $this->tenantA)
            ->deleteJson("/api/protocolo/tipos-tramitacao/{$tipo->id}");

        $response->assertStatus(200);

        self::assertNotNull($tipo->fresh()->deleted_at);
        self::assertFalse(TipoTramitacao::where('id', $tipo->id)->exists());
        self::assertTrue(TipoTramitacao::withTrashed()->where('id', $tipo->id)->exists());
    }
}
