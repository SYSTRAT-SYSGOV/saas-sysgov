<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Tests\TestCase;

/**
 * Base dos testes do módulo: cria tenants com o módulo habilitado e usuários
 * com um papel contendo exatamente as permissões informadas.
 */
abstract class CemiteriosTestCase extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    protected function criarTenant(string $slug = 'pref-a'): Tenant
    {
        $tenant = Tenant::create(['name' => "Prefeitura {$slug}", 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);

        $modulo = Module::firstOrCreate(['alias' => 'cemiterios'], ['name' => 'Cemiterios', 'enabled' => true]);
        $modulo->tenants()->attach($tenant->id, ['enabled' => true]);

        return $tenant;
    }

    /** @param list<string> $permissoes */
    protected function usuario(Tenant $tenant, array $permissoes = []): User
    {
        $user = User::create([
            'name' => 'Usuário ' . Str::random(5),
            'email' => Str::random(8) . '@teste.gov.br',
            'password' => bcrypt('secret'),
        ]);

        $role = Role::create([
            'name' => 'Papel ' . Str::random(5), 'slug' => 'papel_' . Str::random(8),
            'scope' => 'tenant', 'tenant_id' => $tenant->id, 'guard_name' => 'web',
        ]);
        $role->permissions()->sync(array_map(
            fn (string $slug) => Permission::firstOrCreate(['slug' => $slug], ['name' => $slug, 'module' => 'cemiterios', 'guard_name' => 'web'])->id,
            // cemiterios.view é pré-requisito da plataforma para entrar no módulo (gate "module").
            array_unique(['cemiterios.view', ...$permissoes])
        ));

        return $this->vincular($user, $tenant, $role);
    }

    protected function vincular(User $user, Tenant $tenant, Role $role): User
    {
        $user->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true, 'role_id' => $role->id]);
        UserModuleAccess::create([
            'user_id' => $user->id, 'tenant_id' => $tenant->id, 'module_alias' => 'cemiterios',
            'status' => 'active', 'valid_from' => now()->subDay(),
        ]);

        return $user;
    }

    /** Todas as permissões do módulo. */
    protected function admin(Tenant $tenant): User
    {
        $modulo = json_decode((string) file_get_contents(__DIR__ . '/../module.json'), true);

        return $this->usuario($tenant, array_keys($modulo['permissions']));
    }

    protected function como(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    protected function noTenant(Tenant $tenant): void
    {
        app(TenantContext::class)->set($tenant);
    }

    /** Jazigo novo (tenant corrente), opcionalmente já concedido. */
    protected function novoJazigo(int $capacidade = 2, bool $concedido = true, string $tipo = 'jazigo'): Jazigo
    {
        $parque = Cemiterio::create(['codigo' => 'C' . Str::random(6), 'nome' => 'Central']);
        $setor = $parque->setores()->create(['codigo' => 'Q1', 'tipo_zona' => 'jazigos']);
        $jazigo = Jazigo::create([
            'park_id' => $parque->id, 'sector_id' => $setor->id, 'codigo' => 'J' . Str::random(5),
            'tipo' => $tipo, 'capacidade' => $capacidade,
        ])->refresh();

        if ($concedido) {
            $this->concessao($jazigo);
            app(JazigoEstadoService::class)->recalcular($jazigo, 'Concessão ativada');
        }

        return $jazigo->refresh();
    }

    protected function concessao(Jazigo $jazigo, ?Concessionario $titular = null, string $termino = '+5 years'): Concessao
    {
        $titular ??= Concessionario::create(['nome' => 'Maria Titular', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);

        return Concessao::create([
            'numero' => 'CON-' . Str::random(6), 'plot_id' => $jazigo->id, 'holder_id' => $titular->id,
            'modalidade' => 'temporaria', 'inicio' => today()->toDateString(),
            'termino' => today()->modify($termino)->toDateString(),
        ]);
    }

    /** Inumação confirmada diretamente no banco (sem passar pela API). */
    protected function sepultado(Jazigo $jazigo, string $sepultadoEm, ?string $nascimento = '1950-01-01'): Inumacao
    {
        $falecido = Falecido::create([
            'nome' => 'Falecido ' . Str::random(4), 'nascimento' => $nascimento,
            'falecimento' => $sepultadoEm, 'certidao_numero' => Str::random(10),
        ]);
        app(JazigoEstadoService::class)->alterarOcupacao($jazigo->refresh(), 1, 'teste');

        return Inumacao::create([
            'deceased_id' => $falecido->id, 'plot_id' => $jazigo->id,
            'sepultado_em' => $sepultadoEm, 'carencia_desde' => $sepultadoEm,
        ]);
    }

    /** Gera um CPF com dígitos verificadores válidos. */
    protected function cpfValido(): string
    {
        $n = array_map(fn () => random_int(0, 9), range(1, 9));
        foreach ([10, 11] as $peso) {
            $soma = 0;
            foreach ($n as $i => $d) {
                $soma += $d * ($peso - $i);
            }
            $n[] = ((10 * $soma) % 11) % 10;
        }

        return implode('', $n);
    }
}
