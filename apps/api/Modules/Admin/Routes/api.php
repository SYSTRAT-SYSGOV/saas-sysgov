<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Admin\Http\Controllers\AuditController;
use Modules\Admin\Http\Controllers\TenantController;
use Modules\Admin\Http\Controllers\AnalystController;
use Modules\Admin\Http\Controllers\UserAdminController;
use Modules\Admin\Http\Controllers\RoleAdminController;
use Modules\Admin\Http\Controllers\PermissionController;
use Modules\Admin\Http\Controllers\InvitationAdminController;
use Modules\Admin\Http\Controllers\TenantUserViewController;
use Modules\Admin\Http\Controllers\ModuleController;
use Modules\Admin\Http\Controllers\MonitoringController;
use Modules\Admin\Http\Controllers\HierarchyController;
use Modules\Admin\Http\Controllers\SaasContractController;
use Modules\Admin\Http\Controllers\SaasBillingController;
use Modules\Admin\Http\Controllers\MenuController;
use Modules\Admin\Http\Controllers\MfaController;
use Modules\Admin\Http\Controllers\OidcController;
use Modules\Admin\Http\Controllers\AuthController;

// Rotas públicas (self-service e SSO) — fora do middleware platform-admin
Route::prefix('api/admin')->middleware('bindings')->group(function (): void {
    // Auth & MFA Setup (público)
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/auth/mfa/verify', [MfaController::class, 'verify']);
    Route::post('/auth/accept-invitation', [AuthController::class, 'acceptInvitation']);

    // OIDC SSO (RN-USR-008)
    Route::get('/oidc/redirect/{tenant}', [OidcController::class, 'redirect']);
    Route::get('/oidc/callback', [OidcController::class, 'callback']);
});

// Rotas autenticadas do web-admin (platform-admin + gate MFA)
Route::middleware(['platform-admin', 'mfa', 'bindings'])->prefix('api/admin')->group(function (): void {
    // Tenants
    Route::get('/tenants', [TenantController::class, 'index']);
    Route::post('/tenants', [TenantController::class, 'store']);
    Route::get('/tenants/{tenant}', [TenantController::class, 'show']);
    Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
    Route::patch('/tenants/{tenant}/status', [TenantController::class, 'toggleStatus']);
    Route::delete('/tenants/{tenant}', [TenantController::class, 'destroy']);

    // Consulta pública de CNPJ (autopreenchimento no provisionamento)
    Route::get('/cnpj/{cnpj}', [TenantController::class, 'lookupCnpj']);

    // Analistas de suporte (carteira de clientes)
    Route::get('/analysts', [AnalystController::class, 'index']);
    Route::post('/analysts', [AnalystController::class, 'store']);
    Route::get('/analysts/my/tenants', [AnalystController::class, 'myTenants']);
    Route::post('/analysts/{analyst}/tenants', [AnalystController::class, 'assign']);
    Route::delete('/analysts/{analyst}/tenants/{tenant}', [AnalystController::class, 'revoke']);

    // SYSTRAT Users
    Route::get('/users', [UserAdminController::class, 'index']);
    Route::post('/users', [UserAdminController::class, 'store']);
    Route::get('/users/{user}', [UserAdminController::class, 'show']);
    Route::put('/users/{user}', [UserAdminController::class, 'update']);
    Route::delete('/users/{user}', [UserAdminController::class, 'destroy']);
    Route::post('/users/{user}/deactivate', [UserAdminController::class, 'deactivate']);
    Route::post('/users/{user}/reactivate', [UserAdminController::class, 'reactivate']);
    Route::post('/users/{user}/reset-password', [UserAdminController::class, 'requestPasswordReset']);

    // Tenant Admin Onboarding (RN-USR-011)
    Route::post('/tenants/{tenant}/users/admin', [UserAdminController::class, 'createTenantAdmin']);

    // Tenant Users View (read-only for support) — registrado antes de users/{user}
    Route::get('/tenants/{tenant}/users/view', [TenantUserViewController::class, 'index']);
    Route::get('/tenants/{tenant}/users/view/{user}', [TenantUserViewController::class, 'show']);
    Route::post('/tenants/{tenant}/users/view/{user}/deactivate', [TenantUserViewController::class, 'deactivate']);

    // Tenant Users (read-only + desativação de emergência)
    Route::get('/tenants/{tenant}/users', [UserAdminController::class, 'listTenantUsers']);
    Route::get('/tenants/{tenant}/users/{user}', [UserAdminController::class, 'showTenantUser']);
    Route::post('/tenants/{tenant}/users/{user}/deactivate', [UserAdminController::class, 'deactivateTenantUser']);

    // Roles & Permissions
    Route::get('/roles', [RoleAdminController::class, 'index']);
    Route::post('/roles', [RoleAdminController::class, 'store']);
    Route::get('/roles/{role}', [RoleAdminController::class, 'show']);
    Route::put('/roles/{role}', [RoleAdminController::class, 'update']);
    Route::delete('/roles/{role}', [RoleAdminController::class, 'destroy']);

    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::post('/permissions', [PermissionController::class, 'store']);
    Route::get('/permissions/{permission}', [PermissionController::class, 'show']);
    Route::put('/permissions/{permission}', [PermissionController::class, 'update']);
    Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy']);

    // Invitations
    Route::get('/invitations', [InvitationAdminController::class, 'index']);
    Route::post('/invitations', [InvitationAdminController::class, 'store']);
    Route::post('/invitations/{invitation}/resend', [InvitationAdminController::class, 'resend']);
    Route::delete('/invitations/{invitation}', [InvitationAdminController::class, 'destroy']);

    // MFA do próprio usuário (RN-USR-005) — EnsureMfa ignora este prefixo
    Route::post('/me/mfa/setup', [MfaController::class, 'setup']);
    Route::post('/me/mfa/confirm', [MfaController::class, 'confirm']);
    Route::post('/me/mfa/disable', [MfaController::class, 'disable']);

    // Audit & Monitoring
    Route::get('/audit-logs', [AuditController::class, 'index']);
    Route::get('/monitoring', [MonitoringController::class, 'index']);
    Route::get('/monitoring/tenant-usage', [MonitoringController::class, 'tenantUsage']);

    // Hierarchy
    Route::get('/hierarchy', [HierarchyController::class, 'index']);
    Route::post('/hierarchy/organizations', [HierarchyController::class, 'storeOrganization']);
    Route::post('/hierarchy/departments', [HierarchyController::class, 'storeDepartment']);
    Route::post('/hierarchy/management-units', [HierarchyController::class, 'storeManagementUnit']);
    Route::post('/hierarchy/budget-units', [HierarchyController::class, 'storeBudgetUnit']);

    // Modules
    Route::get('/modules', [ModuleController::class, 'index']);
    Route::put('/tenants/{tenant}/modules/{module}', [ModuleController::class, 'toggle']);

    // SaaS Contracts & Billing
    Route::get('/saas-contracts', [SaasContractController::class, 'index']);
    Route::get('/saas-contracts/{contract}', [SaasContractController::class, 'show']);
    Route::post('/saas-contracts', [SaasContractController::class, 'store']);
    Route::get('/saas-billing/invoices', [SaasBillingController::class, 'index']);
    Route::patch('/saas-billing/invoices/{invoice}/pay', [SaasBillingController::class, 'markAsPaid']);

    // Menus
    Route::get('/navigation', [MenuController::class, 'navigation']);
    Route::get('/menus', [MenuController::class, 'index']);
    Route::post('/menus/groups', [MenuController::class, 'storeGroup']);
    Route::put('/menus/groups/{group}', [MenuController::class, 'updateGroup']);
    Route::delete('/menus/groups/{group}', [MenuController::class, 'destroyGroup']);
    Route::post('/menus/items', [MenuController::class, 'storeItem']);
    Route::put('/menus/items/{item}', [MenuController::class, 'updateItem']);
    Route::delete('/menus/items/{item}', [MenuController::class, 'destroyItem']);
});
