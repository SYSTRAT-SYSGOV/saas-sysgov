<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\AccessService;
use App\Services\ModuleAccessService;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;

/**
 * Fase 4 — Invalidação de cache na expiração.
 * Garante que acesso expirado deixa de valer em tempo real (sem janela de 5 min no cache).
 */
final class ExpireCacheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);
    }

    public function test_expire_job_invalidates_cached_access(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Cache', 'slug' => 'pref-cache', 'type' => 'prefeitura', 'status' => 'active']);
        $module = Module::where('alias', 'org')->firstOrFail();
        $tenant->modules()->syncWithoutDetaching([$module->id => ['enabled' => true]]);

        $grantor = User::where('is_platform_admin', true)->firstOrFail();
        $user = User::create(['name' => 'User Cache', 'email' => 'cache@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $service = app(ModuleAccessService::class);

        $service->grantAccess($user, $tenant->id, 'org', ['role' => 'viewer', 'valid_to' => now()->addDays(30)], $grantor);

        // Popula o cache de acesso via fluxo real (chama accessesFor → Cache::remember)
        $accessService = app(AccessService::class);
        $this->assertTrue($accessService->canAccessModule($user, 'org', $tenant->id), 'Acesso válido concede acesso.');

        $cacheKey = "user:{$user->id}:module_access:{$tenant->id}";
        $this->assertNotNull(Cache::get($cacheKey), 'Cache de acesso deve estar populado.');

        // Expira no banco (simula passagem do tempo) — cache ainda diz "ativo"
        $user->moduleAccesses()
            ->where('module_alias', 'org')
            ->update(['status' => UserModuleAccess::STATUS_ACTIVE, 'valid_to' => now()->subDay()]);

        Artisan::call('sysgov:expire-access');

        $this->assertNull(Cache::get($cacheKey), 'Job deve invalidar o cache de acesso do usuário.');
        $this->assertFalse($accessService->canAccessModule($user, 'org', $tenant->id), 'Após o job, acesso negado em tempo real.');
    }
}