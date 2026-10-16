<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Modules\Admin\Models\MenuGroup;
use Modules\Admin\Models\MenuItem;
use Modules\Admin\Tests\TestCase;

/**
 * O menu lateral do admin não mostra os grupos criados pelo registro de módulos (telas do portal do cliente).
 */
final class AdminMenuAudienceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->admin = User::where('is_platform_admin', true)->firstOrFail();
    }

    private function group(string $slug, string $route, ?string $audience = null): MenuGroup
    {
        $group = MenuGroup::create(array_filter([
            'name' => strtoupper($slug), 'slug' => $slug, 'icon' => 'Layers', 'order' => 1, 'is_active' => true, 'audience' => $audience,
        ], fn ($v) => $v !== null));
        MenuItem::create(['menu_group_id' => $group->id, 'label' => 'Item ' . $slug, 'route' => $route, 'icon' => 'Layers', 'order' => 1, 'is_active' => true]);

        return $group;
    }

    /** @return list<string> */
    private function names(string $path): array
    {
        $rows = $this->actingAs($this->admin, 'sanctum')->getJson($path)->assertOk()->json();

        return array_column($rows, 'name');
    }

    public function test_navigation_returns_only_admin_groups(): void
    {
        $this->group('painel-teste', 'admin_dashboard', 'admin');
        $this->group('licita-teste', 'licita', 'module');

        $names = $this->names('/api/admin/navigation');

        $this->assertContains('PAINEL-TESTE', $names);
        $this->assertNotContains('LICITA-TESTE', $names);
    }

    public function test_menu_manager_lists_only_admin_groups(): void
    {
        $this->group('painel-teste', 'admin_dashboard', 'admin');
        $this->group('atas-teste', 'ata', 'module');

        $names = $this->names('/api/admin/menus');

        $this->assertContains('PAINEL-TESTE', $names);
        $this->assertNotContains('ATAS-TESTE', $names);
    }

    public function test_groups_created_without_audience_belong_to_the_admin_menu(): void
    {
        $this->group('grupo-manual', 'admin_custom');

        $this->assertSame('admin', MenuGroup::where('slug', 'grupo-manual')->value('audience'));
        $this->assertContains('GRUPO-MANUAL', $this->names('/api/admin/navigation'));
    }

    public function test_migration_backfill_marks_groups_from_module_registration_as_module(): void
    {
        $admin = $this->group('painel-teste', 'admin_dashboard');
        $catalog = $this->group('catalogo-teste', 'module_catalog');
        $module = $this->group('licita-teste', 'licita');

        (require base_path('Modules/Admin/Database/Migrations/2026_10_16_190000_add_audience_to_menu_groups_table.php'))->up();

        $this->assertSame('admin', $admin->fresh()?->getAttribute('audience'));
        $this->assertSame('admin', $catalog->fresh()?->getAttribute('audience'));
        $this->assertSame('module', $module->fresh()?->getAttribute('audience'));
    }

    public function test_seed_menus_creates_admin_groups_and_drops_the_removed_records_screen(): void
    {
        $legacy = $this->group('legado', 'admin_records');
        MenuItem::where('route', 'admin_records')->update(['menu_group_id' => $legacy->id]);

        Artisan::call('sysgov:seed-menus');

        $this->assertFalse(MenuItem::where('route', 'admin_records')->exists());
        $this->assertSame('Saúde & Integrações', MenuItem::where('route', 'admin_apis')->value('label'));
        $this->assertSame('admin', MenuGroup::where('slug', 'painel-principal')->value('audience'));
    }
}
