<?php

declare(strict_types=1);

namespace Modules\Passeio\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Escola\Database\Seeders\EscolaRbacSeeder;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Passeio\Database\Seeders\PasseioRbacSeeder;

/** Cenários com Escola e Passeio habilitados, pelo caminho real de perfis e X-Tenant-ID. */
trait CenarioPasseio
{
    private bool $perfisSemeados = false;

    protected function criarTenant(string $slug = 'escola-a'): Tenant
    {
        $tenant = Tenant::create(['name' => 'Escola ' . Str::title($slug), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        if (!$this->perfisSemeados) {
            (new EscolaRbacSeeder())->run();
            (new PasseioRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        foreach (['escola' => 'Cadastro Escolar', 'passeio' => 'Passeios'] as $alias => $nome) {
            $modulo = Module::firstOrCreate(['alias' => $alias], ['name' => $nome, 'enabled' => true, 'monthly_fee_cents' => 0]);
            $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, $alias);
        }

        return $tenant;
    }

    /** @param list<string> $perfis passeio_coordenacao | passeio_apoio */
    protected function usuario(Tenant $tenant, array $perfis = ['passeio_coordenacao']): User
    {
        $user = User::create(['name' => 'Usuário ' . Str::random(5), 'email' => Str::random(10) . '@teste.gov.br', 'password' => bcrypt('secret')]);
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

    protected function alunoNaTurma(Tenant $tenant, string $nome, string $turma = '3º A'): Aluno
    {
        return $this->noTenant($tenant, function () use ($nome, $turma): Aluno {
            $turno = Turno::firstOrCreate(['nome' => 'Manhã'], ['ordem' => 1]);
            $t = Turma::firstOrCreate(['nome' => $turma, 'turno_id' => $turno->id, 'ano_letivo' => 2026]);

            return Aluno::create(['nome' => $nome, 'turma_id' => $t->id, 'situacao' => 'ativo']);
        });
    }

    /** @param array<string, mixed> $extra */
    protected function passeio(\App\Models\Tenant $tenant, array $extra = []): int
    {
        return (int) $this->como($this->usuario($tenant), $tenant)->postJson('/api/passeio/passeios', [
            'nome' => 'Museu Oscar Niemeyer', 'data_passeio' => '2026-10-20', 'data_limite_autorizacao' => '2026-10-10',
            'horario_saida' => '07:30', 'local_saida' => 'Portão da escola', 'destino' => 'Museu', 'cidade' => 'Curitiba',
            'valor_centavos' => 5000, 'responsavel' => 'Coordenação', ...$extra,
        ])->assertCreated()->json('id');
    }
}
