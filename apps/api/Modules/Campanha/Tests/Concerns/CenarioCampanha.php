<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Campanha\Database\Seeders\CampanhaRbacSeeder;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Membro;
use Modules\Campanha\Models\Referencia\RefMandatario;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Support\CampanhaContext;

/** Cenários com o módulo Campanha habilitado, pelo caminho real de perfis, X-Tenant-ID e X-Campanha-ID. */
trait CenarioCampanha
{
    private bool $perfisSemeados = false;

    protected function criarTenant(string $slug = 'partido-a', bool $comModulo = true): Tenant
    {
        $tenant = Tenant::create(['name' => 'Cliente ' . Str::title(str_replace('-', ' ', $slug)), 'slug' => $slug, 'type' => 'parceiro', 'status' => 'active']);
        if (!$this->perfisSemeados) {
            (new CampanhaRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        if ($comModulo) {
            $modulo = Module::firstOrCreate(['alias' => 'campanha'], ['name' => 'Campanha Política', 'enabled' => true, 'monthly_fee_cents' => 0]);
            $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'campanha');
        }

        return $tenant;
    }

    /** @param list<string> $perfis campanha_coordenacao_geral | campanha_coordenacao | campanha_consulta */
    protected function usuario(Tenant $tenant, array $perfis = ['campanha_coordenacao_geral']): User
    {
        $user = User::create(['name' => 'Usuário ' . Str::random(5), 'email' => Str::random(10) . '@teste.com.br', 'password' => bcrypt('secret')]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);
        foreach ($perfis as $slug) {
            $user->roles()->attach(Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail()->id, ['tenant_id' => $tenant->id]);
        }
        $user->clearPermissionCache();

        return $user;
    }

    protected function como(User $user, Tenant $tenant, ?Campanha $campanha = null): static
    {
        // withHeader acumula entre requisições do mesmo teste: cada chamada começa sem cabeçalhos.
        $requisicao = $this->flushHeaders()->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);

        return $campanha !== null ? $requisicao->withHeader('X-Campanha-ID', (string) $campanha->id) : $requisicao;
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

    /** Executa na campanha de trabalho (fora de requisição). */
    protected function naCampanha(Campanha $campanha, callable $acao): mixed
    {
        return $this->noTenant(Tenant::query()->findOrFail($campanha->tenant_id), function () use ($campanha, $acao): mixed {
            $context = app(CampanhaContext::class);
            $context->set($campanha);
            try {
                return $acao();
            } finally {
                $context->clear();
            }
        });
    }

    /** @param array<string, mixed> $extra */
    protected function campanha(Tenant $tenant, array $extra = []): Campanha
    {
        return $this->noTenant($tenant, fn (): Campanha => Campanha::create(['nome' => 'Deputado Estadual 2026', 'ano' => 2026, 'cargo' => 'Deputado Estadual', 'uf' => 'PR', ...$extra]));
    }

    protected function membro(Campanha $campanha, User $user): void
    {
        $this->noTenant(Tenant::query()->findOrFail($campanha->tenant_id), fn () => Membro::create(['campanha_id' => $campanha->id, 'user_id' => $user->id]));
    }

    /** Base pública mínima: Curitiba, Londrina e Ponta Grossa (PR), Joinville (SC) e prefeitos/vices de 2024. */
    protected function basePublica(): void
    {
        $municipios = [
            [4106902, 'PR', 'Curitiba', 'Curitiba', 1832183, 1410995],
            [4113700, 'PR', 'Londrina', 'Londrina', 584465, 393986],
            [4119905, 'PR', 'Ponta Grossa', 'Ponta Grossa', 371718, 263000],
            [4209102, 'SC', 'Joinville', 'Joinville', 654888, 480000],
        ];
        foreach ($municipios as [$ibge, $uf, $nome, $intermediaria, $populacao, $eleitores]) {
            RefMunicipio::query()->create([
                'codigo_ibge' => $ibge, 'uf' => $uf, 'nome' => $nome, 'nome_normalizado' => RefMunicipio::normalizar($nome),
                'regiao_intermediaria' => $intermediaria, 'populacao' => $populacao, 'ano_populacao' => 2026, 'eleitores' => $eleitores, 'ano_eleitorado' => 2026,
            ]);
        }
        foreach ([[4106902, 'prefeito', 'EDUARDO PIMENTEL', 'PSD'], [4106902, 'vice_prefeito', 'PAULO MARTINS', 'PL'], [4113700, 'prefeito', 'TIAGO AMARAL', 'PSD'], [4113700, 'vereador', 'VEREADORA ELEITA', 'PL']] as [$ibge, $cargo, $nome, $partido]) {
            RefMandatario::query()->create(['uf' => 'PR', 'codigo_ibge' => $ibge, 'cargo' => $cargo, 'nome' => $nome, 'nome_urna' => $nome, 'partido' => $partido, 'numero' => '55', 'situacao' => 'ELEITO', 'ano_eleicao' => 2024]);
        }
    }
}
