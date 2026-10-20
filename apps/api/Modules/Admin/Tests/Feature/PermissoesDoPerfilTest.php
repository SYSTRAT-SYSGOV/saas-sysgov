<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

/**
 * O administrador do tenant atribui as permissões de Pessoas ao perfil que quiser, e a atribuição sobrevive ao
 * seeder de RBAC que roda a cada subida do container.
 */
final class PermissoesDoPerfilTest extends TestCase
{
    use RefreshDatabase;

    private Role $gestor;

    private Permission $mesclar;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->gestor = Role::query()->where('slug', 'gestor')->firstOrFail();
        $this->mesclar = Permission::create(['name' => 'Mesclar cadastros duplicados de pessoas', 'slug' => 'cadastros.pessoas.merge', 'module' => 'pessoas', 'guard_name' => 'web']);
    }

    /** @return list<string> */
    private function slugs(): array
    {
        return $this->gestor->permissions()->pluck('slug')->all();
    }

    public function test_permissao_de_pessoas_atribuida_a_mao_sobrevive_ao_seeder(): void
    {
        $this->gestor->permissions()->syncWithoutDetaching([$this->mesclar->id]);
        $this->assertContains('cadastros.pessoas.merge', $this->slugs());

        $this->seed(RbacSeeder::class);

        $this->assertContains('cadastros.pessoas.merge', $this->slugs());
    }

    public function test_seeder_continua_removendo_permissao_de_outro_modulo_que_saiu_do_codigo(): void
    {
        $extra = Permission::create(['name' => 'Extra antiga', 'slug' => 'contracts.extra_antiga', 'module' => 'contracts', 'guard_name' => 'web']);
        $this->gestor->permissions()->syncWithoutDetaching([$extra->id]);

        $this->seed(RbacSeeder::class);

        $this->assertNotContains('contracts.extra_antiga', $this->slugs());
    }

    public function test_tela_de_perfis_grava_exatamente_a_lista_e_pode_remover_a_permissao(): void
    {
        $this->gestor->permissions()->syncWithoutDetaching([$this->mesclar->id]);

        $this->gestor->sincronizarPermissoesExato([]);

        $this->assertNotContains('cadastros.pessoas.merge', $this->slugs());
    }
}
