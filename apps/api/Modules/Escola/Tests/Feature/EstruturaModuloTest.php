<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Modules\Escola\Database\Seeders\EscolaRbacSeeder;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/**
 * Tarefas 1.2, 1.3 e 1.4: perfis, tabelas multi-tenant e gate do módulo nas rotas.
 */
final class EstruturaModuloTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    private const TABELAS = [
        'escola_unidades', 'escola_turnos', 'escola_turmas', 'escola_alunos', 'escola_aluno_contatos',
        'escola_materias', 'escola_turma_materias', 'escola_trimestres', 'escola_categorias_ocorrencia',
    ];

    public function test_toda_tabela_tem_tenant_id_e_indices_iniciados_por_ele(): void
    {
        foreach (self::TABELAS as $tabela) {
            $this->assertTrue(Schema::hasColumn($tabela, 'tenant_id'), "{$tabela} sem tenant_id");
            foreach (Schema::getIndexes($tabela) as $indice) {
                if ($indice['primary']) {
                    continue;
                }
                $this->assertSame('tenant_id', $indice['columns'][0], "{$tabela}: índice {$indice['name']} não começa por tenant_id");
            }
        }
    }

    public function test_seeder_de_perfis_e_idempotente_e_provisiona_no_tenant(): void
    {
        (new EscolaRbacSeeder())->run();
        (new EscolaRbacSeeder())->run();
        $this->assertSame(2, Role::where('module', 'escola')->count());

        $tenant = $this->criarTenant();
        foreach (EscolaRbacSeeder::PERFIS as $slug => $perfil) {
            $role = Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail();
            $this->assertEqualsCanonicalizing($perfil['permissions'], $role->permissions()->pluck('slug')->all());
        }
    }

    public function test_secretaria_nao_altera_a_estrutura(): void
    {
        $tenant = $this->criarTenant();
        $secretaria = $this->usuario($tenant, ['escola_secretaria']);

        $this->como($secretaria, $tenant)->postJson('/api/escola/materias', ['nome' => 'Matemática'])->assertStatus(403);
        $this->como($secretaria, $tenant)->getJson('/api/escola/materias')->assertOk();
        $this->assertDatabaseCount('escola_materias', 0);
    }

    public function test_rota_exige_login(): void
    {
        $this->getJson('/api/escola/turmas')->assertStatus(401);
    }

    public function test_modulo_desabilitado_responde_module_access_denied(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);
        $this->como($direcao, $tenant)->getJson('/api/escola/turmas')->assertOk();

        $this->habilitarModuloEscola($tenant, false);

        $this->como($direcao, $tenant)->getJson('/api/escola/turmas')
            ->assertStatus(403)
            ->assertJsonPath('code', 'MODULE_ACCESS_DENIED');
    }
}
