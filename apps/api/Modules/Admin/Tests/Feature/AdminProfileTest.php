<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Modules\Admin\Tests\TestCase;

/**
 * Perfil, senha e sessões do administrador (change substituir-mockups-do-admin-por-dados-reais).
 */
final class AdminProfileTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private string $currentCredential;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->currentCredential = $this->randomCredential();
        $this->admin = User::where('is_platform_admin', true)->firstOrFail();
        $this->admin->forceFill(['password' => $this->currentCredential])->save();
    }

    /** Credencial aleatória que cumpre a política, sem literais no código. */
    private function randomCredential(): string
    {
        return implode('', [chr(random_int(65, 90)), chr(random_int(97, 122)), bin2hex(random_bytes(6)), chr(random_int(48, 57)), chr(33)]);
    }

    /** @return array<string, string> */
    private function passwordPayload(string $new, ?string $current = null): array
    {
        return ['current_password' => $current ?? $this->currentCredential, 'password' => $new, 'password_confirmation' => $new];
    }

    public function test_updates_the_own_name_and_audits(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/admin/me/profile', ['name' => '  Novo Nome  '])
            ->assertOk()
            ->assertJsonPath('data.name', 'Novo Nome');

        $this->assertSame('Novo Nome', $this->admin->fresh()->name);
        $this->assertTrue(AuditLog::where('action', 'admin.profile_updated')->exists());
    }

    public function test_profile_requires_a_name(): void
    {
        $this->actingAs($this->admin, 'sanctum')->putJson('/api/admin/me/profile', ['name' => ''])->assertUnprocessable();
    }

    public function test_password_change_requires_the_correct_current_password(): void
    {
        $new = $this->randomCredential();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/me/password', $this->passwordPayload($new, $this->randomCredential()))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);

        $this->assertTrue(Hash::check($this->currentCredential, (string) $this->admin->fresh()->password));
    }

    public function test_password_change_enforces_the_password_policy(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/me/password', $this->passwordPayload(strtolower(bin2hex(random_bytes(5)))))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_password_change_succeeds_audits_and_revokes_other_sessions(): void
    {
        $this->admin->createToken('outro-dispositivo');
        $this->admin->createToken('mais-um');
        $new = $this->randomCredential();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/me/password', $this->passwordPayload($new))
            ->assertOk()
            ->assertJsonPath('sessions_revoked', 2);

        $fresh = $this->admin->fresh();
        $this->assertTrue(Hash::check($new, (string) $fresh->password));
        $this->assertSame(0, $fresh->tokens()->count());
        $this->assertTrue(AuditLog::where('action', 'admin.password_changed')->exists());
    }

    public function test_lists_only_own_sessions(): void
    {
        $this->admin->createToken('meu-navegador');
        $other = User::create(['name' => 'Outro', 'email' => 'outro@perfil.test', 'password' => $this->randomCredential(), 'is_active' => true]);
        $other->createToken('token-alheio');

        $names = array_column($this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/me/sessions')->assertOk()->json('data'), 'name');

        $this->assertContains('meu-navegador', $names);
        $this->assertNotContains('token-alheio', $names);
    }

    public function test_revokes_own_session(): void
    {
        $token = $this->admin->createToken('descartavel')->accessToken;

        $this->actingAs($this->admin, 'sanctum')->deleteJson('/api/admin/me/sessions/' . $token->getKey())->assertOk();

        $this->assertSame(0, $this->admin->tokens()->count());
        $this->assertTrue(AuditLog::where('action', 'admin.session_revoked')->exists());
    }

    public function test_cannot_revoke_a_session_of_another_user(): void
    {
        $other = User::create(['name' => 'Outro', 'email' => 'outro2@perfil.test', 'password' => $this->randomCredential(), 'is_active' => true]);
        $token = $other->createToken('alheio')->accessToken;

        $this->actingAs($this->admin, 'sanctum')->deleteJson('/api/admin/me/sessions/' . $token->getKey())->assertNotFound();

        $this->assertSame(1, $other->tokens()->count());
    }
}
