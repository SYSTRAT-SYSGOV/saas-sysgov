<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Organization;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class HierarchyUniquenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_code_is_allowed_across_tenants_but_unique_within_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'pref-b', 'type' => 'prefeitura', 'status' => 'active']);
        $context = app(TenantContext::class);

        $context->set($tenantA);
        Organization::create(['name' => 'Secretaria de Saúde', 'code' => 'SES-001']);

        $context->set($tenantB);
        Organization::create(['name' => 'Secretaria de Saúde B', 'code' => 'SES-001']);
        self::assertSame(1, Organization::query()->count());

        $context->set($tenantA);
        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);
        try {
            Organization::create(['name' => 'Duplicada', 'code' => 'SES-001']);
        } finally {
            self::assertSame(1, Organization::query()->count());
            $context->clear();
        }
    }
}
