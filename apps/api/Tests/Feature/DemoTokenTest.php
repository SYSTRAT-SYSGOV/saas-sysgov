<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class DemoTokenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    public function test_demo_token_works_in_local(): void
    {
        $this->app['env'] = 'local';

        $this->withHeader('Authorization', 'Bearer universal-admin-session-token')
            ->getJson('/api/admin/tenants')
            ->assertOk();
    }

    public function test_demo_token_rejected_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->withHeader('Authorization', 'Bearer universal-admin-session-token')
            ->getJson('/api/admin/tenants')
            ->assertStatus(401);
    }

    public function test_demo_token_rejected_in_production_second_variant(): void
    {
        $this->app['env'] = 'production';

        $this->withHeader('Authorization', 'Bearer demo-admin-token')
            ->getJson('/api/admin/tenants')
            ->assertStatus(401);
    }

    public function test_platform_admin_with_real_token_still_works_in_production(): void
    {
        $this->app['env'] = 'production';

        $admin = User::where('is_platform_admin', true)->firstOrFail();
        // Em produção o EnsureMfa exige MFA configurado — simula um admin com MFA ativo
        $admin->forceFill(['mfa_enabled' => true, 'mfa_confirmed_at' => now()])->save();
        $token = $admin->createToken('sysgov-admin', ['api'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/tenants')
            ->assertOk();
    }
}