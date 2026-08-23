<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

final class MakeModule extends Command
{
    protected $signature = 'make:module {name}';
    protected $description = 'Gera um módulo Laravel tenant-aware completo conforme o contrato SYSGOV';

    public function handle(): int
    {
        $name = Str::studly((string) $this->argument('name'));
        $alias = Str::lower($name);
        $base = base_path("Modules/{$name}");

        if (File::exists($base)) {
            $this->error("O módulo {$name} já existe em Modules/{$name}.");
            return self::FAILURE;
        }

        // Criar estrutura de diretórios obrigatória
        $directories = [
            'Config',
            'Database/Migrations',
            'Database/Seeders',
            'Http/Controllers',
            'Http/Middleware',
            'Http/Requests',
            'Http/Resources',
            'Models',
            'Policies',
            'Providers',
            'Routes',
            'Services',
            'Events',
            'Listeners',
            'Tests/Feature',
        ];

        foreach ($directories as $dir) {
            File::ensureDirectoryExists("{$base}/{$dir}");
        }

        // 1. module.json
        $moduleJson = [
            'name' => $name,
            'alias' => $alias,
            'description' => "Módulo de negócio {$name} para a plataforma SYSGOV",
            'priority' => 10,
            'providers' => [
                "Modules\\{$name}\\Providers\\{$name}ServiceProvider",
                "Modules\\{$name}\\Providers\\RouteServiceProvider",
            ],
            'requires' => ['Admin'],
            'menu' => [
                'label' => $name,
                'icon' => 'Layers',
                'order' => 50,
                'permission' => "{$alias}.view",
            ],
        ];
        File::put("{$base}/module.json", json_encode($moduleJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        // 2. Service Provider
        $providerContent = <<<PHP
<?php

declare(strict_types=1);

namespace Modules\\{$name}\\Providers;

use Illuminate\Support\ServiceProvider;

final class {$name}ServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        \$this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
    }

    public function register(): void
    {
        \$this->app->register(RouteServiceProvider::class);
    }
}
PHP;
        File::put("{$base}/Providers/{$name}ServiceProvider.php", $providerContent);

        // 3. Route Service Provider
        $routeServiceProviderContent = <<<PHP
<?php

declare(strict_types=1);

namespace Modules\\{$name}\\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'resolve.tenant'])
            ->prefix('api/{$alias}')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
PHP;
        File::put("{$base}/Providers/RouteServiceProvider.php", $routeServiceProviderContent);

        // 4. Routes/api.php
        $routesContent = <<<PHP
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\\{$name}\\Http\\Controllers\\{$name}Controller;

Route::get('/', [{$name}Controller::class, 'index'])->name('{$alias}.index');
Route::post('/', [{$name}Controller::class, 'store'])->name('{$alias}.store');
Route::get('/{id}', [{$name}Controller::class, 'show'])->name('{$alias}.show');
Route::put('/{id}', [{$name}Controller::class, 'update'])->name('{$alias}.update');
Route::delete('/{id}', [{$name}Controller::class, 'destroy'])->name('{$alias}.destroy');
PHP;
        File::put("{$base}/Routes/api.php", $routesContent);

        // 5. Model com TenantAware
        $modelContent = <<<PHP
<?php

declare(strict_types=1);

namespace Modules\\{$name}\\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class {$name}Item extends Model
{
    use TenantAware;

    protected \$table = '{$alias}_items';

    protected \$fillable = [
        'tenant_id',
        'code',
        'title',
        'amount_cents',
        'status',
        'metadata',
    ];

    protected \$casts = [
        'tenant_id' => 'integer',
        'amount_cents' => 'integer',
        'metadata' => 'array',
    ];
}
PHP;
        File::put("{$base}/Models/{$name}Item.php", $modelContent);

        // 6. Migration Tenant-Aware com índice composto
        $timestamp = date('Y_m_d_His');
        $migrationContent = <<<PHP
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('{$alias}_items', function (Blueprint \$table): void {
            \$table->id();
            \$table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            \$table->string('code')->nullable();
            \$table->string('title');
            \$table->unsignedBigInteger('amount_cents')->default(0);
            \$table->string('status')->default('active');
            \$table->json('metadata')->nullable();
            \$table->timestamps();

            // Índices compostos obrigatórios iniciando por tenant_id
            \$table->index(['tenant_id', 'created_at']);
            \$table->index(['tenant_id', 'status']);
            \$table->unique(['tenant_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('{$alias}_items');
    }
};
PHP;
        File::put("{$base}/Database/Migrations/{$timestamp}_create_{$alias}_items_table.php", $migrationContent);

        // 7. Policy Server-Side
        $policyContent = <<<PHP
<?php

declare(strict_types=1);

namespace Modules\\{$name}\\Policies;

use App\Models\User;
use Modules\\{$name}\\Models\\{$name}Item;

final class {$name}ItemPolicy
{
    public function viewAny(User \$user): bool
    {
        return \$user->is_platform_admin || \$user->hasPermission('{$alias}.view');
    }

    public function view(User \$user, {$name}Item \$item): bool
    {
        return \$user->is_platform_admin || (\$user->hasPermission('{$alias}.view') && \$user->belongsToTenant(\$item->tenant_id));
    }

    public function create(User \$user): bool
    {
        return \$user->is_platform_admin || \$user->hasPermission('{$alias}.create');
    }

    public function update(User \$user, {$name}Item \$item): bool
    {
        return \$user->is_platform_admin || (\$user->hasPermission('{$alias}.edit') && \$user->belongsToTenant(\$item->tenant_id));
    }

    public function delete(User \$user, {$name}Item \$item): bool
    {
        return \$user->is_platform_admin || (\$user->hasPermission('{$alias}.delete') && \$user->belongsToTenant(\$item->tenant_id));
    }
}
PHP;
        File::put("{$base}/Policies/{$name}ItemPolicy.php", $policyContent);

        // 8. Controller
        $controllerContent = <<<PHP
<?php

declare(strict_types=1);

namespace Modules\\{$name}\\Http\\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\\{$name}\\Models\\{$name}Item;

final class {$name}Controller extends Controller
{
    public function __construct(
        private readonly AuditLogger \$audit,
        private readonly OutboxPublisher \$outbox
    ) {}

    public function index(Request \$request): JsonResponse
    {
        \$items = {$name}Item::query()
            ->latest()
            ->paginate((int) \$request->query('per_page', 25));

        return response()->json(\$items);
    }

    public function store(Request \$request): JsonResponse
    {
        \$validated = \$request->validate([
            'code' => ['nullable', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer', 'min:0'],
            'status' => ['nullable', 'string'],
        ]);

        \$item = {$name}Item::create(\$validated);

        \$this->audit->record('{$alias}', 'item.created', "{$name}Item #{\$item->id}", null, \$item->toArray());
        \$this->outbox->publish('{$alias}', 'ItemCreated', ['id' => \$item->id, 'title' => \$item->title]);

        return response()->json(\$item, 201);
    }

    public function show(int \$id): JsonResponse
    {
        \$item = {$name}Item::findOrFail(\$id);
        return response()->json(\$item);
    }

    public function update(Request \$request, int \$id): JsonResponse
    {
        \$item = {$name}Item::findOrFail(\$id);
        \$before = \$item->toArray();

        \$validated = \$request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'amount_cents' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string'],
        ]);

        \$item->update(\$validated);
        \$this->audit->record('{$alias}', 'item.updated', "{$name}Item #{\$item->id}", \$before, \$item->toArray());

        return response()->json(\$item);
    }

    public function destroy(int \$id): JsonResponse
    {
        \$item = {$name}Item::findOrFail(\$id);
        \$before = \$item->toArray();
        \$item->delete();

        \$this->audit->record('{$alias}', 'item.deleted', "{$name}Item #{\$id}", \$before, null);

        return response()->json(['deleted' => true]);
    }
}
PHP;
        File::put("{$base}/Http/Controllers/{$name}Controller.php", $controllerContent);

        // 9. Teste de Isolamento de Tenant Obrigatório
        $testContent = <<<PHP
<?php

declare(strict_types=1);

namespace Modules\\{$name}\\Tests\\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\\{$name}\\Models\\{$name}Item;
use Tests\\TestCase;

final class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_{$alias}_entries_are_strictly_isolated_between_tenants(): void
    {
        \$tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a', 'type' => 'prefeitura', 'status' => 'active']);
        \$tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b', 'type' => 'prefeitura', 'status' => 'active']);

        // Inserir registro no Tenant A
        app(TenantContext::class)->set(\$tenantA);
        \$itemA = {$name}Item::create([
            'code' => 'COD-001',
            'title' => 'Registro Exclusivo do Tenant A',
            'amount_cents' => 150000,
            'status' => 'active',
        ]);

        self::assertSame(\$tenantA->id, \$itemA->tenant_id);

        // Mudar contexto para Tenant B
        app(TenantContext::class)->set(\$tenantB);
        self::assertSame(0, {$name}Item::query()->count(), 'Tenant B não pode enxergar dados do Tenant A.');

        // Inserir mesmo código no Tenant B (deve permitir graças à unicidade composta)
        \$itemB = {$name}Item::create([
            'code' => 'COD-001',
            'title' => 'Registro Exclusivo do Tenant B',
            'amount_cents' => 200000,
            'status' => 'active',
        ]);

        self::assertSame(1, {$name}Item::query()->count());
        self::assertSame('Registro Exclusivo do Tenant B', {$name}Item::firstOrFail()->title);

        // Voltar ao Tenant A e verificar integridade
        app(TenantContext::class)->set(\$tenantA);
        self::assertSame(1, {$name}Item::query()->count());
        self::assertSame('Registro Exclusivo do Tenant A', {$name}Item::firstOrFail()->title);

        app(TenantContext::class)->clear();
    }

    public function test_cannot_create_{$alias}_entry_without_tenant_context(): void
    {
        app(TenantContext::class)->clear();
        \$this->expectException(\LogicException::class);

        {$name}Item::create([
            'title' => 'Registro Órfão Sem Tenant',
            'amount_cents' => 5000,
        ]);
    }
}
PHP;
        File::put("{$base}/Tests/Feature/TenantIsolationTest.php", $testContent);

        $this->info("✓ Módulo [{$name}] criado com sucesso em Modules/{$name}!");
        $this->info("✓ Scaffold completo gerado: module.json, Providers, Routes, Model (TenantAware), Migration (composto tenant_id), Policy, Controller, Audit/Outbox e Teste de Isolamento de Tenant.");

        return self::SUCCESS;
    }
}
