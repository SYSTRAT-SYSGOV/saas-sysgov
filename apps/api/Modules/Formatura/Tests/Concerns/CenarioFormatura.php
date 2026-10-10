<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Concerns;

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
use Modules\Formatura\Database\Seeders\FormaturaRbacSeeder;

/** Cenários com Escola e Formatura habilitados, pelo caminho real de perfis e X-Tenant-ID. */
trait CenarioFormatura
{
    private bool $perfisSemeados = false;

    protected function criarTenant(string $slug = 'escola-a'): Tenant
    {
        $tenant = Tenant::create(['name' => 'Escola ' . Str::title($slug), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        if (!$this->perfisSemeados) {
            (new EscolaRbacSeeder())->run();
            (new FormaturaRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        foreach (['escola' => 'Cadastro Escolar', 'formatura' => 'Formatura'] as $alias => $nome) {
            $modulo = Module::firstOrCreate(['alias' => $alias], ['name' => $nome, 'enabled' => true, 'monthly_fee_cents' => 0]);
            $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, $alias);
        }

        return $tenant;
    }

    /** @param list<string> $perfis formatura_comissao | formatura_tesouraria */
    protected function usuario(Tenant $tenant, array $perfis = ['formatura_comissao']): User
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

    protected function turma(Tenant $tenant, string $nome = '3º A', int $ano = 2026): Turma
    {
        return $this->noTenant($tenant, function () use ($nome, $ano): Turma {
            $turno = Turno::firstOrCreate(['nome' => 'Manhã'], ['ordem' => 1]);

            return Turma::firstOrCreate(['nome' => $nome, 'turno_id' => $turno->id, 'ano_letivo' => $ano]);
        });
    }

    protected function alunoNaTurma(Tenant $tenant, string $nome, string $turma = '3º A'): Aluno
    {
        $t = $this->turma($tenant, $turma);

        return $this->noTenant($tenant, fn (): Aluno => Aluno::create(['nome' => $nome, 'turma_id' => $t->id, 'situacao' => 'ativo']));
    }

    /** @param array<string, mixed> $extra */
    protected function configurar(Tenant $tenant, array $extra = []): void
    {
        $this->como($this->usuario($tenant), $tenant)->putJson('/api/formatura/configuracao', [
            'ano_letivo' => 2026, 'titulo' => 'Formatura 2026', 'tipo_calculo' => 'por_pessoa',
            'valor_base_centavos' => 15000, 'convidados_incluidos_padrao' => 2, 'max_parcelas' => 12,
            'formas_pagamento' => ['pix', 'dinheiro'], 'chaves_pix' => ['escola@pix.gov.br'],
            'turmas_ids' => [$this->turma($tenant)->id], ...$extra,
        ])->assertOk();
    }
}
