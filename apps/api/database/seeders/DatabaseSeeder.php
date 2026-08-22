<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Modules\Admin\Models\Module;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::updateOrCreate(['slug' => 'araucaria'], ['name' => 'Prefeitura de Araucária', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active', 'settings' => ['portalTitle' => 'SYSGOV Araucária']]);
        $admin = User::updateOrCreate(['email' => env('SYSGOV_ADMIN_EMAIL', 'admin@sysgov.local')], ['name' => 'Administrador SYSGOV', 'password' => env('SYSGOV_ADMIN_PASSWORD', 'ChangeMe!123456'), 'is_platform_admin' => true]);
        $admin->tenants()->syncWithoutDetaching([$tenant->id]);
        foreach (['contracts.view', 'contracts.manage', 'admin.view', 'finance.view'] as $permissionName) Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web', 'tenant_id' => $tenant->id]);
        $role = Role::updateOrCreate(['name' => 'Gestor de Contratos', 'tenant_id' => $tenant->id], ['guard_name' => 'web']);
        $role->permissions()->sync(Permission::where('tenant_id', $tenant->id)->pluck('id'));
        foreach ([['name' => 'Admin', 'alias' => 'admin'], ['name' => 'Contracts', 'alias' => 'contracts'], ['name' => 'Finance', 'alias' => 'finance']] as $moduleData) {
            $module = Module::updateOrCreate(['alias' => $moduleData['alias']], $moduleData + ['enabled' => true]);
            $module->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
        }
        $this->command?->info('Seed SYSGOV concluído. Login: '.$admin->email);
    }
}
