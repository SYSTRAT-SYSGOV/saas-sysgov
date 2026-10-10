<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Escola\Database\Seeders\EscolaRbacSeeder;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Support\EscolaContext;

/**
 * Cenários pelo caminho real: perfis-modelo do EscolaRbacSeeder clonados pelo ModuleRoleProvisioner
 * e atribuídos ao usuário no tenant, e requisições com o header X-Tenant-ID como o web-client faz.
 */
trait CenarioEscola
{
    private bool $perfisEscolaSemeados = false;

    protected function criarTenant(string $slug = 'prefeitura-a', bool $comModulo = true): Tenant
    {
        $tenant = Tenant::create(['name' => 'Escola ' . Str::title(str_replace('-', ' ', $slug)), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);

        if ($comModulo) {
            $this->habilitarModuloEscola($tenant);
        }

        return $tenant;
    }

    protected function habilitarModuloEscola(Tenant $tenant, bool $habilitado = true): void
    {
        if (!$this->perfisEscolaSemeados) {
            (new EscolaRbacSeeder())->run();
            $this->perfisEscolaSemeados = true;
        }

        $modulo = Module::firstOrCreate(['alias' => 'escola'], ['name' => 'Cadastro Escolar', 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => $habilitado, 'settings' => json_encode([])]]);

        if ($habilitado) {
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'escola');
        }
    }

    /** @param list<string> $perfis slugs: escola_direcao, escola_secretaria */
    protected function usuario(Tenant $tenant, array $perfis = ['escola_direcao'], ?string $nome = null): User
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

    protected function turno(Tenant $tenant, string $nome = 'Manhã'): Turno
    {
        return $this->noTenant($tenant, fn (): Turno => Turno::firstOrCreate(['nome' => $nome], ['ordem' => 1]));
    }

    protected function turma(Tenant $tenant, string $nome = '6º A', int $ano = 2026, string $turno = 'Manhã'): Turma
    {
        $turnoId = $this->turno($tenant, $turno)->id;

        return $this->noTenant($tenant, fn (): Turma => Turma::create(['nome' => $nome, 'turno_id' => $turnoId, 'ano_letivo' => $ano]));
    }

    /** @param array<string, mixed> $atributos */
    protected function aluno(Tenant $tenant, Turma $turma, string $nome, array $atributos = []): Aluno
    {
        return $this->noTenant($tenant, fn (): Aluno => Aluno::create([
            'nome' => $nome,
            'turma_id' => $turma->id,
            'situacao' => 'ativo',
            'numero' => (int) Aluno::query()->where('turma_id', $turma->id)->max('numero') + 1,
            ...$atributos,
        ]));
    }

    /** Escola do tenant (várias por órgão), opcionalmente ligada a uma unidade do organograma. */
    protected function escola(Tenant $tenant, string $nome, ?int $orgUnitId = null, bool $ativa = true): Escola
    {
        return $this->noTenant($tenant, fn (): Escola => Escola::create(['nome' => $nome, 'org_unit_id' => $orgUnitId, 'ativa' => $ativa]));
    }

    /** Executa com o tenant e a escola de trabalho definidos (como faz o middleware `escola`). */
    protected function naEscola(Tenant $tenant, Escola $escola, callable $acao): mixed
    {
        $context = app(EscolaContext::class);

        return $this->noTenant($tenant, function () use ($context, $escola, $acao): mixed {
            $context->set($escola);
            try {
                return $acao();
            } finally {
                $context->clear();
            }
        });
    }
}
