<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Tests\TestCase;

abstract class PessoasTestCase extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    protected function criarTenant(string $slug = 'pref-a'): Tenant
    {
        $tenant = Tenant::create(['name' => "Prefeitura {$slug}", 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);

        $modulo = Module::firstOrCreate(['alias' => 'pessoas'], ['name' => 'Pessoas', 'enabled' => true]);
        $modulo->tenants()->attach($tenant->id, ['enabled' => true]);

        return $tenant;
    }

    /** @param list<string> $permissoes */
    protected function usuario(Tenant $tenant, array $permissoes = []): User
    {
        $user = User::create([
            'name' => 'Usuário ' . Str::random(5),
            'email' => Str::random(8) . '@teste.gov.br',
            'password' => bcrypt('secret'),
        ]);

        $role = Role::create([
            'name' => 'Papel ' . Str::random(5), 'slug' => 'papel_' . Str::random(8),
            'scope' => 'tenant', 'tenant_id' => $tenant->id, 'guard_name' => 'web',
        ]);
        $role->permissions()->sync(array_map(
            fn (string $slug) => Permission::firstOrCreate(['slug' => $slug], ['name' => $slug, 'module' => 'pessoas', 'guard_name' => 'web'])->id,
            // "pessoas.view" é exigida pelo Gate de acesso a módulo da plataforma
            // (AuthServiceProvider::Gate::define('module', ...), sempre "{alias}.view");
            // "cadastros.pessoas.view" é a permissão granular deste módulo, usada pelos controllers.
            array_unique(['pessoas.view', 'cadastros.pessoas.view', ...$permissoes])
        ));

        $user->clearPermissionCache($tenant->id);

        return $this->vincular($user, $tenant, $role);
    }

    protected function vincular(User $user, Tenant $tenant, Role $role): User
    {
        $user->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true, 'role_id' => $role->id]);
        UserModuleAccess::create([
            'user_id' => $user->id, 'tenant_id' => $tenant->id, 'module_alias' => 'pessoas',
            'status' => 'active', 'valid_from' => now()->subDay(),
        ]);

        return $user;
    }

    protected function admin(Tenant $tenant): User
    {
        $modulo = json_decode((string) file_get_contents(__DIR__ . '/../module.json'), true);

        return $this->usuario($tenant, array_keys($modulo['permissions']));
    }

    protected function como(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    protected function noTenant(Tenant $tenant): void
    {
        app(TenantContext::class)->set($tenant);
    }

    /** Gera um CPF com dígitos verificadores válidos. */
    protected function cpfValido(): string
    {
        $n = array_map(fn () => random_int(0, 9), range(1, 9));
        foreach ([10, 11] as $peso) {
            $soma = 0;
            foreach ($n as $i => $d) {
                $soma += $d * ($peso - $i);
            }
            $n[] = ((10 * $soma) % 11) % 10;
        }

        return implode('', $n);
    }
}
