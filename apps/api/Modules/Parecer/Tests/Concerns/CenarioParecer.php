<?php

declare(strict_types=1);

namespace Modules\Parecer\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Escola\Database\Seeders\EscolaRbacSeeder;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Tests\Support\AlunoDeTeste;
use Modules\Parecer\Database\Seeders\ParecerRbacSeeder;
use Modules\Parecer\Models\FuncaoTurma;
use Modules\Parecer\Models\Habilidade;
use Modules\Parecer\Models\TurmaSerie;

/** Cenários com Escola e Parecer habilitados, pelo caminho real de perfis e X-Tenant-ID. */
trait CenarioParecer
{
    private bool $perfisSemeados = false;

    protected function criarTenant(string $slug = 'escola-a'): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura ' . Str::title($slug), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        $this->habilitar($tenant, 'escola', 'Cadastro Escolar');
        $this->habilitar($tenant, 'parecer', 'Parecer Descritivo');

        return $tenant;
    }

    protected function habilitar(Tenant $tenant, string $alias, string $nome): void
    {
        if (!$this->perfisSemeados) {
            (new EscolaRbacSeeder())->run();
            (new ParecerRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        $modulo = Module::firstOrCreate(['alias' => $alias], ['name' => $nome, 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
        app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, $alias);
    }

    /** @param list<string> $perfis parecer_direcao, parecer_pedagogia, parecer_professor */
    protected function usuario(Tenant $tenant, array $perfis = ['parecer_direcao'], ?string $nome = null): User
    {
        $nome ??= 'Usuário ' . Str::random(6);
        $user = User::create(['name' => $nome, 'email' => Str::slug($nome) . '-' . Str::random(5) . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);
        foreach ($perfis as $slug) {
            $user->roles()->attach(Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail()->id, ['tenant_id' => $tenant->id]);
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

    /**
     * Turma do Escola já configurada no parecer com a série.
     *
     * @param array<string, User> $funcoes funcao => usuário
     */
    protected function turma(Tenant $tenant, string $nome = '3º A', int $serie = 3, array $funcoes = [], ?int $ano = null): Turma
    {
        return $this->noTenant($tenant, function () use ($nome, $serie, $funcoes, $ano): Turma {
            $turno = Turno::firstOrCreate(['nome' => 'Manhã'], ['ordem' => 1]);
            $turma = Turma::create(['nome' => $nome, 'turno_id' => $turno->id, 'ano_letivo' => $ano ?? (int) date('Y')]);
            TurmaSerie::create(['turma_id' => $turma->id, 'serie' => $serie]);
            foreach ($funcoes as $funcao => $user) {
                FuncaoTurma::create(['turma_id' => $turma->id, 'funcao' => $funcao, 'user_id' => $user->id]);
            }

            return $turma;
        });
    }

    /** @param array<string, mixed> $atributos */
    protected function aluno(Tenant $tenant, Turma $turma, string $nome, array $atributos = []): Aluno
    {
        return $this->noTenant($tenant, fn (): Aluno => AlunoDeTeste::criar([
            'nome' => $nome, 'turma_id' => $turma->id, 'situacao' => 'ativo',
            'numero' => (int) Aluno::query()->where('turma_id', $turma->id)->max('numero') + 1, ...$atributos,
        ]));
    }

    protected function habilidade(Tenant $tenant, int $serie, string $materia, string $descricao, string $trimestres = '123'): Habilidade
    {
        return $this->noTenant($tenant, fn (): Habilidade => Habilidade::create([
            'serie' => $serie, 'materia' => $materia, 'descricao' => $descricao, 'trimestres' => $trimestres, 'ativo' => true,
            'ordem' => (int) Habilidade::query()->where('serie', $serie)->where('materia', $materia)->max('ordem') + 1,
        ]));
    }

    protected function categoria(Tenant $tenant, string $nome = 'Comportamento'): CategoriaOcorrencia
    {
        return $this->noTenant($tenant, fn (): CategoriaOcorrencia => CategoriaOcorrencia::create(['nome' => $nome, 'cor' => '#1351b4']));
    }
}
