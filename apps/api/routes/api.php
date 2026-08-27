<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['status' => 'ok', 'service' => 'sysgov-api']);
Route::get('/auth/tenants', [AuthController::class, 'tenants']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/login-admin', [AuthController::class, 'loginAdmin']);

Route::middleware('auth:sanctum')->group(function (): void {
	// 'tenant' resolve o TenantContext via X-Tenant-Slug ou X-Tenant-ID
	Route::get('/auth/me', [AuthController::class, 'me'])->middleware('tenant');
	Route::post('/auth/logout', [AuthController::class, 'logout']);
});
