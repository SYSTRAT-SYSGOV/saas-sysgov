<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;

final class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_user_with_valid_token_cannot_create_tenant(): void
    {
        $user = User::create(['name' => 'Regular', 'email' => 'regular-auth@sysgov.local', 'password' => 'password-strong-123', 'is_platform_admin' => false]);

        $this->actingAs($user, 'sanctum')->postJson('/api/admin/tenants', [
            'name' => 'Tenant Novo', 'slug' => 'tenant-novo', 'type' => 'prefeitura',
        ])->assertForbidden();
    }

    public function test_platform_admin_can_create_tenant(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin-auth@sysgov.local', 'password' => 'password-strong-123', 'is_platform_admin' => true]);

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/tenants', [
            'name' => 'Tenant Admin', 'slug' => 'tenant-admin', 'type' => 'prefeitura', 'status' => 'active',
        ])->assertCreated()->assertJsonPath('slug', 'tenant-admin');
    }

    public function test_policies_require_platform_admin(): void
    {
        $user = User::create(['name' => 'Common', 'email' => 'common@sysgov.local', 'password' => 'password-strong-123', 'is_platform_admin' => false]);
        $tenant = Tenant::create(['name' => 'T', 'slug' => 't-auth', 'type' => 'prefeitura']);
        $module = Module::create(['name' => 'Financeiro', 'alias' => 'finance']);

        self::assertTrue(Gate::forUser($user)->denies('create', Tenant::class));
        self::assertTrue(Gate::forUser($user)->denies('update', $tenant));
        self::assertTrue(Gate::forUser($user)->denies('toggle', $module));
    }

    public function test_admin_cannot_suspend_or_delete_itself(): void
    {
        $admin = User::create(['name' => 'Self Admin', 'email' => 'self-admin@sysgov.local', 'password' => 'password-strong-123', 'is_platform_admin' => true]);

        self::assertTrue(Gate::forUser($admin)->denies('suspend', $admin));
        self::assertTrue(Gate::forUser($admin)->denies('delete', $admin));

        $other = User::create(['name' => 'Other', 'email' => 'other@sysgov.local', 'password' => 'password-strong-123', 'is_platform_admin' => false]);
        self::assertTrue(Gate::forUser($admin)->allows('suspend', $other));
    }
}
