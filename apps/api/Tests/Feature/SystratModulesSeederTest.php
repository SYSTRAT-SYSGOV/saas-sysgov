<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Tenant;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Database\Seeders\SystratModulesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;

/**
 * Banco novo: o SYSTRAT precisa sair do boot com os módulos liberados, senão
 * o Painel do Cliente dá "Acesso Negado" até para o super_admin.
 */
final class SystratModulesSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([ModuleCatalogSeeder::class, RbacSeeder::class]);
    }

    public function test_libera_todos_os_modulos_no_systrat_em_banco_novo(): void
    {
        $this->seed(SystratModulesSeeder::class);

        $sysTenant = Tenant::where('slug', 'systrat')->firstOrFail();
        $enabled = $sysTenant->modules()->wherePivot('enabled', true)->pluck('alias')->all();

        $this->assertContains('dashboard', $enabled);
        $this->assertCount(Module::count(), $enabled);
    }

    public function test_nao_mexe_nos_modulos_se_o_systrat_ja_foi_configurado(): void
    {
        $sysTenant = Tenant::where('slug', 'systrat')->firstOrFail();
        $dashboard = Module::where('alias', 'dashboard')->firstOrFail();
        $sysTenant->modules()->attach($dashboard->id, ['enabled' => true, 'monthly_fee_cents' => 0, 'settings' => json_encode([])]);

        $this->seed(SystratModulesSeeder::class);

        $this->assertSame(['dashboard'], $sysTenant->modules()->pluck('alias')->all());
    }
}
