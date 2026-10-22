<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Tests\Concerns;

use Modules\Escola\Tests\Support\AlunoDeTeste;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Modules\Admin\Models\Module;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Support\EscolaContext;
use Modules\Multiprofissional\Database\Seeders\MultiprofissionalRbacSeeder;
use Modules\Multiprofissional\Models\Cargo;
use Modules\Multiprofissional\Models\Profissional;
use Modules\Multiprofissional\Models\TipoAtendimento;

/**
 * Cenários com o módulo habilitado pelo caminho real (perfis clonados + X-Tenant-ID). Cada tenant tem duas escolas
 * com um aluno em cada, um cargo e um tipo de atendimento.
 */
trait CenarioMultiprofissional
{
    private bool $perfisSemeados = false;

    /** @var array<int, array<string, mixed>> */
    protected array $dados = [];

    protected function criarTenant(string $slug = 'prefeitura-a'): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura ' . Str::title(str_replace('-', ' ', $slug)), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        if (!$this->perfisSemeados) {
            (new MultiprofissionalRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        $modulo = Module::firstOrCreate(['alias' => 'multiprofissional'], ['name' => 'Multiprofissional', 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
        app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'multiprofissional');

        $this->noTenant($tenant, function () use ($tenant): void {
            $centro = Escola::create(['nome' => 'Escola Municipal Centro', 'ativa' => true]);
            $norte = Escola::create(['nome' => 'Escola Municipal Norte', 'ativa' => true]);
            $this->dados[$tenant->id] = [
                'centro' => $centro,
                'norte' => $norte,
                'ana' => $this->aluno($centro, 'Ana Clara Souza', '1001'),
                'bruno' => $this->aluno($norte, 'Bruno Lima', '1002'),
                'cargo' => Cargo::create(['nome' => 'Psicólogo(a)']),
                'tipo' => TipoAtendimento::create(['nome' => 'Avaliação']),
            ];
        });

        return $tenant;
    }

    protected function dado(Tenant $tenant, string $chave): mixed
    {
        return $this->dados[$tenant->id][$chave];
    }

    /** @param list<string> $perfis multiprofissional_coordenacao | multiprofissional_profissional | multiprofissional_consulta */
    protected function usuario(Tenant $tenant, array $perfis): User
    {
        $user = User::create(['name' => 'Usuário ' . Str::random(5), 'email' => Str::lower(Str::random(10)) . '@teste.com.br', 'password' => bcrypt('secret')]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);
        foreach ($perfis as $slug) {
            $user->roles()->attach(Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail()->id, ['tenant_id' => $tenant->id]);
        }
        $user->clearPermissionCache();

        return $user;
    }

    /** Profissional criado pela API (passa pelo Cadastro de Pessoas). */
    protected function profissional(Tenant $tenant, User $gestor, string $cpf, string $nome, ?User $usuario = null): Profissional
    {
        $id = $this->como($gestor, $tenant)->postJson('/api/multiprofissional/profissionais', [
            'cpf' => $cpf, 'nome' => $nome, 'cargo_id' => $this->dado($tenant, 'cargo')->id, 'user_id' => $usuario?->id,
        ])->assertCreated()->json('data.id');

        return $this->noTenant($tenant, fn () => Profissional::findOrFail($id));
    }

    /**
     * @param array<string, mixed> $extra
     * @return TestResponse<\Illuminate\Http\JsonResponse>
     */
    protected function registrarAtendimento(User $user, Tenant $tenant, Profissional $profissional, array $extra = []): TestResponse
    {
        return $this->como($user, $tenant)->postJson('/api/multiprofissional/atendimentos', [
            'data_hora' => '2026-10-13 09:00',
            'turno' => 'manha',
            'escola_id' => $this->dado($tenant, 'centro')->id,
            'relato' => 'Estudante participou da avaliação inicial.',
            'alunos' => [$this->dado($tenant, 'ana')->id],
            'profissionais' => [$profissional->id],
            'tipos' => [$this->dado($tenant, 'tipo')->id],
            ...$extra,
        ]);
    }

    protected function como(User $user, Tenant $tenant): static
    {
        return $this->flushHeaders()->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    protected function noTenant(Tenant $tenant, callable $acao): mixed
    {
        $context = app(TenantContext::class);
        $anterior = $context->hasTenant() ? $context->get() : null;
        $context->set($tenant);
        try {
            return $acao();
        } finally {
            $anterior !== null ? $context->set($anterior) : $context->clear();
        }
    }

    private function aluno(Escola $escola, string $nome, string $cgm): Aluno
    {
        $escolas = app(EscolaContext::class);
        $escolas->set($escola);
        try {
            return AlunoDeTeste::criar(['nome' => $nome, 'cgm' => $cgm, 'situacao' => 'ativo']);
        } finally {
            $escolas->clear();
        }
    }
}
