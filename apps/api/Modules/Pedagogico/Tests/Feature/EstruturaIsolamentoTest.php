<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Pedagogico\Models\Ata;
use Modules\Pedagogico\Models\Cronograma;
use Modules\Pedagogico\Models\Frequencia;
use Modules\Pedagogico\Models\Nota;
use Modules\Pedagogico\Models\Ocorrencia;
use Modules\Pedagogico\Models\PreConselho;
use Modules\Pedagogico\Models\PreConselhoAluno;
use Modules\Pedagogico\Tests\Concerns\CenarioPedagogico;
use Modules\Pedagogico\Tests\TestCase;

/** Tarefas 3.1, 3.2 e 3.9 — estrutura, perfis e isolamento A/B de todos os models. */
final class EstruturaIsolamentoTest extends TestCase
{
    use CenarioPedagogico;
    use RefreshDatabase;

    public function test_module_json_declara_dependencia_do_escola(): void
    {
        $json = json_decode((string) file_get_contents(base_path('Modules/Pedagogico/module.json')), true);
        $this->assertContains('Escola', $json['requires']);
    }

    public function test_tabelas_tem_tenant_id_e_indices_iniciados_por_ele(): void
    {
        foreach (['pedagogico_notas', 'pedagogico_ocorrencias', 'pedagogico_pre_conselhos', 'pedagogico_pre_conselho_alunos', 'pedagogico_cronogramas', 'pedagogico_atas', 'pedagogico_frequencias'] as $tabela) {
            $this->assertTrue(Schema::hasColumn($tabela, 'tenant_id'));
            foreach (Schema::getIndexes($tabela) as $indice) {
                if (!$indice['primary']) {
                    $this->assertSame('tenant_id', $indice['columns'][0], "{$tabela}: {$indice['name']}");
                    $this->assertLessThanOrEqual(64, strlen($indice['name']), "{$tabela}: nome de índice longo demais para o MySQL");
                }
            }
        }
    }

    public function test_pedagogia_nao_lanca_notas(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $materia = $this->materia($tenant);
        $aluno = $this->aluno($tenant, $turma, 'Aluno');

        $this->como($this->usuario($tenant, ['pedagogico_pedagogia']), $tenant)->putJson('/api/pedagogico/notas', [
            'turma_id' => $turma->id, 'materia_id' => $materia->id, 'ano_letivo' => 2026, 'trimestre' => 1,
            'notas' => [['aluno_id' => $aluno->id, 'nota' => 7]],
        ])->assertStatus(403);
    }

    public function test_modulo_desabilitado_bloqueia(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);
        $this->como($direcao, $tenant)->getJson('/api/pedagogico/turmas')->assertOk();
        $this->habilitar($tenant, 'pedagogico', 'Módulo Pedagógico', false);
        $this->como($direcao, $tenant)->getJson('/api/pedagogico/turmas')->assertStatus(403)->assertJsonPath('code', 'MODULE_ACCESS_DENIED');
    }

    public function test_todos_os_models_sao_isolados_entre_tenants(): void
    {
        $tenantA = $this->criarTenant('escola-a', comModulos: false);
        $tenantB = $this->criarTenant('escola-b', comModulos: false);
        $idsA = $this->noTenant($tenantA, fn (): array => $this->montar('A'));
        $this->noTenant($tenantB, fn (): array => $this->montar('B'));

        foreach ($idsA as $model => $id) {
            $this->noTenant($tenantB, function () use ($model, $id, $tenantB): void {
                $this->assertSame(1, $model::count(), $model);
                $this->assertNull($model::find($id), $model);
                $this->assertSame($tenantB->id, $model::firstOrFail()->getAttribute('tenant_id'));
            });
        }
    }

    public function test_nota_de_aluno_de_outro_tenant_e_rejeitada(): void
    {
        $tenantA = $this->criarTenant('escola-a');
        $tenantB = $this->criarTenant('escola-b');
        $turmaA = $this->turma($tenantA);
        $materiaA = $this->materia($tenantA);
        $alunoB = $this->aluno($tenantB, $this->turma($tenantB), 'Do B');

        $this->como($this->usuario($tenantA), $tenantA)->putJson('/api/pedagogico/notas', [
            'turma_id' => $turmaA->id, 'materia_id' => $materiaA->id, 'ano_letivo' => 2026, 'trimestre' => 1,
            'notas' => [['aluno_id' => $alunoB->id, 'nota' => 7]],
        ])->assertStatus(422)->assertJsonValidationErrors('notas.0.aluno_id');
        $this->assertSame(0, Nota::withoutGlobalScopes()->count());
    }

    /** @return array<class-string<Model>, int> */
    private function montar(string $s): array
    {
        $turno = Turno::create(['nome' => "Manhã {$s}", 'ordem' => 1]);
        $turma = Turma::create(['nome' => "6º {$s}", 'turno_id' => $turno->id, 'ano_letivo' => 2026]);
        $aluno = Aluno::create(['nome' => "Aluno {$s}", 'turma_id' => $turma->id, 'situacao' => 'ativo']);
        $materia = Materia::create(['nome' => "Matemática {$s}"]);
        $categoria = \Modules\Escola\Models\CategoriaOcorrencia::create(['nome' => "Falta {$s}", 'cor' => '#ffffff']);
        $ficha = PreConselho::create(['turma_id' => $turma->id, 'materia_id' => $materia->id, 'ano_letivo' => 2026, 'periodo' => 1, 'data_registro' => '2026-04-10', 'desempenho_geral' => 'bom']);

        return [
            Nota::class => Nota::create(['aluno_id' => $aluno->id, 'materia_id' => $materia->id, 'ano_letivo' => 2026, 'trimestre' => 1, 'nota' => 7])->id,
            Ocorrencia::class => Ocorrencia::create(['aluno_id' => $aluno->id, 'categoria_id' => $categoria->id, 'data' => '2026-03-01', 'descricao' => 'x', 'severidade' => 'baixa'])->id,
            PreConselho::class => $ficha->id,
            PreConselhoAluno::class => PreConselhoAluno::create(['pre_conselho_id' => $ficha->id, 'aluno_id' => $aluno->id, 'nivel_atencao' => 'baixo'])->id,
            Cronograma::class => Cronograma::create(['ano_letivo' => 2026, 'periodo' => 1, 'data_inicio' => '2026-04-13', 'data_fim' => '2026-04-23'])->id,
            Ata::class => Ata::create(['turma_id' => $turma->id, 'ano_letivo' => 2026, 'periodo' => 1, 'data_reuniao' => '2026-04-30', 'status' => 'rascunho'])->id,
            Frequencia::class => Frequencia::create(['turma_id' => $turma->id, 'aluno_id' => $aluno->id, 'data' => '2026-03-02', 'presenca' => 'presente'])->id,
        ];
    }
}
