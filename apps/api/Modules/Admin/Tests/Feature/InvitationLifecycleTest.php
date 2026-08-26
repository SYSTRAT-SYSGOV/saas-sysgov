<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\Role;
use App\Models\User;
use App\Services\InvitationService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class InvitationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->admin = User::where('is_platform_admin', true)->firstOrFail();
    }

    private function inviteViaService(string $email, string $roleSlug): array
    {
        $role = Role::where('slug', $roleSlug)->firstOrFail();
        $invitation = app(InvitationService::class)->invite($email, $role, null, $this->admin);

        $event = OutboxEvent::where('event_type', 'UserInvited')->latest()->firstOrFail();

        return [$invitation, $event->payload['token']];
    }

    public function test_invitation_lifecycle_accept_works_and_second_accept_returns_409(): void
    {
        [, $token] = $this->inviteViaService('convite@sysgov.test', 'admin_ops');

        $first = $this->postJson('/api/admin/auth/accept-invitation', ['token' => $token]);
        $first->assertOk();

        $second = $this->postJson('/api/admin/auth/accept-invitation', ['token' => $token]);
        $second->assertStatus(409);
    }

    public function test_expired_invitation_returns_410(): void
    {
        [$invitation, $token] = $this->inviteViaService('expirado@sysgov.test', 'admin_ops');

        $invitation->forceFill(['expires_at' => now()->subHour()])->save();

        $this->postJson('/api/admin/auth/accept-invitation', ['token' => $token])
            ->assertStatus(410);
    }

    public function test_invalid_token_returns_422(): void
    {
        $this->postJson('/api/admin/auth/accept-invitation', ['token' => 'token-invalido'])
            ->assertStatus(422);
    }

    public function test_accept_links_user_to_tenant_when_invitation_has_tenant(): void
    {
        $tenant = \App\Models\Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);

        // A role admin_tenant do tenant é criada no onboarding; replica o template aqui
        $template = Role::where('slug', 'admin_tenant')->firstOrFail();
        $tenantRole = Role::create([
            'name' => 'Administrador do Tenant',
            'slug' => 'admin_tenant',
            'scope' => 'tenant',
            'tenant_id' => $tenant->id,
            'guard_name' => 'web',
            'is_system' => true,
        ]);
        $tenantRole->permissions()->sync($template->permissions()->pluck('permissions.id'));

        $invitation = app(InvitationService::class)->invite('admin-tenant@sysgov.test', $tenantRole, $tenant, $this->admin);
        $event = OutboxEvent::where('event_type', 'UserInvited')->latest()->firstOrFail();
        $token = $event->payload['token'];

        $this->postJson('/api/admin/auth/accept-invitation', ['token' => $token])->assertOk();

        $user = User::where('email', 'admin-tenant@sysgov.test')->firstOrFail();
        $this->assertTrue($user->tenants()->where('tenant_id', $tenant->id)->exists());
        $this->assertDatabaseHas('user_invitations', ['id' => $invitation->id]);
    }
}
