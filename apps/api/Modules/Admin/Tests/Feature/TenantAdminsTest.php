<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Modules\Admin\Tests\TestCase;

/**
 * Múltiplos administradores por tenant (change permitir-multiplos-admins-por-tenant).
 */
final class TenantAdminsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->tenant = Tenant::create(['name' => 'Prefeitura Multi', 'slug' => 'pref-multi', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);
    }

    private function platformAdmin(): User
    {
        return User::where('is_platform_admin', true)->firstOrFail();
    }

    /** @return array<string, string> */
    private function payload(string $email, string $name = 'Admin'): array
    {
        return ['name' => $name, 'email' => $email, 'password' => 'StrongPass!123', 'password_confirmation' => 'StrongPass!123'];
    }

    private function createAdmin(string $email, ?Tenant $tenant = null): User
    {
        $tenant ??= $this->tenant;
        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->id}/users/admin", $this->payload($email))
            ->assertCreated();

        return User::where('email', $email)->firstOrFail();
    }

    private function linkStatus(User $user): ?string
    {
        $status = DB::table('tenant_user')->where('user_id', $user->id)->where('tenant_id', $this->tenant->id)->value('status');

        return is_string($status) ? $status : null;
    }

    private function asTenantUser(User $user): static
    {
        return $this->actingAs($user, 'sanctum')->withHeader('X-Tenant-Slug', $this->tenant->slug);
    }

    public function test_tenant_can_have_several_admins_and_they_are_listed(): void
    {
        $this->createAdmin('a1@multi.test');
        $this->createAdmin('a2@multi.test');
        $this->createAdmin('a3@multi.test');

        $response = $this->actingAs($this->platformAdmin(), 'sanctum')
            ->getJson("/api/admin/tenants/{$this->tenant->id}/users/admins")
            ->assertOk();

        /** @var list<array<string, mixed>> $rows */
        $rows = $response->json('data');
        $emails = array_column($rows, 'email');
        sort($emails);

        $this->assertCount(3, $rows);
        $this->assertSame(['a1@multi.test', 'a2@multi.test', 'a3@multi.test'], $emails);
        $this->assertTrue(AuditLog::where('action', 'tenant_admin.created')->count() >= 3);
    }

    public function test_same_email_twice_in_same_tenant_returns_409(): void
    {
        $this->createAdmin('dup@multi.test');

        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->postJson("/api/admin/tenants/{$this->tenant->id}/users/admin", $this->payload('dup@multi.test'))
            ->assertStatus(409)
            ->assertJsonPath('message', 'Este administrador já está cadastrado neste tenant.');
    }

    public function test_existing_user_from_another_tenant_is_reused_without_changing_password(): void
    {
        $other = Tenant::create(['name' => 'Outra Prefeitura', 'slug' => 'outra', 'cnpj' => '98765432000199', 'type' => 'prefeitura', 'status' => 'active']);
        $existing = $this->createAdmin('shared@multi.test', $other);
        $originalHash = $existing->fresh()->password;

        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->postJson("/api/admin/tenants/{$this->tenant->id}/users/admin", [
                'name' => 'Outro Nome', 'email' => 'shared@multi.test',
                'password' => 'OutraSenha!999', 'password_confirmation' => 'OutraSenha!999',
            ])
            ->assertCreated();

        $fresh = $existing->fresh();
        $this->assertSame($originalHash, $fresh->password, 'a senha existente não pode ser sobrescrita');
        $this->assertNotSame('Outro Nome', $fresh->name);
        $this->assertTrue(Hash::check('StrongPass!123', $fresh->password));
        $this->assertTrue($fresh->tenants()->where('tenants.id', $this->tenant->id)->exists());
        $this->assertTrue($fresh->tenants()->where('tenants.id', $other->id)->exists());
    }

    public function test_existing_user_does_not_need_name_or_password(): void
    {
        $other = Tenant::create(['name' => 'Outra Prefeitura', 'slug' => 'outra', 'cnpj' => '98765432000199', 'type' => 'prefeitura', 'status' => 'active']);
        $this->createAdmin('semsenha@multi.test', $other);

        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->postJson("/api/admin/tenants/{$this->tenant->id}/users/admin", ['email' => 'semsenha@multi.test'])
            ->assertCreated();
    }

    public function test_new_user_requires_name_and_password(): void
    {
        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->postJson("/api/admin/tenants/{$this->tenant->id}/users/admin", ['email' => 'novo@multi.test'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'password']);
    }

    public function test_platform_account_cannot_become_tenant_admin(): void
    {
        $platform = $this->platformAdmin();

        $this->actingAs($platform, 'sanctum')
            ->postJson("/api/admin/tenants/{$this->tenant->id}/users/admin", $this->payload($platform->email))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_update_targets_a_specific_admin(): void
    {
        $a1 = $this->createAdmin('u1@multi.test');
        $a2 = $this->createAdmin('u2@multi.test');
        $name2 = $a2->name;

        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->putJson("/api/admin/tenants/{$this->tenant->id}/users/admin/{$a1->id}", ['name' => 'Renomeado'])
            ->assertOk();

        $this->assertSame('Renomeado', $a1->fresh()->name);
        $this->assertSame($name2, $a2->fresh()->name);
        $this->assertTrue(AuditLog::where('action', 'tenant_admin.updated')->exists());
    }

    public function test_update_of_user_that_is_not_admin_of_tenant_returns_404(): void
    {
        $this->createAdmin('u1@multi.test');
        $stranger = User::create(['name' => 'Estranho', 'email' => 'estranho@multi.test', 'password' => 'StrongPass!123', 'is_active' => true]);

        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->putJson("/api/admin/tenants/{$this->tenant->id}/users/admin/{$stranger->id}", ['name' => 'X'])
            ->assertNotFound();
    }

    public function test_update_without_id_is_ambiguous_with_two_admins_but_works_with_one(): void
    {
        $a1 = $this->createAdmin('l1@multi.test');

        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->putJson("/api/admin/tenants/{$this->tenant->id}/users/admin", ['name' => 'Unico'])
            ->assertOk();
        $this->assertSame('Unico', $a1->fresh()->name);

        $this->createAdmin('l2@multi.test');

        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->putJson("/api/admin/tenants/{$this->tenant->id}/users/admin", ['name' => 'Ambiguo'])
            ->assertUnprocessable();
        $this->assertSame('Unico', $a1->fresh()->name);
    }

    public function test_update_without_any_admin_returns_404(): void
    {
        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->putJson("/api/admin/tenants/{$this->tenant->id}/users/admin", ['name' => 'Ninguem'])
            ->assertNotFound();
    }

    public function test_tenant_admin_can_register_another_admin_in_web_client(): void
    {
        $a1 = $this->createAdmin('c1@multi.test');

        $this->asTenantUser($a1)
            ->postJson('/api/users', array_merge($this->payload('c2@multi.test', 'Segundo'), ['role_slug' => 'admin_tenant']))
            ->assertCreated();

        $c2 = User::where('email', 'c2@multi.test')->firstOrFail();
        $this->assertTrue($c2->roles()->where('slug', 'admin_tenant')->exists());
    }

    public function test_non_admin_cannot_assign_admin_role(): void
    {
        $this->createAdmin('c1@multi.test');
        $member = User::create(['name' => 'Membro', 'email' => 'membro@multi.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $member->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->asTenantUser($member)
            ->postJson('/api/users', array_merge($this->payload('c3@multi.test'), ['role_slug' => 'admin_tenant']))
            ->assertForbidden();
    }

    public function test_cannot_deactivate_the_only_active_admin(): void
    {
        $only = $this->createAdmin('only@multi.test');

        $this->asTenantUser($only)
            ->postJson("/api/users/{$only->id}/deactivate", ['reason' => 'Teste de desativação do último'])
            ->assertUnprocessable();

        $this->assertSame('active', $this->linkStatus($only));
    }

    public function test_can_deactivate_one_of_two_admins(): void
    {
        $a1 = $this->createAdmin('d1@multi.test');
        $a2 = $this->createAdmin('d2@multi.test');

        $this->asTenantUser($a1)
            ->postJson("/api/users/{$a2->id}/deactivate", ['reason' => 'Saiu do órgão e perdeu acesso'])
            ->assertOk();

        $this->assertSame('inactive', $this->linkStatus($a2));
        $this->assertTrue(AuditLog::where('action', 'tenant_admin.deactivated')->exists());

        // Agora a1 é o último: não pode mais ser desativado
        $this->asTenantUser($a1)
            ->postJson("/api/users/{$a1->id}/deactivate", ['reason' => 'Tentativa de desativar o último'])
            ->assertUnprocessable();
    }

    public function test_cannot_unlink_or_inactivate_the_last_admin(): void
    {
        $only = $this->createAdmin('last@multi.test');

        $this->asTenantUser($only)->deleteJson("/api/users/{$only->id}")->assertUnprocessable();
        $this->asTenantUser($only)->putJson("/api/users/{$only->id}", ['is_active' => false])->assertUnprocessable();

        $this->assertTrue($only->fresh()->is_active);
        $this->assertTrue($only->tenants()->where('tenants.id', $this->tenant->id)->exists());
    }

    public function test_systrat_emergency_deactivation_of_last_admin_requires_reason_and_is_audited(): void
    {
        $only = $this->createAdmin('emerg@multi.test');
        $url = "/api/admin/tenants/{$this->tenant->id}/users/{$only->id}/deactivate";

        $this->actingAs($this->platformAdmin(), 'sanctum')->postJson($url, ['reason' => ''])->assertUnprocessable();
        $this->assertSame('active', $this->linkStatus($only));

        $this->actingAs($this->platformAdmin(), 'sanctum')
            ->postJson($url, ['reason' => 'Servidor desligado do órgão; acesso suspenso'])
            ->assertOk();

        $this->assertSame('inactive', $this->linkStatus($only));
        $log = AuditLog::where('action', 'tenant_admin.deactivated')->latest('id')->firstOrFail();
        $this->assertTrue((bool) data_get($log->after, 'emergency'));
    }

    public function test_second_admin_must_configure_mfa_on_first_login(): void
    {
        $this->createAdmin('m1@multi.test');
        $this->createAdmin('m2@multi.test');

        $this->postJson('/api/auth/login', ['email' => 'm2@multi.test', 'password' => 'StrongPass!123', 'tenant_slug' => $this->tenant->slug])
            ->assertForbidden()
            ->assertJsonPath('error_code', 'MFA_REQUIRED')
            ->assertJsonStructure(['mfa_setup_token']);
    }
}
