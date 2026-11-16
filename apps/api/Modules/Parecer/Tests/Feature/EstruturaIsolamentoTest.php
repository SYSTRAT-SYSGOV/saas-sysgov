<?php

declare(strict_types=1);

namespace Modules\Parecer\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Modules\Parecer\Models\Avaliacao;
use Modules\Parecer\Models\Habilidade;
use Modules\Parecer\Tests\Concerns\CenarioParecer;
use Modules\Parecer\Tests\TestCase;

/** Estrutura do módulo, isolamento A/B e carga inicial das habilidades. */
final class EstruturaIsolamentoTest extends TestCase
{
    use CenarioParecer;
    use RefreshDatabase;

    private const TABELAS = ['parecer_turmas', 'parecer_turma_funcoes', 'parecer_habilidades', 'parecer_avaliacoes', 'parecer_observacoes', 'parecer_notas', 'parecer_frequencias', 'parecer_ocorrencias'];

    public function test_module_json_depende_do_escola_e_fica_na_educacao(): void
    {
        $json = json_decode((string) file_get_contents(base_path('Modules/Parecer/module.json')), true);
        $this->assertContains('Escola', $json['requires']);
        $this->assertSame('educacao', $json['menu']['parent']);
    }

    public function test_todas_as_tabelas_tem_tenant_id(): void
    {
        foreach (self::TABELAS as $tabela) {
            $this->assertTrue(Schema::hasColumn($tabela, 'tenant_id'), "{$tabela} sem tenant_id");
        }
    }

    public function test_tenant_b_nao_ve_turmas_nem_alunos_do_tenant_a(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $turmaA = $this->turma($a, '3º A');
        $alunoA = $this->aluno($a, $turmaA, 'Aluno de A');
        $hab = $this->habilidade($a, 3, 'LP', 'Lê textos curtos.');
        $gestorA = $this->usuario($a);
        $gestorB = $this->usuario($b);

        $this->como($gestorA, $a)->putJson("/api/parecer/alunos/{$alunoA->id}/avaliacao", ['tri' => 1, 'materia' => 'LP', 'conceitos' => [$hab->id => 'A']])->assertOk();

        $this->como($gestorB, $b)->getJson('/api/parecer/turmas')->assertOk()->assertJsonCount(0, 'turmas');
        $this->como($gestorB, $b)->getJson("/api/parecer/alunos/{$alunoA->id}/avaliacao")->assertNotFound();
        $this->como($gestorB, $b)->getJson("/api/parecer/turmas/{$turmaA->id}/alunos")->assertNotFound();
        $this->assertSame(0, $this->noTenant($b, fn (): int => Avaliacao::query()->count()));
        $this->assertSame(1, $this->noTenant($a, fn (): int => Avaliacao::query()->count()));
    }

    public function test_primeiro_acesso_carrega_as_habilidades_de_referencia(): void
    {
        $t = $this->criarTenant();
        $this->como($this->usuario($t), $t)->getJson('/api/parecer/turmas')->assertOk();

        $this->noTenant($t, function (): void {
            $this->assertGreaterThan(300, Habilidade::query()->count());
            $this->assertSame('Articula corretamente as palavras.', Habilidade::query()->where('serie', 1)->where('materia', 'LP')->orderBy('ordem')->value('descricao'));
        });
    }

    public function test_turma_sem_serie_nao_aparece(): void
    {
        $t = $this->criarTenant();
        $this->turma($t, '3º A');
        $this->noTenant($t, fn () => \Modules\Escola\Models\Turma::create(['nome' => '7º B', 'turno_id' => \Modules\Escola\Models\Turno::first()->id, 'ano_letivo' => (int) date('Y')]));

        $this->como($this->usuario($t), $t)->getJson('/api/parecer/turmas')->assertOk()->assertJsonCount(1, 'turmas')->assertJsonPath('turmas.0.nome', '3º A');
    }
}
