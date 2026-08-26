<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\User;
use App\Services\UserService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Modules\Admin\Tests\TestCase;

final class LastSuperAdminProtectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    public function test_cannot_deactivate_last_super_admin(): void
    {
        $superAdmin = User::where('is_platform_admin', true)->firstOrFail();
        $ops = User::create(['name' => 'Admin Ops', 'email' => 'ops@sysgov.test', 'password' => 'StrongPass!123', 'is_platform_admin' => false, 'is_systrat' => true, 'is_active' => true]);

        // admin_ops possui users.deactivate
        $opsRole = \App\Models\Role::where('slug', 'admin_ops')->firstOrFail();
        $ops->roles()->attach($opsRole->id);
        $systratTenant = \App\Models\Tenant::where('slug', 'systrat')->firstOrFail();
        $ops->tenants()->attach($systratTenant->id, ['role_id' => $opsRole->id, 'status' => 'active', 'is_primary' => true]);

        try {
            app(UserService::class)->deactivate($superAdmin, 'Teste de proteção do último super admin');
            $this->fail('Deveria lançar ValidationException.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('user', $e->errors());
        }

        $this->assertDatabaseHas('users', ['id' => $superAdmin->id, 'is_active' => true]);
    }

    public function test_can_deactivate_super_admin_when_another_is_active(): void
    {
        $superAdmin = User::where('is_platform_admin', true)->firstOrFail();
        User::create(['name' => 'Segundo Super', 'email' => 'super2@sysgov.test', 'password' => 'StrongPass!123', 'is_platform_admin' => true, 'is_active' => true]);

        app(UserService::class)->deactivate($superAdmin, 'Motivo legítimo de desativação');

        $this->assertDatabaseHas('users', ['id' => $superAdmin->id, 'is_active' => false]);
    }

    public function test_http_deactivation_of_last_super_admin_returns_422(): void
    {
        $superAdmin = User::where('is_platform_admin', true)->firstOrFail();
        $ops = User::create(['name' => 'Admin Ops 2', 'email' => 'ops2@sysgov.test', 'password' => 'StrongPass!123', 'is_platform_admin' => false, 'is_systrat' => true, 'is_active' => true]);
        $opsRole = \App\Models\Role::where('slug', 'admin_ops')->firstOrFail();
        $ops->roles()->attach($opsRole->id);

        $this->actingAs($ops, 'sanctum')
            ->postJson("/api/admin/users/{$superAdmin->id}/deactivate", ['reason' => 'Motivo de emergência na plataforma'])
            ->assertStatus(422);
    }
}
