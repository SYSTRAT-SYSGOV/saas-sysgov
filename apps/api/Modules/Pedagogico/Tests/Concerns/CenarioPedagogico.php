<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Tests\Concerns;

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
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Models\Turno;
use Modules\Pedagogico\Database\Seeders\PedagogicoRbacSeeder;

/** Cenários com os módulos Escola e Pedagógico habilitados, pelo caminho real de perfis e X-Tenant-ID. */
trait CenarioPedagogico
{
    private bool $perfisSemeados = false;

    protected function criarTenant(string $slug = 'escola-a', bool $comModulos = true): Tenant
    {
        $tenant = Tenant::create(['name' => 'Escola ' . Str::title($slug), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        if ($comModulos) {
            $this->habilitar($tenant, 'escola', 'Cadastro Escolar');
            $this->habilitar($tenant, 'pedagogico', 'Módulo Pedagógico');
        }

        return $tenant;
    }

    protected function habilitar(Tenant $tenant, string $alias, string $nome, bool $habilitado = true): void
    {
        if (!$this->perfisSemeados) {
            (new EscolaRbacSeeder())->run();
            (new PedagogicoRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        $modulo = Module::firstOrCreate(['alias' => $alias], ['name' => $nome, 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => $habilitado, 'settings' => json_encode([])]]);
        if ($habilitado) {
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, $alias);
        }
    }

    /** @param list<string> $perfis ex.: pedagogico_direcao, pedagogico_pedagogia, pedagogico_professor */
    protected function usuario(Tenant $tenant, array $perfis = ['pedagogico_direcao'], ?string $nome = null): User
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
    protected function aluno(Tenant $tenant, Turma $turma, string $nome, array $atributos = []): Aluno
    {
        return $this->noTenant($tenant, fn (): Aluno => Aluno::create([
            'nome' => $nome, 'turma_id' => $turma->id, 'situacao' => 'ativo',
            'numero' => (int) Aluno::query()->where('turma_id', $turma->id)->max('numero') + 1, ...$atributos,
        ]));
    }

    protected function categoria(Tenant $tenant, string $nome = 'Indisciplina'): CategoriaOcorrencia
    {
        return $this->noTenant($tenant, fn (): CategoriaOcorrencia => CategoriaOcorrencia::create(['nome' => $nome, 'cor' => '#ef4444']));
    }
}
