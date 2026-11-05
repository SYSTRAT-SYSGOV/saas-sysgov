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
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;
use Modules\Client\Services\ClientNavigationService;

/**
 * Módulo Educação (change educacao-modulo-submodulos): agrupador do menu, registro dos submódulos e migração dos
 * itens que já estavam gravados soltos.
 */
final class AgrupadorEducacaoMenuTest extends TestCase
{
    use RefreshDatabase;

    private const ALIASES = ['escola', 'pedagogico', 'formatura', 'passeio', 'portfolio', 'transporte'];

    private function grupo(): ClientMenuGroup
    {
        return ClientMenuGroup::create(['tenant_id' => null, 'name' => 'GESTÃO SETORIAL', 'slug' => 'gestao-setorial', 'icon' => 'Building2', 'order' => 2, 'is_active' => true]);
    }

    /** @param array<string, mixed> $extra */
    private function soltos(ClientMenuGroup $grupo, string $alias, array $extra = []): ClientMenuItem
    {
        return ClientMenuItem::create(array_merge([
            'menu_group_id' => $grupo->id, 'label' => ucfirst($alias), 'route' => '/' . $alias, 'icon' => 'Layers', 'permission' => "{$alias}.view",
            'module_alias' => $alias, 'shortcut' => 'X', 'order' => 40, 'is_active' => true,
        ], $extra));
    }

    private function migracao(): object
    {
        return require base_path('database/migrations/2026_11_05_100000_agrupar_modulos_da_educacao_no_menu.php');
    }

    public function test_registrar_o_submodulo_cria_o_agrupador_e_o_item_como_filho(): void
    {
        $this->grupo();

        $this->artisan('module:register', ['module' => 'Transporte'])->assertSuccessful();

        $pai = ClientMenuItem::query()->where('route', '/educacao')->firstOrFail();
        $this->assertNull($pai->module_alias);
        $this->assertNull($pai->permission);
        $this->assertSame('Educação', $pai->label);
        $filho = ClientMenuItem::query()->where('route', '/educacao/transporte')->firstOrFail();
        $this->assertSame($pai->id, $filho->parent_id);
        $this->assertSame('transporte', $filho->module_alias);
        $this->assertSame('transporte.view', $filho->permission);
        $this->assertSame('Transporte Escolar', $filho->label);
        $this->assertSame(0, ClientMenuItem::query()->where('route', '/transporte')->count());
    }

    public function test_registrar_de_novo_nao_duplica_o_agrupador_nem_o_item(): void
    {
        $this->grupo();

        foreach (['Passeio', 'Portfolio', 'Passeio', 'Portfolio'] as $modulo) {
            $this->artisan('module:register', ['module' => $modulo])->assertSuccessful();
        }

        $this->assertSame(1, ClientMenuItem::query()->where('route', '/educacao')->count());
        $this->assertSame(1, ClientMenuItem::query()->where('module_alias', 'passeio')->count());
        $this->assertSame(1, ClientMenuItem::query()->where('module_alias', 'portfolio')->count());
    }

    public function test_item_solto_que_ja_existia_e_reaproveitado_sem_perder_atalho_nem_situacao(): void
    {
        $solto = $this->soltos($this->grupo(), 'passeio', ['shortcut' => 'T', 'is_active' => false]);

        $this->artisan('module:register', ['module' => 'Passeio'])->assertSuccessful();

        $this->assertSame(1, ClientMenuItem::query()->where('module_alias', 'passeio')->count());
        $solto->refresh();
        $this->assertSame('/educacao/passeio', $solto->route);
        $this->assertNotNull($solto->parent_id);
        $this->assertSame('T', $solto->shortcut);
        $this->assertFalse($solto->is_active);
    }

    public function test_migracao_move_os_itens_para_o_agrupador_e_e_idempotente(): void
    {
        $grupo = $this->grupo();
        foreach (self::ALIASES as $i => $alias) {
            $this->soltos($grupo, $alias, ['order' => 30 + $i, 'label' => 'Antigo ' . $alias]);
        }
        $desativado = ClientMenuItem::query()->where('module_alias', 'portfolio')->firstOrFail();
        $desativado->update(['is_active' => false]);

        $migracao = $this->migracao();
        $migracao->up();
        $migracao->up();

        $pai = ClientMenuItem::query()->where('route', '/educacao')->get();
        $this->assertCount(1, $pai);
        $this->assertSame(30, $pai->first()->order);
        $filhos = ClientMenuItem::query()->where('parent_id', $pai->first()->id)->orderBy('order')->get();
        $this->assertSame(
            ['Cadastro Escolar', 'Gestão Pedagógica', 'Formatura e Eventos', 'Passeios', 'Portfólio Digital', 'Transporte Escolar'],
            $filhos->pluck('label')->all(),
        );
        $this->assertSame(
            ['/educacao/cadastro-escolar', '/educacao/pedagogico', '/educacao/formatura', '/educacao/passeio', '/educacao/portfolio', '/educacao/transporte'],
            $filhos->pluck('route')->all(),
        );
        $this->assertSame('pedagogico.view', $filhos->firstWhere('module_alias', 'pedagogico')->permission);
        $this->assertFalse($filhos->firstWhere('module_alias', 'portfolio')->is_active);
        $this->assertSame(7, ClientMenuItem::query()->count());
    }

    public function test_migracao_nao_recria_item_que_o_tenant_removeu(): void
    {
        $grupo = $this->grupo();
        $this->soltos($grupo, 'escola');
        $this->soltos($grupo, 'transporte');

        $this->migracao()->up();

        $this->assertSame(0, ClientMenuItem::query()->where('module_alias', 'portfolio')->count());
        $this->assertSame(3, ClientMenuItem::query()->count());
    }

    public function test_migracao_sem_nenhum_item_nao_cria_o_agrupador(): void
    {
        $this->grupo();

        $this->migracao()->up();

        $this->assertSame(0, ClientMenuItem::query()->count());
    }

    public function test_migracao_invalida_o_cache_de_navegacao_dos_tenants(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Cache', 'slug' => 'pref-cache', 'type' => 'prefeitura', 'status' => 'active']);
        $this->soltos($this->grupo(), 'escola');

        $this->migracao()->up();

        $this->assertGreaterThan(0, (int) Cache::get('nav:version:' . $tenant->id, 0));
    }

    public function test_reverter_devolve_os_itens_a_raiz_com_a_rota_antiga(): void
    {
        $grupo = $this->grupo();
        $this->soltos($grupo, 'escola');
        $this->soltos($grupo, 'transporte');
        $migracao = $this->migracao();
        $migracao->up();

        $migracao->down();

        $this->assertSame(0, ClientMenuItem::query()->where('route', '/educacao')->count());
        $this->assertSame(['/escola', '/transporte'], ClientMenuItem::query()->orderBy('id')->pluck('route')->all());
        $this->assertSame(0, ClientMenuItem::query()->whereNotNull('parent_id')->count());
    }

    /**
     * @param array<int, string> $ativos
     * @return array{tenant: Tenant, user: User}
     */
    private function tenantComModulos(array $ativos): array
    {
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);
        $tenant = Tenant::create(['name' => 'Prefeitura Edu', 'slug' => 'pref-edu', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
        $template = Role::where('slug', 'admin_tenant')->firstOrFail();
        $role = Role::create(['name' => 'Administrador do Tenant', 'slug' => 'admin_tenant', 'scope' => 'tenant', 'tenant_id' => $tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));
        $user = User::create(['name' => 'Admin Edu', 'email' => 'admin.edu@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $user->roles()->syncWithoutDetaching([$role->id]);
        $user->tenants()->syncWithoutDetaching([$tenant->id => ['role_id' => $role->id, 'status' => 'active']]);

        $sync = [];
        foreach (['org', 'finance'] as $alias) {
            $sync[Module::where('alias', $alias)->firstOrFail()->id] = ['enabled' => in_array($alias, $ativos, true)];
        }
        $tenant->modules()->syncWithoutDetaching($sync);

        return ['tenant' => $tenant, 'user' => $user];
    }

    /** Agrupador de teste com um filho em `org` e outro em `finance` (módulos que o catálogo de teste conhece). */
    private function agrupadorComFilhos(bool $comOrganograma = true): void
    {
        $grupo = ClientMenuGroup::create(['tenant_id' => null, 'name' => 'Setorial', 'slug' => 'setorial', 'icon' => 'x', 'is_active' => true, 'order' => 1]);
        $pai = ClientMenuItem::create(['menu_group_id' => $grupo->id, 'label' => 'Educação', 'route' => '/educacao', 'order' => 1, 'is_active' => true]);
        if ($comOrganograma) {
            ClientMenuItem::create(['menu_group_id' => $grupo->id, 'parent_id' => $pai->id, 'label' => 'Organograma', 'route' => '/educacao/org', 'module_alias' => 'org', 'order' => 1, 'is_active' => true]);
        }
        ClientMenuItem::create(['menu_group_id' => $grupo->id, 'parent_id' => $pai->id, 'label' => 'Financeiro', 'route' => '/educacao/finance', 'module_alias' => 'finance', 'order' => 2, 'is_active' => true]);
    }

    /**
     * @param array<int, array<string, mixed>> $nav
     * @return array<int, array<string, mixed>>
     */
    private function raizes(array $nav): array
    {
        return array_merge(...array_map(fn (array $g) => $g['items'], $nav));
    }

    public function test_agrupador_aparece_so_com_os_filhos_visiveis(): void
    {
        ['tenant' => $tenant, 'user' => $user] = $this->tenantComModulos(['org']);
        $this->agrupadorComFilhos();

        $itens = $this->raizes(app(ClientNavigationService::class)->buildNavigation($tenant->id, $user));

        $this->assertSame(['Educação'], array_column($itens, 'label'));
        $this->assertSame(['Organograma'], array_column($itens[0]['children'], 'label'));
    }

    public function test_agrupador_sem_nenhum_filho_visivel_e_omitido(): void
    {
        // O tenant tem só `org` ativo e o agrupador só tem filho em `finance` (inativo no tenant).
        ['tenant' => $tenant, 'user' => $user] = $this->tenantComModulos(['org']);
        $this->agrupadorComFilhos(false);

        $nav = app(ClientNavigationService::class)->buildNavigation($tenant->id, $user);

        $this->assertNotContains('Educação', array_column($this->raizes($nav), 'label'));
    }

    public function test_agrupador_cujos_filhos_foram_todos_desativados_e_omitido(): void
    {
        ['tenant' => $tenant, 'user' => $user] = $this->tenantComModulos(['org']);
        $this->agrupadorComFilhos();
        ClientMenuItem::query()->whereNotNull('parent_id')->update(['is_active' => false]);

        $nav = app(ClientNavigationService::class)->buildNavigation($tenant->id, $user);

        $this->assertNotContains('Educação', array_column($this->raizes($nav), 'label'));
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }
}
