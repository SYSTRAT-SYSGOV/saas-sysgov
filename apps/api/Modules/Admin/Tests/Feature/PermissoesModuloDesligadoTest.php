<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Http\Resources\PermissionResource;
use Modules\Admin\Http\Resources\RoleResource;
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;

/**
 * As telas do Admin escondem as permissões de módulo desligado no catálogo (module_enabled = false), mas a API segue
 * devolvendo todas as permissões do perfil: a tela de perfis grava a lista exata e não pode revogar o que não mostra.
 */
final class PermissoesModuloDesligadoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);
        Module::where('alias', 'finance')->update(['enabled' => false]);
        $this->esquecerMemo();
    }

    /** Aliases desligados são lidos uma vez por requisição; o teste muda o catálogo no meio, então zera a memória. */
    private function esquecerMemo(): void
    {
        request()->attributes->remove('modules.desligados');
    }

    /** @return array<string, mixed> */
    private function permissao(string $slug): array
    {
        return (new PermissionResource(Permission::where('slug', $slug)->firstOrFail()))->toArray(request());
    }

    public function test_permissao_vem_marcada_conforme_o_modulo_estar_ligado_no_catalogo(): void
    {
        $this->assertFalse($this->permissao('finance.view')['module_enabled']);
        $this->assertTrue($this->permissao('contracts.view')['module_enabled']);
    }

    public function test_perfil_devolve_todas_as_permissoes_com_a_marca_para_a_tela_nao_revogar(): void
    {
        $perfil = Role::create(['name' => 'Gestor teste', 'slug' => 'gestor-teste', 'scope' => 'systrat', 'guard_name' => 'web', 'is_system' => false]);
        $perfil->sincronizarPermissoesExato([
            Permission::where('slug', 'contracts.view')->firstOrFail()->id,
            Permission::where('slug', 'finance.view')->firstOrFail()->id,
        ]);

        $lista = (new RoleResource($perfil->load('permissions')))->toArray(request())['permissions'];
        $permissoes = array_column($lista, 'module_enabled', 'slug');

        $this->assertSame(['contracts.view' => true, 'finance.view' => false], $permissoes);
    }

    public function test_religar_o_modulo_tira_a_marca(): void
    {
        Module::where('alias', 'finance')->update(['enabled' => true]);
        $this->esquecerMemo();

        $this->assertTrue($this->permissao('finance.view')['module_enabled']);
    }
}
