<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\MeioAmbiente\Database\Seeders\MeioAmbienteRbacSeeder;

/**
 * Monta cenários do módulo pelo caminho real: perfis-template do
 * MeioAmbienteRbacSeeder clonados pelo ModuleRoleProvisioner e atribuídos ao
 * usuário no tenant — mesmo padrão de Modules\Requerimentos\Tests\Concerns\CenarioRequerimentos.
 */
trait CenarioMeioAmbiente
{
    private bool $perfisMeioAmbienteSemeados = false;

    protected function criarTenant(string $slug = 'prefeitura-a', bool $comModulo = true): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura ' . Str::title(str_replace('-', ' ', $slug)), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);

        if ($comModulo) {
            $this->habilitarModulo($tenant);
        }

        return $tenant;
    }

    protected function habilitarModulo(Tenant $tenant, bool $habilitado = true): void
    {
        if (! $this->perfisMeioAmbienteSemeados) {
            (new MeioAmbienteRbacSeeder())->run();
            $this->perfisMeioAmbienteSemeados = true;
        }

        $modulo = Module::firstOrCreate(['alias' => 'meio_ambiente'], ['name' => 'MeioAmbiente', 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => $habilitado, 'settings' => json_encode([])]]);

        if ($habilitado) {
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'meio_ambiente');
        }
    }

    /**
     * @param list<string> $perfis slugs: admin_meio_ambiente, analista_licenciamento_ambiental, fiscal_ambiental, gestor_recursos_naturais
     */
    protected function usuario(Tenant $tenant, array $perfis = ['admin_meio_ambiente'], ?string $nome = null): User
    {
        $nome ??= 'Usuário ' . Str::random(6);
        $user = User::create(['name' => $nome, 'email' => Str::slug($nome) . '-' . Str::random(5) . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);

        foreach ($perfis as $slug) {
            $role = Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail();
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
