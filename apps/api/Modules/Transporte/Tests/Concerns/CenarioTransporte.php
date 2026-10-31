<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Escola\Models\Escola;
use Modules\Transporte\Database\Seeders\TransporteRbacSeeder;

/**
 * Cenários com o módulo habilitado pelo caminho real (perfis clonados + X-Tenant-ID). Empresas, motoristas e veículos
 * são criados pela API, que passa pelo Cadastro de Pessoas.
 */
trait CenarioTransporte
{
    private bool $perfisSemeados = false;

    private int $sequencia = 0;

    protected function criarTenant(string $slug = 'prefeitura-a'): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura ' . Str::title(str_replace('-', ' ', $slug)), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        if (!$this->perfisSemeados) {
            (new TransporteRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        $modulo = Module::firstOrCreate(['alias' => 'transporte'], ['name' => 'Transporte', 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
        app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'transporte');

        return $tenant;
    }

    /** @param list<string> $perfis transporte_coordenacao | transporte_operador | transporte_consulta */
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

    /** CPF válido, determinístico a partir de um número. */
    protected function cpf(int $n): string
    {
        $d = array_map('intval', str_split(str_pad((string) (123456000 + $n), 9, '0', STR_PAD_LEFT)));
        foreach ([10, 11] as $peso) {
            $soma = 0;
            foreach ($d as $i => $v) {
                $soma += $v * ($peso - $i);
            }
            $resto = ($soma * 10) % 11;
            $d[] = $resto === 10 ? 0 : $resto;
        }

        return implode('', $d);
    }

    /** CNPJ válido, determinístico a partir de um número. */
    protected function cnpj(int $n): string
    {
        $d = array_map('intval', str_split('11222333' . str_pad((string) $n, 4, '0', STR_PAD_LEFT)));
        foreach ([[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as $pesos) {
            $soma = 0;
            foreach ($pesos as $i => $peso) {
                $soma += $d[$i] * $peso;
            }
            $resto = $soma % 11;
            $d[] = $resto < 2 ? 0 : 11 - $resto;
        }

        return implode('', $d);
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    protected function dadosEmpresa(array $extra = []): array
    {
        $n = ++$this->sequencia;

        return [
            'cnpj' => $this->cnpj($n), 'razao_social' => "Viação {$n} Ltda", 'tipo' => 'prestadora', 'contrato_numero' => "CT-{$n}/2026",
            'vigencia_inicio' => now()->subMonths(2)->toDateString(), 'vigencia_fim' => now()->addYear()->toDateString(),
            ...$extra,
        ];
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    protected function dadosMotorista(array $extra = []): array
    {
        $n = ++$this->sequencia;

        return [
            'cpf' => $this->cpf($n), 'nome' => "Motorista {$n}", 'data_nascimento' => now()->subYears(40)->toDateString(),
            'cnh_numero' => 'CNH' . str_pad((string) $n, 8, '0', STR_PAD_LEFT), 'cnh_categoria' => 'D',
            'cnh_validade' => now()->addYears(2)->toDateString(),
            'curso_certificado' => "CURSO-{$n}", 'curso_validade' => now()->addYear()->toDateString(),
            'toxicologico_data' => now()->subMonths(6)->toDateString(), 'toxicologico_validade' => now()->addMonths(18)->toDateString(),
            ...$extra,
        ];
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    protected function dadosVeiculo(array $extra = []): array
    {
        $n = ++$this->sequencia;

        return [
            'origem' => 'propria', 'descricao' => "Ônibus escolar {$n}", 'placa' => 'ABC' . (1000 + $n), 'capacidade' => 40,
            'tipo_rede' => 'rural', 'tipologia_inep' => 3,
            ...$extra,
        ];
    }

    /** @param array<string, mixed> $extra */
    protected function criarEmpresa(Tenant $tenant, User $gestor, array $extra = []): int
    {
        return $this->como($gestor, $tenant)->postJson('/api/transporte/empresas', $this->dadosEmpresa($extra))->assertCreated()->json('data.id');
    }

    /** @param array<string, mixed> $extra */
    protected function criarMotorista(Tenant $tenant, User $gestor, array $extra = []): int
    {
        return $this->como($gestor, $tenant)->postJson('/api/transporte/motoristas', $this->dadosMotorista($extra))->assertCreated()->json('data.id');
    }

    /** @param array<string, mixed> $extra */
    protected function criarVeiculo(Tenant $tenant, User $gestor, array $extra = []): int
    {
        return $this->como($gestor, $tenant)->postJson('/api/transporte/veiculos', $this->dadosVeiculo($extra))->assertCreated()->json('data.id');
    }

    protected function registrarVistoria(Tenant $tenant, User $gestor, int $veiculoId, string $validade, ?string $data = null): void
    {
        $this->como($gestor, $tenant)->postJson("/api/transporte/veiculos/{$veiculoId}/vistorias", [
            'data_vistoria' => $data ?? now()->subMonths(5)->toDateString(), 'certificado' => 'CERT-' . Str::random(5), 'validade' => $validade,
        ])->assertCreated();
    }

    protected function criarEscola(Tenant $tenant, string $nome = 'Escola Municipal Rio Claro'): Escola
    {
        return Escola::create(['tenant_id' => $tenant->id, 'nome' => $nome]);
    }

    /** @param array<string, mixed> $extra */
    protected function criarParada(Tenant $tenant, User $gestor, array $extra = []): int
    {
        $n = ++$this->sequencia;

        return $this->como($gestor, $tenant)->postJson('/api/transporte/paradas', ['nome' => "Parada {$n}", 'latitude' => -25.43 - $n / 1000, 'longitude' => -49.27, ...$extra])
            ->assertCreated()->json('data.id');
    }

    /**
     * Rota com veículo próprio e vistoria vigente, pronta para receber itinerário.
     *
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    protected function dadosRota(Tenant $tenant, User $gestor, Escola $escola, array $extra = []): array
    {
        $n = ++$this->sequencia;

        return [
            'escola_id' => $escola->id, 'ano_letivo' => 2026, 'turno' => 'manha', 'tipo_rede' => 'rural', 'nome' => "Rota {$n}",
            'km_pavimentado' => 12.5, 'km_nao_pavimentado' => 7.25, ...$extra,
        ];
    }

    /** @param array<string, mixed> $extra */
    protected function criarRota(Tenant $tenant, User $gestor, Escola $escola, array $extra = []): int
    {
        return $this->como($gestor, $tenant)->postJson('/api/transporte/rotas', $this->dadosRota($tenant, $gestor, $escola, $extra))->assertCreated()->json('data.id');
    }
}
