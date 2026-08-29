<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;
use Spatie\Permission\Models\Role;

final class RoleSlugHookTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_slug_is_auto_generated(): void
    {
        $role = Role::findOrCreate('super_admin_hook', 'web');
        $this->assertSame('super-admin-hook', $role->slug);
        $this->assertSame('tenant', $role->scope);
    }
}