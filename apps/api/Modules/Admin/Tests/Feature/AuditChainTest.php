<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AuditLogger;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class AuditChainTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    public function test_hmac_chain_is_immutable_and_linked(): void
    {
        $logger = app(AuditLogger::class);

        $log1 = $logger->record('test', 'event.a', 'resource-1', null, ['value' => 1]);
        $log2 = $logger->record('test', 'event.b', 'resource-2', ['before' => 1], ['after' => 2]);

        // Primeiro registro: prev_hash = null
        $this->assertNull($log1->prev_hash);
        $this->assertNotNull($log1->hash);
        $this->assertEquals(64, strlen($log1->hash));

        // Segundo registro: prev_hash = hash do primeiro
        $this->assertEquals($log1->hash, $log2->prev_hash);
        $this->assertNotNull($log2->hash);
        $this->assertNotEquals($log1->hash, $log2->hash);

        // Verifica integridade recalculando o hash (timestamp no fuso da aplicação, sem microssegundos)
        $payload1 = implode('|', [
            (string) $log1->tenant_id,
            (string) $log1->user_id,
            $log1->action,
            $log1->resource,
            json_encode($log1->before),
            json_encode($log1->after),
            $log1->created_at->format('Y-m-d H:i:s'),
            '',
        ]);
        $expectedHash1 = hash('sha256', $payload1);
        $this->assertEquals($expectedHash1, $log1->hash);

        $payload2 = implode('|', [
            (string) $log2->tenant_id,
            (string) $log2->user_id,
            $log2->action,
            $log2->resource,
            json_encode($log2->before),
            json_encode($log2->after),
            $log2->created_at->format('Y-m-d H:i:s'),
            $log1->hash,
        ]);
        $expectedHash2 = hash('sha256', $payload2);
        $this->assertEquals($expectedHash2, $log2->hash);
    }

    public function test_audit_logs_are_immutable_on_update(): void
    {
        $logger = app(AuditLogger::class);
        $log = $logger->record('test', 'immutable', 'r', null, null);

        $this->expectException(\LogicException::class);
        $log->update(['action' => 'changed']);
    }

    public function test_audit_logs_are_immutable_on_delete(): void
    {
        $logger = app(AuditLogger::class);
        $log = $logger->record('test', 'immutable', 'r', null, null);

        $this->expectException(\LogicException::class);
        $log->delete();
    }

    public function test_admin_actions_generate_audit_logs(): void
    {
        $admin = User::where('is_platform_admin', true)->firstOrFail();
        $tenant = Tenant::create(['name' => 'Pref Audit', 'slug' => 'pref-audit', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);

        // Criar usuário SYSTRAT gera log
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', [
                'name' => 'Auditado',
                'email' => 'auditado@sysgov.test',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
                'role_slug' => 'suporte',
            ])->assertCreated();

        $this->assertDatabaseHas('audit_logs', ['action' => 'user.created', 'module' => 'admin']);

        // Onboarding gera log
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->id}/users/admin", [
                'name' => 'Admin Audit',
                'email' => 'admin-audit@sysgov.test',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
            ])->assertCreated();

        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_admin.created', 'module' => 'admin']);
    }
}