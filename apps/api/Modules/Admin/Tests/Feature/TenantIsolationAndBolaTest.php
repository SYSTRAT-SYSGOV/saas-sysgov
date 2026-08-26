<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\SaasContract;
use Modules\Admin\Tests\TestCase;

final class TenantIsolationAndBolaTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_aware_model_scopes_queries_to_active_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        SaasContract::factory()->create(['tenant_id' => $tenantA->id, 'number' => 'CT-A']);
        SaasContract::factory()->create(['tenant_id' => $tenantB->id, 'number' => 'CT-B']);

        app()->make(\App\Support\TenantContext::class)->set($tenantA);

        $contracts = SaasContract::all();

        $this->assertCount(1, $contracts);
        $this->assertEquals('CT-A', $contracts->first()->number);
    }

    public function test_user_cannot_access_other_tenant_object_directly_bola_check(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $user = User::factory()->create(['is_platform_admin' => false]);
        $contractB = SaasContract::factory()->create(['tenant_id' => $tenantB->id]);

        $response = $this->actingAs($user)->getJson("/api/admin/saas-contracts/{$contractB->id}");

        $response->assertStatus(403);
    }
}
