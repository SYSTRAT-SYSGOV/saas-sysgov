<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\User;
use App\Services\UserService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Tests\TestCase;

final class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    public function test_forgot_password_generates_token_and_resets(): void
    {
        $user = User::create(['name' => 'Alvo Reset', 'email' => 'reset@sysgov.test', 'password' => 'StrongPass!123', 'is_active' => true]);

        // Solicita reset (resposta uniforme)
        $this->postJson('/api/auth/forgot-password', ['email' => 'reset@sysgov.test'])->assertOk();

        // Token vai para o outbox (RN-USR-010)
        $event = OutboxEvent::where('event_type', 'PasswordResetRequested')->latest()->firstOrFail();
        $token = $event->payload['token'];

        $this->assertDatabaseHas('password_reset_tokens', ['email' => 'reset@sysgov.test']);

        // Redefine com o token
        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'password' => 'NovaSenhaForte!123',
            'password_confirmation' => 'NovaSenhaForte!123',
        ])->assertOk();

        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('NovaSenhaForte!123', $user->fresh()->password));
    }

    public function test_expired_token_is_rejected(): void
    {
        User::create(['name' => 'Alvo Reset 2', 'email' => 'reset2@sysgov.test', 'password' => 'StrongPass!123', 'is_active' => true]);

        app(UserService::class)->requestPasswordReset('reset2@sysgov.test');

        DB::table('password_reset_tokens')->update(['expires_at' => now()->subMinute()]);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'token-expirado',
            'password' => 'NovaSenhaForte!123',
            'password_confirmation' => 'NovaSenhaForte!123',
        ])->assertStatus(422);
    }

    public function test_token_cannot_be_reused(): void
    {
        $user = User::create(['name' => 'Alvo Reset 3', 'email' => 'reset3@sysgov.test', 'password' => 'StrongPass!123', 'is_active' => true]);

        app(UserService::class)->requestPasswordReset('reset3@sysgov.test');
        $event = OutboxEvent::where('event_type', 'PasswordResetRequested')->latest()->firstOrFail();
        $token = $event->payload['token'];

        $payload = [
            'token' => $token,
            'password' => 'NovaSenhaForte!123',
            'password_confirmation' => 'NovaSenhaForte!123',
        ];

        $this->postJson('/api/auth/reset-password', $payload)->assertOk();

        // Segundo uso → 422
        $this->postJson('/api/auth/reset-password', $payload)->assertStatus(422);
    }
}
