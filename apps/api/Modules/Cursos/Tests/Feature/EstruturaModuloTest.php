<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Cursos\Database\Seeders\CursosRbacSeeder;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefas 1.3 e 1.4: gate de módulo nas rotas autenticadas e provisionamento
 * dos três perfis ao habilitar o módulo para um tenant.
 */
final class EstruturaModuloTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    public function test_rota_autenticada_responde_403_com_modulo_desabilitado_no_tenant(): void
    {
        $tenant = $this->criarTenant('prefeitura-a');
        $participante = $this->usuario($tenant, ['participante_cursos']);

        $this->como($participante, $tenant)->getJson('/api/cursos/catalogo')->assertOk();

        $this->habilitarModulo($tenant, false);

        $this->como($participante, $tenant)->getJson('/api/cursos/catalogo')
            ->assertStatus(403)
            ->assertJsonPath('code', 'MODULE_ACCESS_DENIED');
    }

    public function test_rota_autenticada_exige_login(): void
    {
        $this->getJson('/api/cursos/catalogo')->assertStatus(401);
    }

    public function test_habilitar_o_modulo_no_admin_suite_provisiona_os_tres_perfis(): void
    {
        (new CursosRbacSeeder())->run();
        $admin = User::create(['name' => 'Platform Admin', 'email' => 'padmin@sysgov.local', 'password' => bcrypt('secret'), 'is_platform_admin' => true]);
        $tenant = Tenant::create(['name' => 'Município', 'slug' => 'municipio', 'type' => 'prefeitura', 'status' => 'active']);
        $modulo = Module::create(['name' => 'Cursos e Formações', 'alias' => 'cursos', 'enabled' => true, 'monthly_fee_cents' => 0]);

        $this->actingAs($admin)->putJson("/api/admin/tenants/{$tenant->id}/modules/{$modulo->id}", ['enabled' => true])->assertOk();

        foreach (array_keys(CursosRbacSeeder::PERFIS) as $slug) {
            $role = Role::where('slug', $slug)->where('tenant_id', $tenant->id)->first();
            $this->assertNotNull($role, "Perfil '{$slug}' deveria ter sido provisionado para o tenant.");
            $this->assertEqualsCanonicalizing(
                CursosRbacSeeder::PERFIS[$slug]['permissions'],
                $role->permissions()->pluck('slug')->all(),
            );
        }
    }

    public function test_seeder_de_perfis_e_idempotente(): void
    {
        (new CursosRbacSeeder())->run();
        (new CursosRbacSeeder())->run();

        $this->assertSame(3, Role::where('module', 'cursos')->count());
    }
}
