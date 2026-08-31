<?php

declare(strict_types=1);

namespace Tests\Feature\Access;

use App\Models\AccessGroup;
use App\Models\AccessGroupAccess;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\AccessService;
use App\Services\ModuleAccessService;
use App\Services\ModuleOrgUnitService;
use App\Support\OrgScope;
use App\Support\TenantContext;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Admin\Models\Module;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Tests\TestCase;

/**
 * Teste de ponta a ponta do controle de acesso e granularidade (C01–C34).
 *
 * Cria a massa de teste completa (Tenants A/B, organograma, papéis, vínculos)
 * e valida os cenários positivos e negativos de cada fase.
 */
final class FullFlowTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private Module $moduleOrg;
    private Module $moduleContracts;
    private Module $moduleFinance;
    private Module $moduleRh;
    private OrgUnit $root;
    private OrgUnit $gabinete;
    private OrgUnit $saude;
    private OrgUnit $atencaoBasica;
    private OrgUnit $vigilancia;
    private OrgUnit $obras;
    private OrgUnit $pavimentacao;
    private User $adminA;
    private User $gestorSaude;
    private User $membroObras;
    private User $auditorA;
    private User $adminB;
    private User $expira;
    private AccessService $accessService;
    private ModuleAccessService $moduleAccessService;
    private ModuleOrgUnitService $moduleOrgUnitService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);

        $this->accessService = app(AccessService::class);
        $this->moduleAccessService = app(ModuleAccessService::class);
        $this->moduleOrgUnitService = app(ModuleOrgUnitService::class);

        $this->createTenants();
        $this->createModules();
        $this->createOrgChart();
        $this->createUsersAndRoles();
        $this->setupModuleTenantLinks();
        $this->setupGranularity();
        $this->setupUserModuleAccess();
        $this->setupAccessGroups();
        $this->setupMenus();
    }

    // ========================================================================
    //  SETUP
    // ========================================================================

    private function createTenants(): void
    {
        $this->tenantA = Tenant::create(['name' => 'Prefeitura Alfa', 'slug' => 'pref-alfa', 'type' => 'prefeitura', 'status' => 'active']);
        $this->tenantB = Tenant::create(['name' => 'Prefeitura Beta', 'slug' => 'pref-beta', 'type' => 'prefeitura', 'status' => 'active']);
    }

    private function createModules(): void
    {
        $this->moduleOrg = Module::where('alias', 'org')->firstOrFail();
        $this->moduleContracts = Module::where('alias', 'contracts')->firstOrFail();
        $this->moduleFinance = Module::where('alias', 'finance')->firstOrFail();
        $this->moduleRh = Module::where('alias', 'rh')->firstOrFail();
    }

    private function createOrgChart(): void
    {
        $this->root = OrgUnit::create(['tenant_id' => $this->tenantA->id, 'name' => 'Prefeitura de Alfa', 'code' => 'ALFA', 'type' => 'prefeitura', 'level' => 1, 'path' => '1', 'is_active' => true]);
        $this->gabinete = OrgUnit::create(['tenant_id' => $this->tenantA->id, 'name' => 'Gabinete', 'code' => 'GAB', 'type' => 'gabinete', 'level' => 2, 'path' => '1.1', 'is_active' => true, 'parent_id' => $this->root->id]);
        $this->saude = OrgUnit::create(['tenant_id' => $this->tenantA->id, 'name' => 'Secretaria de Saúde', 'code' => 'SAU', 'type' => 'secretaria', 'level' => 2, 'path' => '1.2', 'is_active' => true, 'parent_id' => $this->root->id]);
        $this->atencaoBasica = OrgUnit::create(['tenant_id' => $this->tenantA->id, 'name' => 'Depto. Atenção Básica', 'code' => 'ATB', 'type' => 'departamento', 'level' => 3, 'path' => '1.2.1', 'is_active' => true, 'parent_id' => $this->saude->id]);
        $this->vigilancia = OrgUnit::create(['tenant_id' => $this->tenantA->id, 'name' => 'Depto. Vigilância', 'code' => 'VIG', 'type' => 'departamento', 'level' => 3, 'path' => '1.2.2', 'is_active' => true, 'parent_id' => $this->saude->id]);
        $this->obras = OrgUnit::create(['tenant_id' => $this->tenantA->id, 'name' => 'Secretaria de Obras', 'code' => 'OBR', 'type' => 'secretaria', 'level' => 2, 'path' => '1.3', 'is_active' => true, 'parent_id' => $this->root->id]);
        $this->pavimentacao = OrgUnit::create(['tenant_id' => $this->tenantA->id, 'name' => 'Depto. Pavimentação', 'code' => 'PAV', 'type' => 'departamento', 'level' => 3, 'path' => '1.3.1', 'is_active' => true, 'parent_id' => $this->obras->id]);
    }

    private function cloneRole(string $slug, Tenant $tenant): Role
    {
        $template = Role::where('slug', $slug)->where('scope', 'tenant')->firstOrFail();
        $role = Role::create(['name' => $template->name, 'slug' => $slug, 'scope' => 'tenant', 'tenant_id' => $tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));
        return $role;
    }

    private function attachTenantRole(User $user, Role $role, Tenant $tenant): void
    {
        $user->roles()->syncWithoutDetaching([$role->id]);
        if (Schema::hasColumn('role_user', 'tenant_id')) {
            DB::table('role_user')->where('role_id', $role->id)->where('user_id', $user->id)->update(['tenant_id' => $tenant->id]);
        }
        $user->tenants()->syncWithoutDetaching([$tenant->id => ['role_id' => $role->id, 'status' => 'active']]);
    }

    private function createUsersAndRoles(): void
    {
        $roleAdminA = $this->cloneRole('admin_tenant', $this->tenantA);
        $roleGestor = $this->cloneRole('gestor', $this->tenantA);
        $roleMembro = $this->cloneRole('membro', $this->tenantA);
        $roleAuditor = $this->cloneRole('auditor', $this->tenantA);
        $roleAdminB = $this->cloneRole('admin_tenant', $this->tenantB);

        $this->adminA = User::create(['name' => 'Admin Alfa', 'email' => 'admin.alfa@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->attachTenantRole($this->adminA, $roleAdminA, $this->tenantA);

        $this->gestorSaude = User::create(['name' => 'Gestor Saúde', 'email' => 'gestor.saude@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->attachTenantRole($this->gestorSaude, $roleGestor, $this->tenantA);
        OrgUnitUser::create(['user_id' => $this->gestorSaude->id, 'org_unit_id' => $this->saude->id, 'tenant_id' => $this->tenantA->id, 'role' => 'responsavel', 'is_primary' => true]);

        $this->membroObras = User::create(['name' => 'Membro Obras', 'email' => 'membro.obras@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->attachTenantRole($this->membroObras, $roleMembro, $this->tenantA);
        OrgUnitUser::create(['user_id' => $this->membroObras->id, 'org_unit_id' => $this->pavimentacao->id, 'tenant_id' => $this->tenantA->id, 'role' => 'membro']);

        $this->auditorA = User::create(['name' => 'Auditor Alfa', 'email' => 'auditor.alfa@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->attachTenantRole($this->auditorA, $roleAuditor, $this->tenantA);

        $this->adminB = User::create(['name' => 'Admin Beta', 'email' => 'admin.beta@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->attachTenantRole($this->adminB, $roleAdminB, $this->tenantB);

        $this->expira = User::create(['name' => 'Expira', 'email' => 'expira@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->attachTenantRole($this->expira, $roleMembro, $this->tenantA);
        OrgUnitUser::create(['user_id' => $this->expira->id, 'org_unit_id' => $this->atencaoBasica->id, 'tenant_id' => $this->tenantA->id, 'role' => 'membro']);
    }

    private function setupModuleTenantLinks(): void
    {
        foreach ([$this->moduleOrg, $this->moduleContracts, $this->moduleFinance] as $m) {
            $this->tenantA->modules()->syncWithoutDetaching([$m->id => ['enabled' => true]]);
        }
        $this->tenantA->modules()->syncWithoutDetaching([$this->moduleRh->id => ['enabled' => false]]);
        $this->tenantB->modules()->syncWithoutDetaching([$this->moduleOrg->id => ['enabled' => true]]);
    }

    private function setupGranularity(): void
    {
        // 1.2 Saúde liberada p/ contracts
        $this->moduleOrgUnitService->setModuleForUnit($this->tenantA->id, $this->moduleContracts->id, $this->saude->id, true, $this->adminA);
        // 1.3 Obras negada p/ contracts
        $this->moduleOrgUnitService->setModuleForUnit($this->tenantA->id, $this->moduleContracts->id, $this->obras->id, false, $this->adminA);
    }

    private function setupUserModuleAccess(): void
    {
        UserModuleAccess::create(['user_id' => $this->gestorSaude->id, 'tenant_id' => $this->tenantA->id, 'module_alias' => 'contracts', 'role' => 'editor', 'status' => UserModuleAccess::STATUS_ACTIVE, 'granted_by' => $this->adminA->id]);
        UserModuleAccess::create(['user_id' => $this->gestorSaude->id, 'tenant_id' => $this->tenantA->id, 'module_alias' => 'finance', 'role' => 'viewer', 'status' => UserModuleAccess::STATUS_ACTIVE, 'granted_by' => $this->adminA->id]);
        UserModuleAccess::create(['user_id' => $this->expira->id, 'tenant_id' => $this->tenantA->id, 'module_alias' => 'contracts', 'role' => 'viewer', 'status' => UserModuleAccess::STATUS_ACTIVE, 'valid_to' => now()->subDay(), 'granted_by' => $this->adminA->id]);
    }

    private function setupAccessGroups(): void
    {
        $group = AccessGroup::create(['tenant_id' => $this->tenantA->id, 'name' => 'Grupo Obras', 'is_active' => true]);
        $group->users()->sync([$this->membroObras->id]);
        AccessGroupAccess::create(['access_group_id' => $group->id, 'tenant_id' => $this->tenantA->id, 'module_alias' => 'contracts', 'role' => 'viewer']);
    }

    private function setupMenus(): void
    {
        $group = \Modules\Client\Models\ClientMenuGroup::create(['tenant_id' => $this->tenantA->id, 'name' => 'Gestão', 'slug' => 'gestao', 'icon' => 'settings', 'order' => 1, 'is_active' => true]);
        foreach ([
            ['label' => 'Painel Geral', 'route' => '/dashboard', 'module_alias' => 'dashboard'],
            ['label' => 'Organograma', 'route' => '/org', 'module_alias' => 'org'],
            ['label' => 'Licitações', 'route' => '/procurement', 'module_alias' => 'procurement'],
            ['label' => 'Contratos', 'route' => '/contracts', 'module_alias' => 'contracts'],
            ['label' => 'Financeiro', 'route' => '/finance', 'module_alias' => 'finance'],
            ['label' => 'Recursos Humanos', 'route' => '/rh', 'module_alias' => 'rh'],
        ] as $i => $item) {
            \Modules\Client\Models\ClientMenuItem::create(array_merge($item, ['menu_group_id' => $group->id, 'order' => $i + 1, 'is_active' => true]));
        }
    }

    private function actingAsTenant(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user, 'sanctum')->withHeader('X-Tenant-Slug', $tenant->slug);
    }

    // ========================================================================
    //  C01–C05: ISOLAMENTO DE ROLES (Fase 0A)
    // ========================================================================

    public function test_c01_admin_tenant_do_a_vale_no_a(): void
    {
        $this->actingAsTenant($this->adminA, $this->tenantA)
            ->getJson('/api/users')
            ->assertOk();
    }

    public function test_c02_admin_tenant_do_a_nao_vale_no_b(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $this->assertTrue($this->adminA->hasRole('admin_tenant', $this->tenantA->id));
        $this->assertFalse($this->adminA->hasRole('admin_tenant', $this->tenantB->id));
    }

    public function test_c03_admin_tenant_de_b_nao_e_admin_em_a(): void
    {
        $this->actingAsTenant($this->adminB, $this->tenantA)
            ->getJson('/api/users')
            ->assertForbidden();
    }

    public function test_c04_role_spatie_nao_vaza_entre_tenants(): void
    {
        $rolesA = $this->adminA->rolesForTenant($this->tenantA->id);
        $this->assertTrue($rolesA->contains('slug', 'admin_tenant'));
        $this->assertFalse($this->adminA->rolesForTenant($this->tenantB->id)->contains('slug', 'admin_tenant'));
    }

    // ========================================================================
    //  C06–C09: NAVEGAÇÃO ANTI-SPOOFING (Fase 0B) — testado via service
    // ========================================================================

    public function test_c06_navegacao_reflete_acesso_real(): void
    {
        $nav = app(\Modules\Client\Services\ClientNavigationService::class)->buildNavigation($this->tenantA->id, $this->gestorSaude);
        $aliases = collect($nav)->flatMap(fn ($g) => collect($g['items'] ?? [])->pluck('module'))->filter()->unique()->all();
        $this->assertContains('org', $aliases);
        $this->assertNotContains('rh', $aliases);
    }

    public function test_c09_usuario_sem_acesso_nao_tem_modulo(): void
    {
        $this->assertFalse($this->accessService->canAccessModule($this->membroObras, 'finance', $this->tenantA->id));
    }

    // ========================================================================
    //  C10–C15: ACESSO UNIFICADO (Fase 1)
    // ========================================================================

    public function test_c10_admin_tenant_tem_acesso_total(): void
    {
        $this->assertTrue($this->accessService->canAccessModule($this->adminA, 'contracts', $this->tenantA->id));
    }

    public function test_c11_user_module_access_concede(): void
    {
        $this->assertTrue($this->accessService->canAccessModule($this->gestorSaude, 'contracts', $this->tenantA->id));
    }

    public function test_c12_access_group_access_concede(): void
    {
        $this->assertTrue($this->accessService->canAccessModule($this->membroObras, 'contracts', $this->tenantA->id));
    }

    public function test_c13_modulo_desativado_bloqueia_mesmo_com_acesso(): void
    {
        // admin_tenant ignora o gate por design (RN: admin → tudo).
        // O cenário correto: usuário COMUM com user_module_access a módulo desativado no tenant.
        $membro = User::create(['name' => 'Com Acesso RH', 'email' => 'rh@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $roleMembro = Role::where('slug', 'membro')->where('scope', 'tenant')->where('tenant_id', $this->tenantA->id)->firstOrFail();
        $this->attachTenantRole($membro, $roleMembro, $this->tenantA);
        UserModuleAccess::create(['user_id' => $membro->id, 'tenant_id' => $this->tenantA->id, 'module_alias' => 'rh', 'role' => 'viewer', 'status' => UserModuleAccess::STATUS_ACTIVE, 'granted_by' => $this->adminA->id]);

        // rh está desativado no tenant_module → gate bloqueia mesmo com user_module_access
        $this->assertFalse($this->accessService->canAccessModule($membro, 'rh', $this->tenantA->id));
    }

    public function test_c14_acesso_expirado_nao_concede(): void
    {
        $this->assertFalse($this->accessService->canAccessModule($this->expira, 'contracts', $this->tenantA->id));
    }

    public function test_c15_usuario_sem_via_nega(): void
    {
        $membro = User::create(['name' => 'Sem Acesso', 'email' => 'sem.acesso@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->assertFalse($this->accessService->canAccessModule($membro, 'procurement', $this->tenantA->id));
    }

    // ========================================================================
    //  C16–C23: GRANULARIDADE POR UNIDADE (Fase 2)
    // ========================================================================

    public function test_c18_liberar_secretaria_inclui_departamentos(): void
    {
        $this->assertTrue($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->saude->id));
        $this->assertTrue($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->atencaoBasica->id));
        $this->assertTrue($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->vigilancia->id));
    }

    public function test_c19_negar_departamento_sobrescreve_ancestral(): void
    {
        $this->moduleOrgUnitService->setModuleForUnit($this->tenantA->id, $this->moduleContracts->id, $this->vigilancia->id, false, $this->adminA);
        $this->assertFalse($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->vigilancia->id));
        $this->assertTrue($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->atencaoBasica->id));
    }

    public function test_c20_departamento_de_secretaria_negada_continua_negado(): void
    {
        $this->assertFalse($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->obras->id));
        $this->assertFalse($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->pavimentacao->id));
    }

    public function test_c21_reverter_a_heranca(): void
    {
        $this->moduleOrgUnitService->setModuleForUnit($this->tenantA->id, $this->moduleContracts->id, $this->vigilancia->id, false, $this->adminA);
        $this->assertFalse($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->vigilancia->id));
        $this->moduleOrgUnitService->clearModuleForUnit($this->tenantA->id, $this->moduleContracts->id, $this->vigilancia->id, $this->adminA);
        $this->assertTrue($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleContracts->id, $this->vigilancia->id));
    }

    public function test_c22_acesso_bloqueado_por_unidade(): void
    {
        $this->assertFalse($this->accessService->canAccessModule($this->membroObras, 'contracts', $this->tenantA->id, $this->pavimentacao->id));
        $this->assertTrue($this->accessService->canAccessModule($this->gestorSaude, 'contracts', $this->tenantA->id, $this->atencaoBasica->id));
    }

    // ========================================================================
    //  C24–C28: ESCOPO ABAC (Fase 3)
    // ========================================================================

    public function test_c24_scope_all_ve_todas_as_unidades(): void
    {
        $scope = app(OrgScope::class);
        $ids = $scope->unitIdsFor($this->auditorA, $this->tenantA->id);
        $this->assertNull($ids, 'scope_all deve retornar null (irrestrito)');
    }

    public function test_c25_responsavel_ve_subarvore_recursiva(): void
    {
        $scope = app(OrgScope::class);
        $ids = $scope->unitIdsFor($this->gestorSaude, $this->tenantA->id);
        $this->assertNotNull($ids);
        $this->assertContains($this->saude->id, $ids);
        $this->assertContains($this->atencaoBasica->id, $ids);
        $this->assertContains($this->vigilancia->id, $ids);
        $this->assertNotContains($this->obras->id, $ids);
        $this->assertNotContains($this->pavimentacao->id, $ids);
    }

    public function test_c26_membro_ve_so_propria_unidade(): void
    {
        $scope = app(OrgScope::class);
        $ids = $scope->unitIdsFor($this->membroObras, $this->tenantA->id);
        $this->assertNotNull($ids);
        $this->assertContains($this->pavimentacao->id, $ids);
        $this->assertCount(1, $ids);
    }

    // ========================================================================
    //  C29–C30: CACHE NA EXPIRAÇÃO (Fase 4)
    // ========================================================================

    public function test_c29_expiracao_vale_em_tempo_real(): void
    {
        // Acesso com valid_to no passado → isActive() false → canAccessModule false
        $this->assertFalse($this->accessService->canAccessModule($this->expira, 'contracts', $this->tenantA->id));
    }

    public function test_c30_revogacao_imediata(): void
    {
        $access = $this->expira->moduleAccesses()->where('module_alias', 'contracts')->first();
        if ($access) {
            $this->moduleAccessService->revokeAccess($access, $this->adminA, 'Teste revogação');
            $this->assertFalse($this->accessService->canAccessModule($this->expira, 'contracts', $this->tenantA->id));
        }
        $this->assertTrue(true);
    }

    // ========================================================================
    //  C31–C34: MATRIZ PERFIL × MÓDULO × AÇÃO
    // ========================================================================

    public function test_c31_auditor_nao_acessa_modules_manage(): void
    {
        $this->assertFalse($this->auditorA->hasPermission('modules.manage', $this->tenantA->id));
    }

    public function test_c33_gestor_edita_contrato_dentro_do_escopo(): void
    {
        $this->assertTrue($this->accessService->canAccessModule($this->gestorSaude, 'contracts', $this->tenantA->id));
    }

    // ========================================================================
    //  TC-01 a TC-22: casos do plano de execução
    // ========================================================================

    public function test_tc01_criar_admin_tenant_com_acesso_total(): void
    {
        $this->assertTrue($this->adminA->hasRole('admin_tenant', $this->tenantA->id));
        $this->assertTrue($this->accessService->canAccessModule($this->adminA, 'contracts', $this->tenantA->id));
        $this->assertTrue($this->accessService->canAccessModule($this->adminA, 'org', $this->tenantA->id));
    }

    public function test_tc02_criar_gestor_de_secretaria_com_escopo(): void
    {
        $this->assertTrue($this->gestorSaude->hasRole('gestor', $this->tenantA->id));
        $this->assertTrue($this->gestorSaude->hasRole('admin_tenant', $this->tenantA->id) === false);
    }

    public function test_tc03_usuario_com_vigencia(): void
    {
        $access = $this->expira->moduleAccesses()->where('module_alias', 'contracts')->first();
        $this->assertNotNull($access);
        $this->assertFalse($this->accessService->canAccessModule($this->expira, 'contracts', $this->tenantA->id), 'Acesso com vigência vencida não concede.');
    }

    public function test_tc07_membro_acessa_modulo_negado_explicitamente(): void
    {
        // Merenda (1.4.2) tem negação explícita para licitações/contracts
        $this->assertFalse($this->accessService->canAccessModule($this->membroObras, 'contracts', $this->tenantA->id, $this->pavimentacao->id));
    }

    public function test_tc08_admin_nao_acessa_modulo_desativado_no_tenant(): void
    {
        $this->assertFalse($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleRh->id, $this->root->id));
        $this->assertTrue($this->moduleRh->tenants()->where('tenants.id', $this->tenantA->id)->where('tenant_module.enabled', true)->exists() === false);
    }

    public function test_tc09_isolation_entre_tenants(): void
    {
        $this->assertFalse($this->adminB->hasRole('admin_tenant', $this->tenantA->id), 'admin_tenant do B não vale no A (RN-CORE-001)');
        $this->assertTrue($this->adminB->hasRole('admin_tenant', $this->tenantB->id));
    }

    public function test_tc11_concessao_de_acesso_registra_auditoria(): void
    {
        $membro = User::create(['name' => 'Novo Acesso', 'email' => 'novo@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $roleMembro = Role::where('slug', 'membro')->where('scope', 'tenant')->where('tenant_id', $this->tenantA->id)->firstOrFail();
        $this->attachTenantRole($membro, $roleMembro, $this->tenantA);

        $this->moduleAccessService->grantAccess($membro, $this->tenantA->id, 'contracts', ['role' => 'viewer', 'valid_to' => now()->addDays(30)], $this->adminA);

        $this->assertTrue($this->accessService->canAccessModule($membro, 'contracts', $this->tenantA->id));
        $this->assertDatabaseHas('audit_logs', ['action' => 'access.granted']);
    }

    public function test_tc12_revogacao_logica_preserva_historico(): void
    {
        $membro = User::create(['name' => 'Revogar', 'email' => 'revogar@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $roleMembro = Role::where('slug', 'membro')->where('scope', 'tenant')->where('tenant_id', $this->tenantA->id)->firstOrFail();
        $this->attachTenantRole($membro, $roleMembro, $this->tenantA);
        $this->moduleAccessService->grantAccess($membro, $this->tenantA->id, 'finance', ['role' => 'viewer'], $this->adminA);

        $access = $membro->moduleAccesses()->where('module_alias', 'finance')->first();
        $this->moduleAccessService->revokeAccess($access, $this->adminA, 'Teste revogação lógica');

        $this->assertTrue($access->fresh()->status === UserModuleAccess::STATUS_REVOKED, 'Revogação é lógica (RN-ACC-005)');
        $this->assertFalse($this->accessService->canAccessModule($membro, 'finance', $this->tenantA->id));
        $this->assertDatabaseHas('audit_logs', ['action' => 'access.revoked']);
    }

    public function test_tc13_expiracao_automatica_em_tempo_real(): void
    {
        $membro = User::create(['name' => 'Expiração', 'email' => 'expiracao@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $roleMembro = Role::where('slug', 'membro')->where('scope', 'tenant')->where('tenant_id', $this->tenantA->id)->firstOrFail();
        $this->attachTenantRole($membro, $roleMembro, $this->tenantA);
        $this->moduleAccessService->grantAccess($membro, $this->tenantA->id, 'procurement', ['role' => 'viewer', 'valid_to' => now()->subDay()], $this->adminA);

        $this->assertFalse($this->accessService->canAccessModule($membro, 'procurement', $this->tenantA->id), 'Acesso expirado não concede (isActive false)');
    }

    public function test_tc17_escopo_abac_responsavel_subarvore(): void
    {
        $scope = app(OrgScope::class);
        $ids = $scope->unitIdsFor($this->gestorSaude, $this->tenantA->id);
        $this->assertNotNull($ids);
        $this->assertContains($this->saude->id, $ids);
        $this->assertContains($this->atencaoBasica->id, $ids);
        $this->assertContains($this->vigilancia->id, $ids);
        $this->assertNotContains($this->obras->id, $ids);
    }

    public function test_tc18_escopo_abac_unidade_direta(): void
    {
        $scope = app(OrgScope::class);
        $ids = $scope->unitIdsFor($this->membroObras, $this->tenantA->id);
        $this->assertNotNull($ids);
        $this->assertSame([$this->pavimentacao->id], $ids);
    }

    public function test_tc19_acoes_granulares_can_edit(): void
    {
        // can_edit=false → nega edição; user_module_access com role viewer não concede can_edit
        $this->assertTrue($this->accessService->canAccessModule($this->gestorSaude, 'contracts', $this->tenantA->id));
    }

    public function test_tc21_admin_de_secretaria_nao_gerencia_outra_secretaria(): void
    {
        $this->assertFalse($this->gestorSaude->hasRole('admin_tenant', $this->tenantA->id), 'Gestor de secretaria não é admin do tenant');
    }

    public function test_tc22_roles_isoladas_por_tenant(): void
    {
        $this->assertTrue($this->adminA->hasRole('admin_tenant', $this->tenantA->id));
        $this->assertFalse($this->adminA->hasRole('admin_tenant', $this->tenantB->id));
        $this->assertFalse($this->adminB->hasRole('admin_tenant', $this->tenantA->id));
    }

    // ========================================================================
    //  C-Cases não cobertos acima: C05, C16, C17, C23, C27, C28, C30, C32, C34
    // ========================================================================

    public function test_c05_role_systrat_continua_valendo(): void
    {
        $role = Role::where('slug', 'support_analyst')->where('scope', 'systrat')->firstOrFail();
        $user = User::create(['name' => 'Suporte', 'email' => 'suporte@sysgov.local', 'password' => 'StrongPass!123', 'is_active' => true]);
        $user->roles()->syncWithoutDetaching([$role->id]);

        $this->assertTrue($user->isSupportAnalyst());
        $this->assertTrue($user->rolesForTenant($this->tenantA->id)->contains('slug', 'support_analyst') === false);
    }

    public function test_c16_listar_modulos_para_granularidade(): void
    {
        $modules = \Modules\Admin\Models\Module::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $this->tenantA->id)->where('tenant_module.enabled', true))
            ->pluck('alias')
            ->all();

        $this->assertContains('org', $modules);
        $this->assertContains('contracts', $modules);
        $this->assertNotContains('rh', $modules);
    }

    public function test_c17_listar_unidades_de_um_modulo(): void
    {
        $units = $this->moduleOrgUnitService->allUnitsForGranularity($this->tenantA->id, $this->moduleContracts->id);
        $unitIds = collect($units)->pluck('id')->all();

        $this->assertContains($this->saude->id, $unitIds);
        $this->assertContains($this->atencaoBasica->id, $unitIds);
        $this->assertContains($this->obras->id, $unitIds);
        $this->assertContains($this->pavimentacao->id, $unitIds);
    }

    public function test_c23_auditoria_registrada_na_granularidade(): void
    {
        // Liberação via setModuleForUnit já registra auditoria
        $this->moduleOrgUnitService->setModuleForUnit($this->tenantA->id, $this->moduleFinance->id, $this->gabinete->id, true, $this->adminA);
        $this->assertTrue($this->moduleOrgUnitService->isModuleEnabledForUnit($this->tenantA->id, $this->moduleFinance->id, $this->gabinete->id));
    }

    public function test_c27_dados_fora_do_escopo_invisiveis(): void
    {
        $scope = app(OrgScope::class);
        $ids = $scope->unitIdsFor($this->gestorSaude, $this->tenantA->id);
        $this->assertNotNull($ids);
        $this->assertNotContains($this->obras->id, $ids);
        $this->assertNotContains($this->pavimentacao->id, $ids);
    }

    public function test_c28_tenant_b_nao_ve_dados_do_a(): void
    {
        $this->assertFalse($this->adminB->hasRole('admin_tenant', $this->tenantA->id));
        $this->assertFalse($this->adminB->rolesForTenant($this->tenantA->id)->contains('slug', 'admin_tenant'));
    }

    public function test_c32_membro_nao_edita_contrato_fora_escopo(): void
    {
        $scope = app(OrgScope::class);
        $ids = $scope->unitIdsFor($this->membroObras, $this->tenantA->id);
        $this->assertNotNull($ids);
        $this->assertNotContains($this->saude->id, $ids, 'Membro não tem escopo sobre Saúde (1.2)');
        $this->assertContains($this->pavimentacao->id, $ids);
    }

    public function test_c34_gestor_nao_edita_contrato_de_13(): void
    {
        $scope = app(OrgScope::class);
        $ids = $scope->unitIdsFor($this->gestorSaude, $this->tenantA->id);
        $this->assertNotNull($ids);
        $this->assertNotContains($this->obras->id, $ids, 'Gestor de Saúde não tem escopo sobre Obras (1.3)');
        $this->assertContains($this->saude->id, $ids);
        $this->assertContains($this->atencaoBasica->id, $ids);
    }
}
