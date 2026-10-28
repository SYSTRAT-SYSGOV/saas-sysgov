<?php

declare(strict_types=1);

namespace Modules\Client\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Client\Services\DashboardSummaryService;
use Modules\Client\Tests\TestCase;

/**
 * Cards da home do Cliente: o usuário só enxerga (e só pode ocultar) os de módulos que o tenant tem ativos,
 * e a escolha de ocultar não deixa passar alias de módulo que ele não acessa.
 */
final class DashboardCardsPreferenciasTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->tenant = Tenant::create(['name' => 'Prefeitura Cards', 'slug' => 'pref-cards', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $template = Role::where('slug', 'admin_tenant')->firstOrFail();
        $role = Role::create(['name' => 'Administrador do Tenant', 'slug' => 'admin_tenant', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        $this->user = User::create(['name' => 'Admin Cards', 'email' => 'admin.cards@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->user->roles()->syncWithoutDetaching([$role->id]);
        $this->user->tenants()->syncWithoutDetaching([$this->tenant->id => ['role_id' => $role->id, 'status' => 'active']]);

        // Contratados: pessoas e escola. Atas existe no catálogo, mas está desligada para o tenant. Cursos nem foi contratado.
        foreach (['pessoas' => true, 'escola' => true, 'ata' => false] as $alias => $ativo) {
            $modulo = Module::firstOrCreate(['alias' => $alias], ['name' => ucfirst($alias), 'enabled' => true]);
            $modulo->update(['enabled' => true]);
            $this->tenant->modules()->syncWithoutDetaching([$modulo->id => ['enabled' => $ativo]]);
        }
        Module::firstOrCreate(['alias' => 'cursos'], ['name' => 'Cursos', 'enabled' => true]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    /** @return list<string> */
    private function modulosDoCatalogo(): array
    {
        return array_column(app(DashboardSummaryService::class)->catalogo($this->user), 'module');
    }

    public function test_catalogo_lista_so_modulos_ativos_no_tenant_mesmo_para_admin_do_tenant(): void
    {
        $this->assertEqualsCanonicalizing(['pessoas', 'escola'], $this->modulosDoCatalogo());
    }

    public function test_ocultar_descarta_modulo_sem_acesso(): void
    {
        $gravado = app(DashboardSummaryService::class)->definirOcultos($this->user, ['escola', 'ata', 'cursos', 'inexistente']);

        $this->assertSame(['escola'], $gravado);
        $this->assertSame(['escola'], $this->user->fresh()?->getAttribute('dashboard_hidden_cards'));
    }

    public function test_salvar_aqui_nao_apaga_o_que_o_usuario_ocultou_em_modulo_de_outro_tenant(): void
    {
        $this->user->forceFill(['dashboard_hidden_cards' => ['cursos', 'pessoas']])->save();

        $gravado = app(DashboardSummaryService::class)->definirOcultos($this->user, ['escola']);

        // 'cursos' não é acessível neste tenant: continua como estava. 'pessoas' é, e não veio na lista: volta a aparecer.
        $this->assertEqualsCanonicalizing(['escola', 'cursos'], $gravado);
    }

    public function test_home_nao_traz_o_card_oculto_e_traz_o_que_ficou_visivel(): void
    {
        $servico = app(DashboardSummaryService::class);

        $antes = array_merge([], ...array_column($servico->para($this->user), 'cards'));
        $this->assertContains('pessoas', array_column($antes, 'module'));

        $servico->definirOcultos($this->user, ['pessoas']);
        $depois = array_merge([], ...array_column($servico->para($this->user), 'cards'));

        $this->assertNotContains('pessoas', array_column($depois, 'module'));
    }

    public function test_catalogo_marca_o_que_esta_oculto(): void
    {
        app(DashboardSummaryService::class)->definirOcultos($this->user, ['pessoas']);

        $marcas = array_column(app(DashboardSummaryService::class)->catalogo($this->user), 'hidden', 'module');

        $this->assertTrue($marcas['pessoas']);
        $this->assertFalse($marcas['escola']);
    }
}
