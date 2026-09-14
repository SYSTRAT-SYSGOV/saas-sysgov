<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Capd\Database\Seeders\CapdRbacSeeder;
use Tests\TestCase;

/**
 * Ao habilitar um módulo para um tenant, suas roles/permissions
 * específicas (marcadas via roles.module) devem ser provisionadas
 * automaticamente para aquele tenant.
 */
final class ModuleToggleRoleProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_habilitar_modulo_capd_provisiona_as_5_roles_no_tenant(): void
    {
        (new CapdRbacSeeder())->run();

        $admin = User::create([
            'name' => 'Platform Admin', 'email' => 'padmin@sysgov.local', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);

        $tenant = Tenant::create(['name' => 'Município Toggle Teste', 'slug' => 'municipio-toggle-teste', 'type' => 'prefeitura', 'status' => 'active']);
        $module = Module::create(['name' => 'CAPD', 'alias' => 'capd', 'enabled' => true, 'monthly_fee_cents' => 0]);

        $this->assertSame(0, Role::where('tenant_id', $tenant->id)->count());

        $response = $this->actingAs($admin)->putJson("/api/admin/tenants/{$tenant->id}/modules/{$module->id}", [
            'enabled' => true,
        ]);

        $response->assertStatus(200);

        $slugs = ['membro_capd', 'gestor_rh', 'avaliador', 'servidor', 'auditoria_capd'];
        foreach ($slugs as $slug) {
            $this->assertNotNull(
                Role::where('slug', $slug)->where('tenant_id', $tenant->id)->first(),
                "Role '{$slug}' deveria ter sido provisionada para o tenant ao habilitar o módulo capd."
            );
        }
    }

    public function test_desabilitar_modulo_nao_provisiona_roles(): void
    {
        (new CapdRbacSeeder())->run();

        $admin = User::create([
            'name' => 'Platform Admin 2', 'email' => 'padmin2@sysgov.local', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);

        $tenant = Tenant::create(['name' => 'Município Toggle Off', 'slug' => 'municipio-toggle-off', 'type' => 'prefeitura', 'status' => 'active']);
        $module = Module::create(['name' => 'CAPD', 'alias' => 'capd', 'enabled' => true, 'monthly_fee_cents' => 0]);

        $this->actingAs($admin)->putJson("/api/admin/tenants/{$tenant->id}/modules/{$module->id}", [
            'enabled' => false,
        ])->assertStatus(200);

        $this->assertSame(0, Role::where('slug', 'membro_capd')->where('tenant_id', $tenant->id)->count());
    }
}
