<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\TenantSettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['status' => 'ok', 'service' => 'sysgov-api']);
Route::get('/auth/tenants', [AuthController::class, 'tenants']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/login-admin', [AuthController::class, 'loginAdmin']);

Route::middleware('auth:sanctum')->group(function (): void {
	// 'tenant' resolve o TenantContext via X-Tenant-Slug ou X-Tenant-ID
	Route::get('/auth/me', [AuthController::class, 'me'])->middleware('tenant');
	Route::post('/auth/logout', [AuthController::class, 'logout']);

	Route::middleware('tenant')->prefix('tenant-settings')->group(function (): void {
		Route::get('/', [TenantSettingsController::class, 'show']);
		Route::put('/', [TenantSettingsController::class, 'update']);
		Route::post('/logo', [TenantSettingsController::class, 'uploadLogo']);
		Route::delete('/logo', [TenantSettingsController::class, 'deleteLogo']);
	});
});
