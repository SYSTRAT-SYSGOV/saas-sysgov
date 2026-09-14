<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Services\ModuleRoleProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Provisão automática de roles/permissions específicas de um módulo quando
 * ele é habilitado para um tenant — cada módulo pode ter suas próprias
 * roles-template (marcadas com roles.module = <alias>), clonadas sob
 * demanda para o tenant que habilita aquele módulo.
 */
final class ModuleRoleProvisionerTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $sysTenant;
    private Tenant $clienteTenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sysTenant = Tenant::create([
            'name' => 'SYSTRAT (Sistema)', 'slug' => 'systrat', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active',
        ]);

        $this->clienteTenant = Tenant::create([
            'name' => 'Município Cliente Teste', 'slug' => 'municipio-cliente-teste', 'type' => 'prefeitura', 'status' => 'active',
        ]);

        $perm = Permission::create(['name' => 'Visualizar Módulo X', 'slug' => 'modx.view', 'module' => 'modx', 'guard_name' => 'web']);

        $template = Role::create([
            'name' => 'Papel do Módulo X', 'slug' => 'papel_modx', 'scope' => 'tenant',
            'module' => 'modx', 'is_system' => true, 'guard_name' => 'web', 'tenant_id' => $this->sysTenant->id,
        ]);
        $template->permissions()->sync([$perm->id]);
    }

    public function test_clona_as_roles_do_modulo_para_o_tenant_que_habilita(): void
    {
        $qtd = app(ModuleRoleProvisioner::class)->provisionForTenant($this->clienteTenant, 'modx');

        $this->assertSame(1, $qtd);

        $clonada = Role::where('slug', 'papel_modx')->where('tenant_id', $this->clienteTenant->id)->first();
        $this->assertNotNull($clonada);
        $this->assertSame('tenant', $clonada->scope);
        $this->assertTrue($clonada->permissions()->where('slug', 'modx.view')->exists());
    }

    public function test_e_idempotente(): void
    {
        app(ModuleRoleProvisioner::class)->provisionForTenant($this->clienteTenant, 'modx');
        $qtdSegundaChamada = app(ModuleRoleProvisioner::class)->provisionForTenant($this->clienteTenant, 'modx');

        $this->assertSame(0, $qtdSegundaChamada);
        $this->assertSame(1, Role::where('slug', 'papel_modx')->where('tenant_id', $this->clienteTenant->id)->count());
    }

    public function test_modulo_sem_roles_template_nao_clona_nada_e_nao_falha(): void
    {
        $qtd = app(ModuleRoleProvisioner::class)->provisionForTenant($this->clienteTenant, 'modulo-inexistente');

        $this->assertSame(0, $qtd);
    }

    public function test_nao_afeta_roles_de_outro_modulo(): void
    {
        $outroTemplate = Role::create([
            'name' => 'Papel do Módulo Y', 'slug' => 'papel_mody', 'scope' => 'tenant',
            'module' => 'mody', 'is_system' => true, 'guard_name' => 'web', 'tenant_id' => $this->sysTenant->id,
        ]);

        app(ModuleRoleProvisioner::class)->provisionForTenant($this->clienteTenant, 'modx');

        $this->assertNull(Role::where('slug', 'papel_mody')->where('tenant_id', $this->clienteTenant->id)->first());
    }
}
