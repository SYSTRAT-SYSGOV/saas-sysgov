<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\User;
use App\Services\MfaService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;
use PragmaRX\Google2FA\Google2FA;

final class MfaRequirementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    public function test_login_without_mfa_configured_is_blocked_for_privileged_role(): void
    {
        $admin = User::create(['name' => 'Admin MFA', 'email' => 'mfa-admin@sysgov.test', 'password' => 'StrongPass!123', 'is_platform_admin' => true, 'is_active' => true]);

        $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'StrongPass!123'])
            ->assertStatus(403)
            ->assertJsonPath('error_code', 'MFA_REQUIRED');
    }

    public function test_login_requires_mfa_code_when_configured(): void
    {
        $admin = User::create(['name' => 'Admin MFA 2', 'email' => 'mfa-admin2@sysgov.test', 'password' => 'StrongPass!123', 'is_platform_admin' => true, 'is_active' => true]);

        $mfa = app(MfaService::class);
        $data = $mfa->enable($admin);
        $code = (new Google2FA())->getCurrentOtp($data['secret']);
        $this->assertTrue($mfa->confirm($admin, $code));

        $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'StrongPass!123'])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'MFA_CODE_REQUIRED');
    }

    public function test_login_succeeds_with_valid_mfa_code(): void
    {
        $admin = User::create(['name' => 'Admin MFA 3', 'email' => 'mfa-admin3@sysgov.test', 'password' => 'StrongPass!123', 'is_platform_admin' => true, 'is_active' => true]);

        $mfa = app(MfaService::class);
        $data = $mfa->enable($admin);
        $code = (new Google2FA())->getCurrentOtp($data['secret']);
        $this->assertTrue($mfa->confirm($admin, $code));

        $freshCode = (new Google2FA())->getCurrentOtp($data['secret']);

        $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'StrongPass!123', 'mfa_code' => $freshCode])
            ->assertOk()
            ->assertJsonStructure(['token', 'user', 'tenant']);
    }

    public function test_regular_user_login_is_not_blocked_by_mfa(): void
    {
        $user = User::create(['name' => 'Comum', 'email' => 'comum@sysgov.test', 'password' => 'StrongPass!123', 'is_platform_admin' => false, 'is_active' => true]);
        $tenant = \App\Models\Tenant::create(['name' => 'Pref', 'slug' => 'pref-mfa', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);
        $user->tenants()->attach($tenant->id, ['status' => 'active']);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'StrongPass!123', 'tenant_slug' => 'pref-mfa'])
            ->assertOk();
    }
}
