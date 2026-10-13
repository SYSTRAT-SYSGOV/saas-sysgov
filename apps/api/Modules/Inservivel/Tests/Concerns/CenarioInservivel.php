<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Inservivel\Database\Seeders\InservivelRbacSeeder;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Services\ConfiguracaoService;
use Modules\Inservivel\Services\ParametrosService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;

/**
 * Cenários com o módulo Inservível habilitado, pelo caminho real de perfis e X-Tenant-ID. Cada tenant ganha um
 * Organograma mínimo: Prefeitura → Secretaria de Administração (SMAD) → Setor de Patrimônio, e Secretaria de
 * Educação (SMED) → Escola Municipal.
 */
trait CenarioInservivel
{
    private bool $perfisSemeados = false;

    /** @var array<int, array<string, OrgUnit>> */
    protected array $unidades = [];

    protected function criarTenant(string $slug = 'prefeitura-a', bool $comModulo = true): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura ' . Str::title(str_replace('-', ' ', $slug)), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        if (!$this->perfisSemeados) {
            (new InservivelRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        if ($comModulo) {
            $modulo = Module::firstOrCreate(['alias' => 'inservivel'], ['name' => 'Inservível & Doações', 'enabled' => true, 'monthly_fee_cents' => 0]);
            $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'inservivel');
        }
        $this->noTenant($tenant, function () use ($tenant): void {
            $u = fn (string $nome, string $code, string $tipo, int $nivel, string $path, ?string $sigla = null) => OrgUnit::create([
                'name' => $nome, 'code' => $code, 'acronym' => $sigla, 'type' => $tipo, 'level' => $nivel, 'path' => $path, 'is_active' => true,
            ]);
            $this->unidades[$tenant->id] = [
                'prefeitura' => $u('Prefeitura', 'PREF', 'prefeitura', 1, '1'),
                'smad' => $u('Secretaria Municipal de Administração', 'SMAD', 'secretaria', 2, '1.1', 'SMAD'),
                'patrimonio' => $u('Setor de Patrimônio', 'PAT', 'setor', 3, '1.1.1'),
                'smed' => $u('Secretaria Municipal de Educação', 'SMED', 'secretaria', 2, '1.2', 'SMED'),
                'escola' => $u('Escola Municipal Centro', 'EMC', 'setor', 3, '1.2.1'),
            ];
        });

        return $tenant;
    }

    protected function unidade(Tenant $tenant, string $chave): OrgUnit
    {
        return $this->unidades[$tenant->id][$chave];
    }

    /** @param list<string> $perfis inservivel_gestor | inservivel_servidor | inservivel_entidade */
    protected function usuario(Tenant $tenant, array $perfis = ['inservivel_gestor'], ?string $lotacao = null): User
    {
        $user = User::create(['name' => 'Usuário ' . Str::random(5), 'email' => Str::lower(Str::random(10)) . '@teste.com.br', 'password' => bcrypt('secret')]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);
        foreach ($perfis as $slug) {
            $user->roles()->attach(Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail()->id, ['tenant_id' => $tenant->id]);
        }
        $user->clearPermissionCache();
        if ($lotacao !== null) {
            $this->noTenant($tenant, fn () => OrgUnitUser::create(['org_unit_id' => $this->unidade($tenant, $lotacao)->id, 'user_id' => $user->id, 'role' => 'membro', 'is_primary' => true]));
        }

        return $user;
    }

    protected function como(User $user, Tenant $tenant): static
    {
        // withHeader acumula entre requisições do mesmo teste: cada chamada começa sem cabeçalhos.
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

    protected function idPapel(Tenant $tenant, PapelSituacao $papel): int
    {
        return $this->noTenant($tenant, fn (): int => app(ParametrosService::class)->idDoPapel($papel));
    }

    /** @param array<string, mixed> $extra */
    protected function bem(Tenant $tenant, string $patrimonio = '1001', PapelSituacao $papel = PapelSituacao::Inservivel, array $extra = []): Bem
    {
        return $this->noTenant($tenant, fn (): Bem => Bem::create([
            'numero_patrimonial' => $patrimonio,
            'descricao' => "Cadeira giratória {$patrimonio}",
            'situacao_id' => app(ParametrosService::class)->idDoPapel($papel),
            'secretaria_unit_id' => $this->unidade($tenant, 'smad')->id,
            'valor_contabil_cents' => 10000,
            'valor_avaliado_cents' => 5000,
            ...$extra,
        ]));
    }

    /** CNPJ válido a partir de 12 dígitos-base (completa os verificadores). */
    protected function cnpj(string $base): string
    {
        $base = str_pad(substr(preg_replace('/\D/', '', $base), 0, 12), 12, '0', STR_PAD_LEFT);
        foreach ([[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as $pesos) {
            $soma = 0;
            foreach ($pesos as $i => $peso) {
                $soma += (int) $base[$i] * $peso;
            }
            $resto = $soma % 11;
            $base .= (string) ($resto < 2 ? 0 : 11 - $resto);
        }

        return $base;
    }

    /**
     * Entidade com conta (perfil Entidade) e os documentos obrigatórios enviados.
     *
     * @param array<string, string|null> $validades chave do documento => validade (padrão: sem validade)
     */
    protected function entidade(Tenant $tenant, StatusEntidade $status = StatusEntidade::Habilitada, string $base = '112223330001', array $validades = [], int $lotesGanhos = 0): Entidade
    {
        $user = $this->usuario($tenant, ['inservivel_entidade']);

        return $this->noTenant($tenant, function () use ($user, $status, $base, $validades, $lotesGanhos): Entidade {
            $entidade = Entidade::query()->create([
                'user_id' => $user->id, 'razao_social' => "Associação {$base}", 'nome_fantasia' => "ONG {$base}", 'cnpj' => $this->cnpj($base),
                'endereco' => 'Rua A, 10', 'cep' => '80000000', 'cidade' => 'Cidade Exemplo', 'uf' => 'PR', 'celular' => '41999990000', 'email' => $user->email,
                'representante_legal' => 'Maria Silva', 'cpf_representante' => '52998224725', 'cargo_representante' => 'Presidente',
                'tempo_funcionamento_anos' => 5, 'area_atuacao' => 'Assistência social', 'finalidade' => 'Apoio a famílias', 'numero_beneficiarios' => 100,
                'status' => $status, 'lotes_ganhos' => $lotesGanhos,
            ]);
            foreach (app(ConfiguracaoService::class)->chavesObrigatorias() as $chave) {
                $entidade->documentos()->create(['tipo' => $chave, 'caminho' => "inservivel/teste/{$chave}.pdf", 'mime' => 'application/pdf', 'data_envio' => now()->toDateString(), 'validade' => $validades[$chave] ?? null, 'situacao' => 'aprovado']);
            }

            return $entidade;
        });
    }

    protected function contaDa(Entidade $entidade): User
    {
        return User::query()->findOrFail($entidade->user_id);
    }
}
