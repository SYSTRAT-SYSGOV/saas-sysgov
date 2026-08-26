<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class SupportReadOnlyTest extends TestCase
{
    use RefreshDatabase;

    private User $support;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $systrat = Tenant::where('slug', 'systrat')->firstOrFail();
        $suporteRole = Role::where('slug', 'suporte')->firstOrFail();

        $this->support = User::create([
            'name' => 'Suporte', 'email' => 'suporte@sysgov.test',
            'password' => 'StrongPass!123', 'is_platform_admin' => false, 'is_systrat' => true, 'is_active' => true,
        ]);
        $this->support->roles()->attach($suporteRole->id);
        $this->support->tenants()->attach($systrat->id, ['role_id' => $suporteRole->id, 'status' => 'active', 'is_primary' => true]);
    }

    public function test_support_can_view_systrat_users(): void
    {
        $this->actingAs($this->support, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertOk();
    }

    public function test_support_cannot_create_user(): void
    {
        $this->actingAs($this->support, 'sanctum')
            ->postJson('/api/admin/users', [
                'name' => 'Hacker', 'email' => 'hacker@sysgov.test',
                'password' => 'StrongPass!123', 'password_confirmation' => 'StrongPass!123',
                'role_slug' => 'admin_ops',
            ])
            ->assertForbidden();
    }

    public function test_support_cannot_deactivate_user(): void
    {
        $target = User::where('is_platform_admin', true)->firstOrFail();

        $this->actingAs($this->support, 'sanctum')
            ->postJson("/api/admin/users/{$target->id}/deactivate", ['reason' => 'Tentativa de escrita do suporte'])
            ->assertForbidden();
    }

    public function test_support_cannot_create_roles(): void
    {
        $this->actingAs($this->support, 'sanctum')
            ->postJson('/api/admin/roles', [
                'name' => 'Role Ilegal', 'slug' => 'role_ilegal', 'scope' => 'systrat',
            ])
            ->assertForbidden();
    }

    public function test_support_can_view_tenant_users(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Read', 'slug' => 'pref-read', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);

        $this->actingAs($this->support, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->id}/users")
            ->assertOk();
    }
}
