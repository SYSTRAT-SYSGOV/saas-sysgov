<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Services\TenantProvisionService;
use Database\Seeders\ModuleCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;
use Modules\Client\Database\Seeders\ClientMenuSeeder;
use Modules\Client\Services\ClientNavigationService;

/** "Usuários & Acessos" é módulo de base: todo tenant o tem, e o item de menu aparece para o administrador. */
final class ModulosDeBaseTest extends TestCase
{
    use RefreshDatabase;

    /** @return list<string> */
    private function ativos(Tenant $tenant): array
    {
        return $tenant->modules()->wherePivot('enabled', true)->pluck('modules.alias')->all();
    }

    public function test_seeder_cria_o_modulo_users_e_o_ativa_nos_tenants_existentes(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a', 'type' => 'prefeitura', 'status' => 'active']);

        $this->seed(ModuleCatalogSeeder::class);

        $this->assertNotNull(Module::query()->where('alias', 'users')->first());
        $this->assertContains('users', $this->ativos($tenant));
        $this->assertContains('dashboard', $this->ativos($tenant));

        // Idempotente: rodar de novo não duplica nem desativa.
        $this->seed(ModuleCatalogSeeder::class);
        $this->assertSame(1, array_count_values($this->ativos($tenant))['users']);
    }

    public function test_tenant_novo_ja_nasce_com_os_modulos_de_base(): void
    {
        $this->seed(ModuleCatalogSeeder::class);

        $tenant = app(TenantProvisionService::class)->provision(['name' => 'Prefeitura B', 'slug' => 'pref-b'], []);

        $this->assertEqualsCanonicalizing(['dashboard', 'users'], $this->ativos($tenant));
    }

    public function test_menu_usuarios_e_acessos_so_aparece_com_o_modulo_ativo(): void
    {
        $this->seed(ModuleCatalogSeeder::class);
        $this->seed(ClientMenuSeeder::class);
        $tenant = Tenant::create(['name' => 'Prefeitura C', 'slug' => 'pref-c', 'type' => 'prefeitura', 'status' => 'active']);
        $modulo = Module::query()->where('alias', 'org')->firstOrFail();
        $tenant->modules()->sync([$modulo->id => ['enabled' => true]]);
        $admin = \App\Models\User::create(['name' => 'Admin', 'email' => 'admin-c@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true, 'is_platform_admin' => true]);

        $rotas = fn (): array => collect(app(ClientNavigationService::class)->buildNavigation($tenant->id, $admin))
            ->flatMap(fn (array $g): array => array_column($g['items'], 'route'))->all();

        // Com o tenant tendo outro módulo ativo, o item de "users" (inexistente no catálogo) era descartado.
        $this->assertNotEmpty($rotas(), 'o menu do módulo org deve aparecer');
        $this->assertNotContains('/usuarios', $rotas(), 'sem o módulo users ativo o item some (era o defeito)');

        $this->seed(ModuleCatalogSeeder::class);

        $this->assertContains('/usuarios', $rotas());
    }
}
