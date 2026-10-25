<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Tests\TestCase;

final class EducaScaffoldAndRbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_rbac_seeder_registers_all_7_submodules_in_platform_catalog(): void
    {
        $tenant = Tenant::create([
            'name' => 'Prefeitura de Testes',
            'slug' => 'pref-testes',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        $this->seed(EducaRbacSeeder::class);

        // Verifica que todos os 7 submódulos estão cadastrados no catálogo da plataforma
        $expectedSubmodules = [
            'educa',
            'educa-secretaria',
            'educa-pedagogico',
            'educa-servidores',
            'educa-educacenso',
            'educa-transporte',
            'educa-comunicacao',
        ];

        foreach ($expectedSubmodules as $alias) {
            $module = Module::where('alias', $alias)->first();
            self::assertNotNull($module, "Submódulo {$alias} deve existir no catálogo de módulos.");
            self::assertTrue($module->enabled);
        }

        // Verifica permissões do core
        self::assertGreaterThanOrEqual(15, Permission::where('module', 'educa')->count());
        self::assertTrue(Permission::where('slug', 'educa.core.anos_letivos.view')->exists());
        self::assertTrue(Permission::where('slug', 'educa.core.calendarios.publish')->exists());

        // Verifica perfis criados no tenant de sistema
        $systrat = Tenant::where('slug', 'systrat')->firstOrFail();
        self::assertTrue(Role::where('tenant_id', $systrat->id)->where('slug', 'admin_educa')->exists());
        self::assertTrue(Role::where('tenant_id', $systrat->id)->where('slug', 'secretario_educa')->exists());

        // Verifica que o módulo educa foi associado ao tenant existente
        self::assertTrue($tenant->fresh()->modules()->where('alias', 'educa')->exists());
    }
}
