<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;
use Modules\Client\Services\ClientNavigationService;

/**
 * Módulo desligado no catálogo (modules.enabled = false, ex.: fora da versão 1) some para todos os tenants, mesmo
 * com o vínculo tenant_module ativo: sessão (/auth/me), navegação e a API (Gate "module", inclusive para admin).
 */
final class ModuloForaDaV1Test extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);

        $this->tenant = Tenant::create(['name' => 'Prefeitura V1', 'slug' => 'pref-v1', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $template = Role::where('slug', 'admin_tenant')->firstOrFail();
        $role = Role::create(['name' => 'Administrador do Tenant', 'slug' => 'admin_tenant', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        $this->admin = User::create(['name' => 'Admin V1', 'email' => 'admin.v1@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->admin->roles()->syncWithoutDetaching([$role->id]);
        $this->admin->tenants()->syncWithoutDetaching([$this->tenant->id => ['role_id' => $role->id, 'status' => 'active']]);

        // Os dois módulos vinculados e ativos no tenant; só 'finance' fica desligado no catálogo.
        $org = Module::where('alias', 'org')->firstOrFail();
        $finance = Module::where('alias', 'finance')->firstOrFail();
        $this->tenant->modules()->syncWithoutDetaching([$org->id => ['enabled' => true], $finance->id => ['enabled' => true]]);
        $finance->update(['enabled' => false]);

        $group = ClientMenuGroup::create(['tenant_id' => $this->tenant->id, 'name' => 'Sistema', 'slug' => 'sistema', 'icon' => 'settings', 'is_active' => true, 'order' => 1]);
        ClientMenuItem::create(['menu_group_id' => $group->id, 'label' => 'Organograma', 'route' => '/organograma', 'module_alias' => 'org', 'order' => 1, 'is_active' => true]);
        ClientMenuItem::create(['menu_group_id' => $group->id, 'label' => 'Execução Financeira', 'route' => '/financeiro', 'module_alias' => 'finance', 'order' => 2, 'is_active' => true]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_sessao_nao_lista_o_modulo_desligado_no_catalogo(): void
    {
        $resposta = $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Tenant-Slug', $this->tenant->slug)
            ->getJson('/api/auth/me')
            ->assertOk();

        $modulos = $resposta->json('modules');
        $this->assertContains('org', $modulos);
        $this->assertNotContains('finance', $modulos);
    }

    public function test_navegacao_nao_mostra_o_modulo_desligado_no_catalogo(): void
    {
        $nav = app(ClientNavigationService::class)->buildNavigation($this->tenant->id, $this->admin);

        $rotas = [];
        array_walk_recursive($nav, function ($valor, $chave) use (&$rotas): void {
            if ($chave === 'route') {
                $rotas[] = $valor;
            }
        });

        $this->assertContains('/organograma', $rotas);
        $this->assertNotContains('/financeiro', $rotas);
    }

    public function test_api_do_modulo_desligado_nega_ate_para_admin_do_tenant_e_da_plataforma(): void
    {
        $this->assertTrue(Gate::forUser($this->admin)->allows('module', 'org'));
        $this->assertFalse(Gate::forUser($this->admin)->allows('module', 'finance'));

        $plataforma = User::create(['name' => 'Plataforma', 'email' => 'plataforma.v1@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true, 'is_platform_admin' => true]);
        $this->assertFalse(Gate::forUser($plataforma)->allows('module', 'finance'));
    }

    public function test_religar_o_modulo_no_catalogo_o_traz_de_volta(): void
    {
        Module::where('alias', 'finance')->firstOrFail()->update(['enabled' => true]);
        Cache::flush();

        $this->assertTrue(Gate::forUser($this->admin)->allows('module', 'finance'));
        $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Tenant-Slug', $this->tenant->slug)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonFragment(['finance']);
    }
}
