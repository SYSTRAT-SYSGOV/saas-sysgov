<?php

use Illuminate\Support\Facades\Route;
use Modules\Admin\Http\Controllers\AuditController;
use Modules\Admin\Http\Controllers\TenantController;
use Modules\Admin\Http\Controllers\UserController;
use Modules\Admin\Http\Controllers\RoleController;
use Modules\Admin\Http\Controllers\PermissionController;
use Modules\Admin\Http\Controllers\ModuleController;
use Modules\Admin\Http\Controllers\MonitoringController;
use Modules\Admin\Http\Controllers\HierarchyController;
use Modules\Admin\Http\Controllers\SaasContractController;
use Modules\Admin\Http\Controllers\SaasBillingController;
use Modules\Admin\Http\Controllers\MenuController;

Route::middleware(['platform-admin'])->prefix('api/admin')->group(function (): void {
    Route::get('/tenants', [TenantController::class, 'index']);
    Route::post('/tenants', [TenantController::class, 'store']);
    Route::get('/tenants/{tenant}', [TenantController::class, 'show']);
    Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
    Route::patch('/tenants/{tenant}/status', [TenantController::class, 'toggleStatus']);
    Route::delete('/tenants/{tenant}', [TenantController::class, 'destroy']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
    Route::put('/users/{user}/roles', [UserController::class, 'assignRoles']);
    Route::get('/roles', [RoleController::class, 'index']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::post('/permissions', [PermissionController::class, 'store']);
    Route::get('/audit-logs', [AuditController::class, 'index']);
    Route::get('/monitoring', [MonitoringController::class, 'index']);
    Route::get('/monitoring/tenant-usage', [MonitoringController::class, 'tenantUsage']);
    Route::get('/hierarchy', [HierarchyController::class, 'index']);
    Route::post('/hierarchy/organizations', [HierarchyController::class, 'storeOrganization']);
    Route::post('/hierarchy/departments', [HierarchyController::class, 'storeDepartment']);
    Route::post('/hierarchy/management-units', [HierarchyController::class, 'storeManagementUnit']);
    Route::post('/hierarchy/budget-units', [HierarchyController::class, 'storeBudgetUnit']);
    Route::get('/modules', [ModuleController::class, 'index']);
    Route::put('/tenants/{tenant}/modules/{module}', [ModuleController::class, 'toggle']);
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