<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use Modules\Cemiterios\Database\Seeders\CemiteriosRbacSeeder;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: privacidade-auditoria › Perfis padrão do módulo (DRS §4). */
final class PerfisTest extends CemiteriosTestCase
{
    public function test_habilitar_o_modulo_provisiona_os_cinco_perfis(): void
    {
        $this->seed(CemiteriosRbacSeeder::class);
        $t = $this->criarTenant();

        self::assertSame(5, app(ModuleRoleProvisioner::class)->provisionForTenant($t, 'cemiterios'));
        self::assertSame(5, Role::where('tenant_id', $t->id)->where('module', 'cemiterios')->count());
    }

    public function test_matriz_perfil_por_endpoint(): void
    {
        $this->seed(CemiteriosRbacSeeder::class);
        $t = $this->criarTenant();
        app(ModuleRoleProvisioner::class)->provisionForTenant($t, 'cemiterios');

        $coveiro = $this->comPerfil($t, 'cemiterios_coveiro');
        $admin = $this->comPerfil($t, 'cemiterios_admin_geral');
        $financeiro = $this->comPerfil($t, 'cemiterios_financeiro');

        $this->como($coveiro, $t)->postJson('/api/cemiterios/parques', ['codigo' => 'C1', 'nome' => 'X'])->assertForbidden();
        $this->como($coveiro, $t)->getJson('/api/cemiterios/parques')->assertOk();
        $this->como($financeiro, $t)->postJson('/api/cemiterios/parametros', ['edital_prazo_dias' => 20])->assertForbidden();
        $this->como($admin, $t)->postJson('/api/cemiterios/parques', ['codigo' => 'C1', 'nome' => 'X'])->assertCreated();
        $this->como($admin, $t)->postJson('/api/cemiterios/parametros', ['edital_prazo_dias' => 20])->assertCreated();
    }

    private function comPerfil(Tenant $t, string $slug): User
    {
        $user = User::create(['name' => $slug, 'email' => "{$slug}@teste.gov.br", 'password' => bcrypt('x')]);

        return $this->vincular($user, $t, Role::where('tenant_id', $t->id)->where('slug', $slug)->firstOrFail());
    }
}
