<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Concerns;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;

/**
 * Monta cenários do módulo Vistoria pelo caminho real (tenant + módulo habilitado +
 * role de tenant com as permissões necessárias), mesmo padrão de
 * Modules\Requerimentos\Tests\Concerns\CenarioRequerimentos.
 */
trait CenarioVistoria
{
    protected function criarTenant(string $slug = 'prefeitura-a', bool $comModulo = true): Tenant
    {
        $tenant = Tenant::create([
            'name' => 'Prefeitura ' . Str::title(str_replace('-', ' ', $slug)),
            'slug' => $slug,
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        if ($comModulo) {
            $this->habilitarModulo($tenant);
        }

        return $tenant;
    }

    protected function habilitarModulo(Tenant $tenant, bool $habilitado = true): void
    {
        $modulo = Module::firstOrCreate(
            ['alias' => 'vistoria'],
            ['name' => 'Vistoria', 'enabled' => true, 'monthly_fee_cents' => 0],
        );
        $modulo->tenants()->syncWithoutDetaching([
            $tenant->id => ['enabled' => $habilitado, 'settings' => json_encode([])],
        ]);
    }

    /**
     * @param list<string> $permissoes slugs de Permission, ex.: vistoria.locais.manage
     */
    protected function usuarioComPermissao(Tenant $tenant, array $permissoes = [], ?string $nome = null): User
    {
        $nome ??= 'Usuário ' . Str::random(6);
        $user = User::create([
            'name' => $nome,
            'email' => Str::slug($nome) . '-' . Str::random(5) . '@teste.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);

        if ($permissoes !== []) {
            $role = Role::create([
                'name' => 'Papel de Teste ' . Str::random(6),
                'slug' => 'teste_' . Str::random(8),
                'scope' => 'tenant',
                'tenant_id' => $tenant->id,
                'guard_name' => 'web',
            ]);
            $permissionIds = array_map(
                fn (string $slug) => Permission::firstOrCreate(
                    ['slug' => $slug],
                    ['name' => $slug, 'module' => 'vistoria', 'guard_name' => 'web'],
                )->id,
                $permissoes,
            );
            $role->permissions()->sync($permissionIds);
            $user->roles()->attach($role->id, ['tenant_id' => $tenant->id]);
        }

        $user->clearPermissionCache();

        return $user;
    }

    /** Requisição HTTP autenticada no tenant, como o web-client faz (header X-Tenant-ID). */
    protected function como(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    /** Executa $acao com o TenantContext de $tenant (para montar dados via Services/models). */
    protected function noTenant(Tenant $tenant, callable $acao): mixed
    {
        $context = app(TenantContext::class);
        $context->set($tenant);

        try {
            return $acao();
        } finally {
            $context->clear();
        }
    }
}
