<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Admin\Http\Controllers\AccessController;
use Modules\Admin\Http\Controllers\AccessGroupController;
use Modules\Admin\Http\Controllers\AuthController;
use Modules\Admin\Http\Controllers\CargoController;
use Modules\Admin\Http\Controllers\ClientAccessController;
use Modules\Admin\Http\Controllers\ClientUserController;
use Modules\Admin\Http\Controllers\MfaController;

// =====================================================================
// API do web-client — CRUD de usuários do tenant (FLUXO B, RN-USR-011)
// =====================================================================
Route::prefix('api/users')
    ->middleware(['auth:sanctum', 'tenant', 'bindings'])
    ->group(function (): void {
        Route::get('/', [ClientUserController::class, 'index']);
        Route::post('/', [ClientUserController::class, 'store']);
        Route::get('/{user}', [ClientUserController::class, 'show']);
        Route::put('/{user}', [ClientUserController::class, 'update']);
        Route::delete('/{user}', [ClientUserController::class, 'destroy']);
        Route::post('/{user}/deactivate', [ClientUserController::class, 'deactivate']);
        Route::post('/{user}/reactivate', [ClientUserController::class, 'reactivate']);
        Route::post('/{user}/roles', [ClientUserController::class, 'assignRole']);
    });

// =====================================================================
// Endpoints compartilhados (FLUXO A + FLUXO B)
// =====================================================================
// Self-service público: esqueci a senha (RN-USR-009)
Route::prefix('api/auth')->group(function (): void {
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Gerenciador de usuários e acessos por módulo/secretaria (FLUXO B)
Route::prefix('api/access')
    ->middleware(['auth:sanctum', 'tenant', 'bindings'])
    ->group(function (): void {
        Route::get('/', [ClientAccessController::class, 'summary']);
        Route::get('/dashboard', [ClientAccessController::class, 'dashboard']);
        Route::get('/modules', [ClientAccessController::class, 'modules']);
        Route::get('/users', [ClientAccessController::class, 'users']);
        Route::post('/users', [ClientAccessController::class, 'store']);
        Route::put('/users/{user}', [ClientAccessController::class, 'update']);

        // Evolução Usuários & Acessos (Fase D) — painel do Administrador Geral
        Route::get('/matrix', [AccessController::class, 'matrix']);
        Route::get('/by-module', [AccessController::class, 'modules']);
        Route::get('/expiring', [AccessController::class, 'expiring']);
        Route::post('/', [AccessController::class, 'grant']);
        Route::post('/{access}/revoke', [AccessController::class, 'revoke']);
        Route::post('/{access}/renew', [AccessController::class, 'renew']);

        // Cargos (posições/funções) por secretaria/órgão
        Route::get('/cargos', [CargoController::class, 'index']);
        Route::post('/cargos', [CargoController::class, 'store']);
        Route::put('/cargos/{cargo}', [CargoController::class, 'update']);
        Route::delete('/cargos/{cargo}', [CargoController::class, 'destroy']);

        // Categorias e Grupos de acesso (herança de permissões)
        Route::get('/categories', [AccessGroupController::class, 'categories']);
        Route::post('/categories', [AccessGroupController::class, 'storeCategory']);
        Route::put('/categories/{category}', [AccessGroupController::class, 'updateCategory']);
        Route::delete('/categories/{category}', [AccessGroupController::class, 'destroyCategory']);

        Route::get('/groups', [AccessGroupController::class, 'groups']);
        Route::post('/groups', [AccessGroupController::class, 'storeGroup']);
        Route::put('/groups/{group}', [AccessGroupController::class, 'updateGroup']);
        Route::delete('/groups/{group}', [AccessGroupController::class, 'destroyGroup']);
        Route::post('/groups/{group}/users', [AccessGroupController::class, 'assignUsers']);
        Route::delete('/groups/{group}/users/{user}', [AccessGroupController::class, 'removeUser']);
    });

// MFA do próprio usuário autenticado (RN-USR-005) — qualquer painel
Route::prefix('api/me/mfa')->middleware(['auth:sanctum', 'bindings'])->group(function (): void {
    Route::post('/setup', [MfaController::class, 'setup']);
    Route::post('/confirm', [MfaController::class, 'confirm']);
    Route::post('/disable', [MfaController::class, 'disable']);
});
