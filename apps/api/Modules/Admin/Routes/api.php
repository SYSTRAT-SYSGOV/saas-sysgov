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

Route::middleware(['auth:sanctum', 'platform-admin'])->prefix('api/admin')->group(function (): void {
    Route::get('/tenants', [TenantController::class, 'index']);
    Route::post('/tenants', [TenantController::class, 'store']);
    Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}/roles', [UserController::class, 'assignRoles']);
    Route::get('/roles', [RoleController::class, 'index']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::post('/permissions', [PermissionController::class, 'store']);
    Route::get('/audit-logs', [AuditController::class, 'index']);
    Route::get('/monitoring', [MonitoringController::class, 'index']);
    Route::get('/hierarchy', [HierarchyController::class, 'index']);
    Route::post('/hierarchy/organizations', [HierarchyController::class, 'storeOrganization']);
    Route::post('/hierarchy/departments', [HierarchyController::class, 'storeDepartment']);
    Route::post('/hierarchy/management-units', [HierarchyController::class, 'storeManagementUnit']);
    Route::post('/hierarchy/budget-units', [HierarchyController::class, 'storeBudgetUnit']);
    Route::get('/modules', [ModuleController::class, 'index']);
    Route::put('/tenants/{tenant}/modules/{module}', [ModuleController::class, 'toggle']);
});