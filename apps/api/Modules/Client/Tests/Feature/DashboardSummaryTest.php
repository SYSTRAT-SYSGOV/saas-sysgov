<?php

declare(strict_types=1);

namespace Modules\Client\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Client\Services\DashboardSummaryService;
use Modules\Client\Tests\TestCase;

/**
 * Os quatro cards básicos da home do Cliente: iguais para qualquer tenant, sem depender de módulo contratado,
 * e cada total conta só o tenant do usuário.
 */
final class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->tenant = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $role = $this->criarPerfil($this->tenant, 'admin_tenant');
        $template = Role::whereNull('tenant_id')->where('slug', 'admin_tenant')->firstOrFail();
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        $this->user = $this->criarUsuario($this->tenant, $role, 'a1@teste.gov', 'active');
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function criarPerfil(Tenant $tenant, string $slug): Role
    {
        return Role::create(['name' => ucfirst($slug), 'slug' => $slug, 'scope' => 'tenant', 'tenant_id' => $tenant->id, 'guard_name' => 'web', 'is_system' => false]);
    }

    private function criarUsuario(Tenant $tenant, Role $role, string $email, string $statusNoTenant, bool $ativo = true): User
    {
        $user = User::create(['name' => $email, 'email' => $email, 'password' => 'StrongPass!123', 'is_active' => $ativo]);
        $user->tenants()->syncWithoutDetaching([$tenant->id => ['role_id' => $role->id, 'status' => $statusNoTenant]]);

        return $user;
    }

    /** @return array<string, int> */
    private function totais(): array
    {
        $cartoes = app(DashboardSummaryService::class)->para($this->user);

        return array_column($cartoes, 'value', 'key');
    }

    public function test_sao_exatamente_quatro_cards_fixos_cada_um_com_cor_propria(): void
    {
        $cartoes = app(DashboardSummaryService::class)->para($this->user);

        $this->assertSame(['unidades', 'usuarios', 'perfis', 'modulos'], array_column($cartoes, 'key'));
        $this->assertSame(['Unidades', 'Usuários', 'Perfis de acesso', 'Módulos ativos'], array_column($cartoes, 'label'));
        $tons = array_column($cartoes, 'tone');
        $this->assertCount(4, array_unique($tons));
    }

    public function test_usuarios_conta_so_os_ativos_do_proprio_tenant(): void
    {
        $perfil = $this->criarPerfil($this->tenant, 'operador');
        $this->criarUsuario($this->tenant, $perfil, 'a2@teste.gov', 'active');
        $this->criarUsuario($this->tenant, $perfil, 'a3@teste.gov', 'inactive');
        $this->criarUsuario($this->tenant, $perfil, 'a4@teste.gov', 'active', ativo: false);

        $outro = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'pref-b', 'type' => 'prefeitura', 'status' => 'active']);
        $this->criarUsuario($outro, $this->criarPerfil($outro, 'operador'), 'b1@teste.gov', 'active');

        $this->assertSame(2, $this->totais()['usuarios']);
    }

    public function test_perfis_conta_so_os_do_proprio_tenant_sem_os_modelos_globais(): void
    {
        $this->criarPerfil($this->tenant, 'operador');
        $outro = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'pref-b', 'type' => 'prefeitura', 'status' => 'active']);
        $this->criarPerfil($outro, 'fiscal');
        $this->criarPerfil($outro, 'gestor');

        $this->assertSame(2, $this->totais()['perfis']);
    }

    public function test_modulos_ativos_ignora_os_de_base_os_desligados_e_os_nao_contratados(): void
    {
        foreach (['dashboard' => true, 'users' => true, 'org' => true, 'pessoas' => true, 'ata' => false] as $alias => $ativoNoTenant) {
            $modulo = Module::firstOrCreate(['alias' => $alias], ['name' => ucfirst($alias), 'enabled' => true]);
            $modulo->update(['enabled' => true]);
            $this->tenant->modules()->syncWithoutDetaching([$modulo->id => ['enabled' => $ativoNoTenant]]);
        }
        $desligado = Module::firstOrCreate(['alias' => 'cursos'], ['name' => 'Cursos', 'enabled' => true]);
        $desligado->update(['enabled' => false]);
        $this->tenant->modules()->syncWithoutDetaching([$desligado->id => ['enabled' => true]]);
        Module::firstOrCreate(['alias' => 'escola'], ['name' => 'Escola', 'enabled' => true]);

        // org e pessoas: contratados e ligados. dashboard/users são de base, ata está desligada no tenant,
        // cursos está desligado no catálogo e escola nem foi contratada.
        $this->assertSame(2, $this->totais()['modulos']);
    }

    public function test_os_quatro_totais_existem_mesmo_sem_nenhum_modulo_contratado(): void
    {
        $totais = $this->totais();

        $this->assertSame(['unidades', 'usuarios', 'perfis', 'modulos'], array_keys($totais));
        $this->assertSame(0, $totais['modulos']);
        $this->assertSame(1, $totais['usuarios']);
    }
}
