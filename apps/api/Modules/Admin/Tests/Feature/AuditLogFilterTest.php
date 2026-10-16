<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class AuditLogFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->admin = User::where('is_platform_admin', true)->firstOrFail();
        AuditLog::query()->delete();
    }

    private function log(string $module, string $action, string $when, ?int $userId = null): void
    {
        AuditLog::create([
            'user_id' => $userId, 'module' => $module, 'action' => $action, 'resource' => 'R', 'ip' => '127.0.0.1',
            'hash' => bin2hex(random_bytes(8)), 'prev_hash' => null, 'created_at' => $when,
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function list(string $query = ''): array
    {
        return $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/audit-logs' . $query)->assertOk()->json('data');
    }

    public function test_returns_an_empty_list_when_there_are_no_logs(): void
    {
        $this->assertSame([], $this->list());
    }

    public function test_filters_by_module_action_user_and_period(): void
    {
        $this->log('admin', 'user.created', '2026-10-01 10:00:00', $this->admin->id);
        $this->log('admin', 'user.deleted', '2026-10-05 10:00:00', $this->admin->id);
        $this->log('tenant', 'user.created', '2026-10-10 10:00:00', null);

        $this->assertCount(2, $this->list('?module=admin'));
        $this->assertCount(2, $this->list('?action=user.created'));
        $this->assertCount(2, $this->list('?user_id=' . $this->admin->id));
        $this->assertCount(2, $this->list('?from=2026-10-05&to=2026-10-10'));
        $this->assertCount(1, $this->list('?module=admin&action=user.deleted'));
    }

    public function test_per_page_is_capped_at_100(): void
    {
        $this->log('admin', 'a', '2026-10-01 10:00:00');

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/audit-logs?per_page=5000')->assertOk();

        $this->assertSame(100, $response->json('per_page'));
    }
}
