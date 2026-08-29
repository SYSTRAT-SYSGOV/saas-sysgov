<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Module;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

final class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        // Admin policies
        \Modules\Admin\Models\MenuGroup::class => \Modules\Admin\Policies\MenuGroupPolicy::class,
        \Modules\Admin\Models\MenuItem::class => \Modules\Admin\Policies\MenuItemPolicy::class,
        \Modules\Admin\Models\Module::class => \Modules\Admin\Policies\ModulePolicy::class,
        \Modules\Admin\Models\SaasContract::class => \Modules\Admin\Policies\SaasContractPolicy::class,
        \Modules\Admin\Models\SaasInvoice::class => \Modules\Admin\Policies\SaasInvoicePolicy::class,
        \Modules\Admin\Models\Tenant::class => \Modules\Admin\Policies\TenantPolicy::class,
        \Modules\Admin\Models\User::class => \Modules\Admin\Policies\UserPolicy::class,
        \App\Models\Role::class => \Modules\Admin\Policies\RolePolicy::class,
        \App\Models\Permission::class => \Modules\Admin\Policies\PermissionPolicy::class,
        \App\Models\UserModuleAccess::class => \Modules\Admin\Policies\AccessPolicy::class,
        // Procurement policies
        \Modules\Procurement\Models\Licitacao::class => \Modules\Procurement\Policies\LicitacaoPolicy::class,
        \Modules\Procurement\Models\ProcurementArtefato::class => \Modules\Procurement\Policies\ProcurementArtefatoPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();

        // Gate: module access - verifica se tenant tem o módulo ativo E usuário tem permissão
        Gate::define('module', function (User $user, string $moduleAlias): bool {
            if ($user->is_platform_admin) {
                return true;
            }

            $tenantId = $user->currentTenantId();
            if (!$tenantId) {
                return false;
            }

            // Verifica se o módulo está ativo para o tenant
            $module = Module::where('alias', $moduleAlias)->first();
            if (!$module) {
                return false;
            }

            $tenantModule = $module->tenants()
                ->where('tenant_id', $tenantId)
                ->where('enabled', true)
                ->first();

            if (!$tenantModule) {
                return false;
            }

            // Verifica permissão base do módulo (ex: procurement.view)
            $basePermission = "{$moduleAlias}.view";
            if (!$user->hasPermission($basePermission, $tenantId)) {
                return false;
            }

            return true;
        });

        // Gate: verifica permissão específica (para uso em controllers/policies)
        Gate::define('access', function (User $user, string $permission, ?int $tenantId = null): bool {
            return $user->hasPermission($permission, $tenantId);
        });

        // Gate: verifica role
        Gate::define('role', function (User $user, string $roleSlug, ?int $tenantId = null): bool {
            return $user->hasRole($roleSlug, $tenantId);
        });
    }
}