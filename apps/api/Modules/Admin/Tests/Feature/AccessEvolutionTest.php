<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\ModuleAccessService;
use App\Models\AuditLog;
use App\Models\OutboxEvent;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Modules\Admin\Tests\TestCase;

/**
 * Fase F — regressão da evolução Usuários & Acessos (RN-ACC-001/002/003/005).
 */
final class AccessEvolutionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);
    }

    private function tenant(): Tenant
    {
        return Tenant::create(['name' => 'Prefeitura Acessos', 'slug' => 'pref-acessos', 'type' => 'prefeitura', 'status' => 'active']);
    }

    private function member(string $email): User
    {
        return User::create(['name' => 'Membro', 'email' => $email, 'password' => 'StrongPass!123', 'is_active' => true]);
    }

    // ==== RN-ACC-001: vigência ====

    public function test_access_expired_does_not_grant_access(): void
    {
        $tenant = $this->tenant();
        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = $this->member('expira@teste.gov');
        $service = app(ModuleAccessService::class);

        $access = $service->grantAccess($user, $tenant->id, 'org', [
            'role' => 'viewer', 'org_unit_ids' => null, 'can_manage_users' => false,
            'valid_from' => now()->subDays(60), 'valid_to' => now()->subDays(1),
        ], $grantor);

        $this->assertFalse($access->isActive());
        $this->assertFalse($service->hasModuleAccess($user, 'org', $tenant->id));
    }

    public function test_access_with_valid_validity_grants_access_and_reports_expiring(): void
    {
        $tenant = $this->tenant();
        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = $this->member('valido@teste.gov');
        $service = app(ModuleAccessService::class);

        $access = $service->grantAccess($user, $tenant->id, 'contracts', [
            'role' => 'editor', 'org_unit_ids' => null, 'can_manage_users' => true,
            'valid_from' => now(), 'valid_to' => now()->addDays(15),
        ], $grantor);

        $this->assertTrue($access->isActive());
        $this->assertTrue($access->isExpiring(30));
        $this->assertTrue($service->hasModuleAccess($user, 'contracts', $tenant->id));
        $this->assertTrue($service->canManageUsersInModule($user, 'contracts', $tenant->id));
    }

    // ==== RN-ACC-005: revogação lógica ====

    public function test_revoke_is_logical_and_preserves_history(): void
    {
        $tenant = $this->tenant();
        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = $this->member('revogado@teste.gov');
        $service = app(ModuleAccessService::class);

        $access = $service->grantAccess($user, $tenant->id, 'finance', ['role' => 'viewer'], $grantor);
        $accessId = $access->id;

        $service->revokeAccess($access, $grantor, 'Teste de revogação');

        $this->assertSame(UserModuleAccess::STATUS_REVOKED, UserModuleAccess::find($accessId)->status);
        $this->assertFalse($service->hasModuleAccess($user, 'finance', $tenant->id));
    }

    public function test_renew_reactivates_revoked_access(): void
    {
        $tenant = $this->tenant();
        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = $this->member('renovado@teste.gov');
        $service = app(ModuleAccessService::class);

        $access = $service->grantAccess($user, $tenant->id, 'finance', ['role' => 'viewer'], $grantor);
        $service->revokeAccess($access, $grantor);
        $service->renewAccess($access->fresh(), now()->addDays(45));

        $this->assertTrue($access->fresh()->isActive());
        $this->assertTrue($service->hasModuleAccess($user, 'finance', $tenant->id));
    }

    // ==== RN-ACC-002: delegação ====

    public function test_module_admin_cannot_grant_outside_his_scope(): void
    {
        $tenant = $this->tenant();
        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = $this->member('alvo@teste.gov');
        $service = app(ModuleAccessService::class);

        // Unidades reais para o escopo ABAC
        $unitA = \Modules\OrgChart\Models\OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Secretaria A', 'code' => 'SEC-A', 'type' => 'secretaria', 'level' => 1, 'path' => '1']);
        $unitB = \Modules\OrgChart\Models\OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Secretaria B', 'code' => 'SEC-B', 'type' => 'secretaria', 'level' => 1, 'path' => '2']);

        // Concede ao "admin de módulo" acesso a "org" com escopo restrito à unidade A
        $service->grantAccess($user, $tenant->id, 'org', [
            'role' => 'admin', 'org_unit_ids' => [$unitA->id], 'can_manage_users' => true,
        ], $grantor);

        // Não pode conceder "org" em unidade fora do escopo (ex.: unidade B)
        $this->assertFalse($service->canGrantTo($user, 'org', $tenant->id, [$unitB->id]));
        // Não pode conceder outro módulo que não administra
        $this->assertFalse($service->canGrantTo($user, 'contracts', $tenant->id, [$unitA->id]));
        // Pode conceder dentro do escopo
        $this->assertTrue($service->canGrantTo($user, 'org', $tenant->id, [$unitA->id]));
    }

    // ==== RN-ACC-003: auditoria ====

    public function test_grant_and_revoke_are_audited(): void
    {
        $tenant = $this->tenant();
        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = $this->member('audit@teste.gov');
        $service = app(ModuleAccessService::class);

        $before = AuditLog::count();
        $access = $service->grantAccess($user, $tenant->id, 'procurement', ['role' => 'viewer'], $grantor);
        $service->revokeAccess($access, $grantor, 'motivo');

        $this->assertGreaterThan($before, AuditLog::count());
        $this->assertSame(1, AuditLog::where('action', 'access.granted')->count());
        $this->assertSame(1, AuditLog::where('action', 'access.revoked')->count());
    }

    // ==== Fase C: job de expiração + Outbox ====

    public function test_expire_access_job_marks_expired_and_publishes_outbox(): void
    {
        $tenant = $this->tenant();
        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = $this->member('job@teste.gov');
        $service = app(ModuleAccessService::class);

        $service->grantAccess($user, $tenant->id, 'org', [
            'role' => 'viewer', 'valid_to' => now()->subDay(),
        ], $grantor);

        $this->assertSame(0, OutboxEvent::count());
        Artisan::call('sysgov:expire-access');

        $this->assertSame(UserModuleAccess::STATUS_EXPIRED, UserModuleAccess::first()->status);
        $this->assertGreaterThan(0, OutboxEvent::where('event_type', 'notification.access_expired')->count());
    }

    // ==== Isolamento multi-tenant (RN-CORE-001) ====

    public function test_access_is_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'type' => 'prefeitura', 'status' => 'active']);
        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = $this->member('isolado@teste.gov');
        $service = app(ModuleAccessService::class);

        $service->grantAccess($user, $tenantA->id, 'org', ['role' => 'viewer'], $grantor);

        $this->assertSame(1, UserModuleAccess::where('tenant_id', $tenantA->id)->count());
        $this->assertSame(0, UserModuleAccess::where('tenant_id', $tenantB->id)->count());
        $this->assertFalse($service->hasModuleAccess($user, 'org', $tenantB->id));
    }
}