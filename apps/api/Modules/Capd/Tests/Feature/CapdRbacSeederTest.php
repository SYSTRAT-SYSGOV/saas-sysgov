<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Database\Seeders\CapdRbacSeeder;
use Tests\TestCase;

/**
 * Perfis de negócio do CAPD (Comissão, RH, Chefia Imediata, Servidor
 * Avaliado, Auditoria) — a policy do módulo já esperava roles como
 * 'membro_capd', 'gestor_rh' e 'avaliador', mas elas nunca eram criadas.
 */
final class CapdRbacSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_cria_as_5_roles_do_capd_com_permissoes_corretas(): void
    {
        (new CapdRbacSeeder())->run();

        $slugs = ['membro_capd', 'gestor_rh', 'avaliador', 'servidor', 'auditoria_capd'];

        foreach ($slugs as $slug) {
            $role = Role::where('slug', $slug)->first();
            $this->assertNotNull($role, "Role '{$slug}' deveria ter sido criada.");
            $this->assertSame('tenant', $role->scope);
            $this->assertTrue($role->is_system);
        }

        $this->assertNotNull(Permission::where('slug', 'capd.admin.parametrizar')->first());

        $membroCapd = Role::where('slug', 'membro_capd')->first();
        $this->assertTrue($membroCapd->permissions()->where('slug', 'capd.recurso.julgar')->exists());
        $this->assertFalse($membroCapd->permissions()->where('slug', 'capd.recurso.create')->exists());

        $servidor = Role::where('slug', 'servidor')->first();
        $this->assertTrue($servidor->permissions()->where('slug', 'capd.recurso.create')->exists());
        $this->assertFalse($servidor->permissions()->where('slug', 'capd.admin.parametrizar')->exists());

        $gestorRh = Role::where('slug', 'gestor_rh')->first();
        $this->assertTrue($gestorRh->permissions()->where('slug', 'capd.pendencias.resolver')->exists());
    }

    public function test_seeder_e_idempotente(): void
    {
        (new CapdRbacSeeder())->run();
        (new CapdRbacSeeder())->run();

        $this->assertSame(1, Role::where('slug', 'membro_capd')->count());
    }
}
