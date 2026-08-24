<?php

declare(strict_types=1);

namespace Modules\OrgChart\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgScopeService;
use Modules\OrgChart\Services\OrgTreeService;
use Modules\OrgChart\Services\OrgUserService;
use Modules\OrgChart\Tests\TestCase;
use Spatie\Permission\Models\Role;

final class OrgScopeAbacTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private OrgTreeService $treeService;
    private OrgUserService $userService;
    private OrgScopeService $scopeService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $this->treeService = app(OrgTreeService::class);
        $this->userService = app(OrgUserService::class);
        $this->scopeService = app(OrgScopeService::class);

        Role::findOrCreate('admin_tenant', 'web');
        Role::findOrCreate('responsavel', 'web');
        Role::findOrCreate('membro', 'web');
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_scope_all_user_has_unrestricted_access(): void
    {
        $user = User::create(['name' => 'Admin Municipal', 'email' => 'admin@araucaria.pr.gov.br', 'password' => 'secret']);
        $user->assignRole('admin_tenant');

        $allowedIds = $this->scopeService->getAllowedOrgUnitIds($user);

        self::assertNull($allowedIds, 'Usuários com scope_all ou admin_tenant devem ter acesso irrestrito (null).');
    }

    public function test_responsible_user_has_recursive_access_to_subtree(): void
    {
        // 1. Cria a Árvore
        $root = $this->treeService->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $secSaude = $this->treeService->createUnit(['name' => 'Secretaria de Saúde', 'code' => 'SMS', 'parent_id' => $root->id]);
        $deptVigilancia = $this->treeService->createUnit(['name' => 'Vigilância Sanitária', 'code' => 'DVS', 'parent_id' => $secSaude->id]);
        $divFiscalizacao = $this->treeService->createUnit(['name' => 'Divisão de Fiscalização', 'code' => 'DFF', 'parent_id' => $deptVigilancia->id]);
        
        $secEducacao = $this->treeService->createUnit(['name' => 'Secretaria de Educação', 'code' => 'SMED', 'parent_id' => $root->id]);

        // 2. Cria Secretário de Saúde com vínculo de 'responsavel'
        $secretario = User::create(['name' => 'Dr. Secretário', 'email' => 'secretario.saude@araucaria.pr.gov.br', 'password' => 'secret']);
        $secretario->assignRole('responsavel');
        $this->userService->linkUser($secSaude, $secretario->id, ['role' => 'responsavel', 'is_primary' => true]);

        // 3. Verifica que ele acessa SMS, DVS e DFF, mas NÃO SMED nem Gabinete
        $allowedIds = $this->scopeService->getAllowedOrgUnitIds($secretario);

        self::assertNotNull($allowedIds);
        self::assertContains($secSaude->id, $allowedIds);
        self::assertContains($deptVigilancia->id, $allowedIds);
        self::assertContains($divFiscalizacao->id, $allowedIds);
        self::assertNotContains($secEducacao->id, $allowedIds);
        self::assertNotContains($root->id, $allowedIds);
    }

    public function test_member_user_has_only_direct_unit_access(): void
    {
        $root = $this->treeService->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $sec = $this->treeService->createUnit(['name' => 'Secretaria', 'code' => 'SEC', 'parent_id' => $root->id]);
        $dept = $this->treeService->createUnit(['name' => 'Departamento', 'code' => 'DEP', 'parent_id' => $sec->id]);

        // Usuário membro apenas do Departamento
        $servidor = User::create(['name' => 'Servidor Operador', 'email' => 'servidor@araucaria.pr.gov.br', 'password' => 'secret']);
        $servidor->assignRole('membro');
        $this->userService->linkUser($dept, $servidor->id, ['role' => 'membro', 'is_primary' => true]);

        $allowedIds = $this->scopeService->getAllowedOrgUnitIds($servidor);

        self::assertNotNull($allowedIds);
        self::assertSame([$dept->id], $allowedIds);
    }
}
