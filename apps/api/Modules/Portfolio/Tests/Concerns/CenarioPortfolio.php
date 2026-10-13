<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Escola\Database\Seeders\EscolaRbacSeeder;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Models\Turno;
use Modules\Portfolio\Database\Seeders\PortfolioRbacSeeder;

/** Cenários com Escola e Portfólio habilitados, pelo caminho real de perfis e X-Tenant-ID. */
trait CenarioPortfolio
{
    private bool $perfisSemeados = false;

    protected function criarTenant(string $slug = 'escola-a'): Tenant
    {
        $tenant = Tenant::create(['name' => 'Escola ' . Str::title($slug), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        if (!$this->perfisSemeados) {
            (new EscolaRbacSeeder())->run();
            (new PortfolioRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        foreach (['escola' => 'Cadastro Escolar', 'portfolio' => 'Portfólio Digital'] as $alias => $nome) {
            $modulo = Module::firstOrCreate(['alias' => $alias], ['name' => $nome, 'enabled' => true, 'monthly_fee_cents' => 0]);
            $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, $alias);
        }

        return $tenant;
    }

    /** @param list<string> $perfis portfolio_professor | portfolio_gestor (vazio = sem perfil do módulo) */
    protected function usuario(Tenant $tenant, array $perfis = ['portfolio_gestor'], ?string $nome = null): User
    {
        $nome ??= 'Usuário ' . Str::random(6);
        $user = User::create(['name' => $nome, 'email' => Str::slug($nome) . '-' . Str::random(5) . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);
        foreach ($perfis as $slug) {
            $user->roles()->attach(Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail()->id, ['tenant_id' => $tenant->id]);
        }
        // Acesso concedido ao módulo (user_module_access), como o admin faz no cadastro de usuários.
        UserModuleAccess::create([
            'user_id' => $user->id, 'tenant_id' => $tenant->id, 'module_alias' => 'portfolio',
            'role' => 'member', 'org_unit_ids' => null, 'can_manage_users' => false,
        ]);
        $user->clearPermissionCache();

        return $user;
    }

    /** Usuário só com portfolio.view (perfil ad hoc no tenant). */
    protected function usuarioSoVisualizacao(Tenant $tenant): User
    {
        $role = Role::create(['name' => 'Consulta', 'slug' => 'portfolio_consulta_' . Str::random(4), 'scope' => 'tenant', 'module' => 'portfolio', 'tenant_id' => $tenant->id, 'guard_name' => 'web']);
        $role->permissions()->sync(\App\Models\Permission::whereIn('slug', ['escola.view', 'portfolio.view'])->pluck('id'));
        $user = $this->usuario($tenant, []);
        $user->roles()->attach($role->id, ['tenant_id' => $tenant->id]);
        $user->clearPermissionCache();

        return $user;
    }

    protected function como(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

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

    protected function turma(Tenant $tenant, string $nome = '6º A', int $ano = 2026): Turma
    {
        return $this->noTenant($tenant, function () use ($nome, $ano): Turma {
            $turno = Turno::firstOrCreate(['nome' => 'Manhã'], ['ordem' => 1]);

            return Turma::create(['nome' => $nome, 'turno_id' => $turno->id, 'ano_letivo' => $ano]);
        });
    }

    protected function materia(Tenant $tenant, string $nome = 'Matemática'): Materia
    {
        return $this->noTenant($tenant, fn (): Materia => Materia::create(['nome' => $nome]));
    }

    protected function vincular(Tenant $tenant, Turma $turma, Materia $materia, ?User $professor = null): void
    {
        $this->noTenant($tenant, fn () => TurmaMateria::create(['turma_id' => $turma->id, 'materia_id' => $materia->id, 'professor_user_id' => $professor?->id]));
    }

    /** @param array<string, mixed> $atributos */
    protected function aluno(Tenant $tenant, ?Turma $turma, string $nome, array $atributos = []): Aluno
    {
        return $this->noTenant($tenant, fn (): Aluno => Aluno::create([
            'nome' => $nome, 'turma_id' => $turma?->id, 'situacao' => 'ativo',
            'numero' => $turma !== null ? (int) Aluno::query()->where('turma_id', $turma->id)->max('numero') + 1 : null, ...$atributos,
        ]));
    }

    protected function trimestres(Tenant $tenant, int $ano = 2026): void
    {
        $this->noTenant($tenant, function () use ($ano): void {
            foreach ([[1, '02-01', '04-30'], [2, '05-01', '08-31'], [3, '09-01', '12-15']] as [$n, $ini, $fim]) {
                Trimestre::create(['ano_letivo' => $ano, 'numero' => $n, 'data_inicio' => "{$ano}-{$ini}", 'data_fim' => "{$ano}-{$fim}"]);
            }
        });
    }
}
