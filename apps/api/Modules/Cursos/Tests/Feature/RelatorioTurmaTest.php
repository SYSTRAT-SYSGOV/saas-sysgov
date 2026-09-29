<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Relatórios do Cursos, tarefa 2.1 — relatório da turma (resumo e tabela de inscritos).
 */
final class RelatorioTurmaTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararCenarioAvaliacao(curso: ['frequencia_minima' => 75]);
    }

    /** @return array<string, mixed> */
    private function relatorio(): array
    {
        return $this->como($this->admin, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/relatorio")->assertOk()->json();
    }

    public function test_resumo_de_turma_encerrada(): void
    {
        $agendamentos = $this->agendarAulasRealizadas(4);
        // A inscrição do cenário (75% de frequência) conclui.
        $this->registrarPresencas($this->inscricao, $agendamentos, 3);

        // Mais três participantes: dois concluem (75%+), um fica abaixo do mínimo.
        foreach (['Bea', 'Caio', 'Duda'] as $i => $nome) {
            $participante = $this->usuario($this->tenant, ['participante_cursos'], $nome);
            $inscricao = $this->inscrever($this->tenant, $this->turma, $participante);
            $this->registrarPresencas($inscricao, $agendamentos, $i < 2 ? 3 : 0);
        }

        $this->encerrarTurma()->assertOk();
        $relatorio = $this->relatorio();

        // 3 de 4 concluíram (75%): taxa de conclusão de 75%.
        $this->assertSame(3, $relatorio['resumo']['por_situacao']['concluida']);
        $this->assertSame(1, $relatorio['resumo']['por_situacao']['nao_concluida']);
        // PHP/JSON: um float de valor inteiro (75.0) vira número inteiro no JSON.
        $this->assertEquals(75.0, $relatorio['resumo']['taxa_conclusao']);
        $this->assertCount(4, $relatorio['inscritos']);
    }

    public function test_turma_ainda_aberta(): void
    {
        $relatorio = $this->relatorio();

        // Turma aberta: nenhuma inscrição pode estar concluida/nao_concluida ainda, taxa ausente.
        $this->assertNull($relatorio['resumo']['taxa_conclusao']);
        $this->assertSame('confirmada', $relatorio['inscritos'][0]['status']);
        $this->assertSame('em andamento', $relatorio['inscritos'][0]['resultado']);
    }

    public function test_instrutor_de_outra_turma_e_recusado(): void
    {
        $outroInstrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Outro Instrutor');

        $this->como($outroInstrutor, $this->tenant)
            ->getJson("/api/cursos/turmas/{$this->turma->id}/relatorio")
            ->assertForbidden();
    }

    public function test_turma_de_outro_orgao_retorna_404(): void
    {
        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroInstrutor = $this->usuario($outroTenant, ['instrutor_cursos'], 'Instrutor B');
        $cursoB = $this->cursoPublicado($outroTenant);
        $turmaB = $this->turmaAberta($outroTenant, $cursoB, $outroInstrutor);

        $this->como($this->admin, $this->tenant)
            ->getJson("/api/cursos/turmas/{$turmaB->id}/relatorio")
            ->assertNotFound();
    }

    public function test_totais_do_resumo_batem_com_a_tabela_de_inscritos(): void
    {
        foreach (['Bea', 'Caio'] as $nome) {
            $this->inscrever($this->tenant, $this->turma, $this->usuario($this->tenant, ['participante_cursos'], $nome));
        }

        $relatorio = $this->relatorio();
        $inscritos = $relatorio['inscritos'];
        $resumo = $relatorio['resumo'];

        $this->assertSame(array_sum($resumo['por_situacao']), count($inscritos));
        $mediaEsperada = round(array_sum(array_column(array_column($inscritos, 'frequencia'), 'percentual')) / count($inscritos), 2);
        $this->assertEquals($mediaEsperada, $resumo['frequencia_media']);
    }
}
