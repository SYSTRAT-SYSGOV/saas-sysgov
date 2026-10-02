<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Requerimentos\Database\Seeders\RequerimentosRbacSeeder;
use Modules\Requerimentos\Database\Seeders\TiposInstrumentoDefaultSeeder;

/**
 * Monta cenários do módulo pelo caminho real: perfis-template do
 * RequerimentosRbacSeeder clonados pelo ModuleRoleProvisioner e atribuídos
 * ao usuário no tenant (role_user.tenant_id), como acontece em produção —
 * mesmo padrão de Modules\Cursos\Tests\Concerns\CenarioCursos.
 */
trait CenarioRequerimentos
{
    private bool $perfisSemeados = false;

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
        if (!$this->perfisSemeados) {
            (new RequerimentosRbacSeeder())->run();
            $this->perfisSemeados = true;
        }

        $modulo = Module::firstOrCreate(['alias' => 'requerimentos'], ['name' => 'Requerimentos', 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => $habilitado, 'settings' => json_encode([])]]);

        if ($habilitado) {
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'requerimentos');
            // Tipos de instrumento são parametrização por tenant (TenantAware) — os 8 padrão
            // (requerimento, indicação, projeto de lei...) ficam disponíveis assim que o órgão
            // habilita o módulo, do mesmo jeito que em produção.
            $this->noTenant($tenant, fn () => (new TiposInstrumentoDefaultSeeder())->run());
        }
    }

    /**
     * @param list<string> $perfis slugs: admin_requerimentos, autor_requerimentos, tramitador_requerimentos
     */
    protected function usuario(Tenant $tenant, array $perfis = ['autor_requerimentos'], ?string $nome = null): User
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
