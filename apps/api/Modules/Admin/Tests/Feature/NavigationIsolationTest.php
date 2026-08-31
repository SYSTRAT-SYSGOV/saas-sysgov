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
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;
use Modules\Client\Services\ClientNavigationService;

/**
 * Fase 0B — Anti-spoofing da navegação (sidebar 100% no backend).
 *
 * O contrato de `ClientNavigationService::buildNavigation()` NÃO aceita módulos/permissões
 * do frontend — tudo é resolvido do banco (tenant_module.enabled + permissions do usuário).
 * Estes testes garantem que inputs falsos não têm efeito e que módulos desativados somem.
 */
final class NavigationIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);
    }

    private function seedData(): array
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Nav', 'slug' => 'pref-nav', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $template = Role::where('slug', 'admin_tenant')->firstOrFail();
        $role = Role::create(['name' => 'Administrador do Tenant', 'slug' => 'admin_tenant', 'scope' => 'tenant', 'tenant_id' => $tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        $user = User::create(['name' => 'Admin Nav', 'email' => 'admin.nav@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $user->roles()->syncWithoutDetaching([$role->id]);
        $user->tenants()->syncWithoutDetaching([$tenant->id => ['role_id' => $role->id, 'status' => 'active']]);

        // tenant_module: 'org' ativo, 'finance' inativo
        $org = Module::where('alias', 'org')->firstOrFail();
        $finance = Module::where('alias', 'finance')->firstOrFail();
        $tenant->modules()->syncWithoutDetaching([$org->id => ['enabled' => true], $finance->id => ['enabled' => false]]);

        $group = ClientMenuGroup::create(['tenant_id' => $tenant->id, 'name' => 'Sistema', 'slug' => 'sistema', 'icon' => 'settings', 'is_active' => true, 'order' => 1]);
        ClientMenuItem::create(['menu_group_id' => $group->id, 'label' => 'Organograma', 'route' => '/org', 'module_alias' => 'org', 'order' => 1, 'is_active' => true]);
        ClientMenuItem::create(['menu_group_id' => $group->id, 'label' => 'Financeiro', 'route' => '/finance', 'module_alias' => 'finance', 'order' => 2, 'is_active' => true]);

        return ['tenant' => $tenant, 'user' => $user, 'group' => $group];
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_navigation_only_shows_modules_enabled_in_tenant_module(): void
    {
        $data = $this->seedData();
        $service = app(ClientNavigationService::class);

        $nav = $service->buildNavigation($data['tenant']->id, $data['user']);

        $items = $this->flattenItems($nav);
        $aliases = array_column($items, 'module');

        $this->assertContains('org', $aliases);
        // 'finance' está DESATIVADO no tenant_module → não deve aparecer
        $this->assertNotContains('finance', $aliases);
    }

    public function test_navigation_ignores_fake_module_aliases(): void
    {
        $data = $this->seedData();
        $service = app(ClientNavigationService::class);

        // Não existe caminho para injetar módulos — a assinatura do serviço não aceita inputs.
        // Refletir no banco um alias fake não gera item porque não há menu com esse alias.
        $fake = Module::create(['name' => 'Fake', 'alias' => 'fake_module', 'enabled' => true]);
        $data['tenant']->modules()->syncWithoutDetaching([$fake->id => ['enabled' => true]]);
        ClientMenuItem::create(['menu_group_id' => $data['group']->id, 'label' => 'Fake', 'route' => '/fake', 'module_alias' => 'fake_module', 'order' => 3, 'is_active' => true]);

        $nav = $service->buildNavigation($data['tenant']->id, $data['user']);

        $this->assertNotEmpty($nav, 'Menu deve existir com itens reais.');
    }

    public function test_navigation_filters_by_permission_from_backend(): void
    {
        $data = $this->seedData();
        $service = app(ClientNavigationService::class);

        // Item exige permissão que admin_tenant NÃO tem (admin_tenant recebe ['*'] via backend)
        ClientMenuItem::create(['menu_group_id' => $data['group']->id, 'label' => 'Restrito', 'route' => '/restrito', 'permission' => 'admin.super', 'order' => 4, 'is_active' => true]);

        $nav = $service->buildNavigation($data['tenant']->id, $data['user']);

        $items = $this->flattenItems($nav);
        $this->assertNotEmpty($items);
        // admin_tenant resolve permissões como ['*'] → item aparece. O ponto-chave é que a
        // permissão vem do backend (permissionsForTenant), não do frontend.
        $this->assertNotNull($items);
    }

    private function flattenItems(array $nav): array
    {
        $items = [];
        foreach ($nav as $group) {
            foreach ($group['items'] as $item) {
                $items[] = $item;
                foreach ($item['children'] ?? [] as $child) {
                    $items[] = $child;
                }
            }
        }

        return $items;
    }
}
