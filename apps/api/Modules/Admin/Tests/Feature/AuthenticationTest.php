<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_an_associated_tenant(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant Login', 'slug' => 'tenant-login', 'type' => 'prefeitura', 'status' => 'active']);
        $user = User::create(['name' => 'User Login', 'email' => 'login@sysgov.local', 'password' => 'password-strong-123', 'is_platform_admin' => false]);
        $user->tenants()->attach($tenant->id);

        $response = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password-strong-123', 'tenant_slug' => $tenant->slug]);

        $response->assertOk()->assertJsonPath('tenant.slug', 'tenant-login')->assertJsonStructure(['token', 'user', 'tenant']);
    }

    public function test_regular_user_cannot_access_platform_admin_routes(): void
    {
        $user = User::create(['name' => 'Regular User', 'email' => 'regular@sysgov.local', 'password' => 'password-strong-123', 'is_platform_admin' => false]);

        $this->actingAs($user)->getJson('/api/admin/tenants')->assertForbidden();
    }
}
