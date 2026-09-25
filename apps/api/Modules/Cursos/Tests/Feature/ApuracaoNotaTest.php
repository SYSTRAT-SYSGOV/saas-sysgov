<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Services\ApuracaoConclusaoService;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 5.2 — a nota compõe o critério de conclusão no encerramento.
 */
final class ApuracaoNotaTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    /**
     * @param array<string, mixed> $curso atributos do curso; frequência mínima de 75% (5 aulas: 4 presenças = 80%, 5 = 100%)
     */
    private function prepararTurma(array $curso): void
    {
        $this->prepararCenarioAvaliacao(curso: ['frequencia_minima' => 75, ...$curso]);
    }

    private function inscricaoAtual(): Inscricao
    {
        return $this->noTenant($this->tenant, fn () => Inscricao::query()->findOrFail($this->inscricao->id));
    }

    public function test_nota_insuficiente_reprova_mesmo_com_frequencia_total(): void
    {
        $this->prepararTurma(['nota_minima' => 7]);
        $aulas = $this->agendarAulasRealizadas(5);
        $this->registrarPresencas($this->inscricao, $aulas, 5);
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 6.5);

        $this->encerrarTurma()->assertOk()->assertJsonPath('concluidas', 0)->assertJsonPath('nao_concluidas', 1);

        $inscricao = $this->inscricaoAtual();
        $this->assertSame('nao_concluida', $inscricao->status);
        $this->assertSame('100.00', $inscricao->frequencia_apurada);
        $this->assertSame('6.50', $inscricao->nota_apurada);
        $this->assertNull($inscricao->concluida_em);
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Certificado::count()));
    }

    public function test_frequencia_e_nota_suficientes_concluem(): void
    {
        $this->prepararTurma(['nota_minima' => 7]);
        $aulas = $this->agendarAulasRealizadas(5);
        $this->registrarPresencas($this->inscricao, $aulas, 4);
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 7.0);

        $this->encerrarTurma()->assertOk()->assertJsonPath('concluidas', 1);

        $inscricao = $this->inscricaoAtual();
        $this->assertSame('concluida', $inscricao->status);
        $this->assertSame('80.00', $inscricao->frequencia_apurada);
        $this->assertSame('7.00', $inscricao->nota_apurada);
        $this->assertNotNull($inscricao->concluida_em);
    }

    public function test_nota_alta_nao_compensa_frequencia_insuficiente(): void
    {
        $this->prepararTurma(['nota_minima' => 7]);
        $aulas = $this->agendarAulasRealizadas(5);
        $this->registrarPresencas($this->inscricao, $aulas, 3);
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 10.0);

        $this->encerrarTurma()->assertOk()->assertJsonPath('nao_concluidas', 1);

        $inscricao = $this->inscricaoAtual();
        $this->assertSame('nao_concluida', $inscricao->status);
        $this->assertSame('10.00', $inscricao->nota_apurada);
    }

    public function test_nota_minima_zero_exige_apenas_existir_avaliacao_publicada(): void
    {
        $this->prepararTurma(['nota_minima' => 0]);
        $aulas = $this->agendarAulasRealizadas(4);
        $this->registrarPresencas($this->inscricao, $aulas, 4);
        $this->avaliacaoDireta();

        $this->encerrarTurma()->assertOk()->assertJsonPath('concluidas', 1);

        $this->assertSame('0.00', $this->inscricaoAtual()->nota_apurada);
    }

    public function test_curso_sem_nota_minima_conclui_pela_frequencia_e_grava_a_nota_informativa(): void
    {
        $this->prepararTurma([]);
        $aulas = $this->agendarAulasRealizadas(4);
        $this->registrarPresencas($this->inscricao, $aulas, 4);
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 2.0);

        $this->encerrarTurma()->assertOk()->assertJsonPath('concluidas', 1);

        $inscricao = $this->inscricaoAtual();
        $this->assertSame('concluida', $inscricao->status);
        $this->assertSame('2.00', $inscricao->nota_apurada);
    }

    public function test_curso_sem_avaliacao_nao_grava_nota(): void
    {
        $this->prepararTurma([]);
        $aulas = $this->agendarAulasRealizadas(4);
        $this->registrarPresencas($this->inscricao, $aulas, 4);

        $this->encerrarTurma()->assertOk()->assertJsonPath('concluidas', 1);

        $this->assertNull($this->inscricaoAtual()->nota_apurada);
    }

    public function test_apurar_devolve_conclusao_frequencia_e_nota(): void
    {
        $this->prepararTurma(['nota_minima' => 7]);
        $aulas = $this->agendarAulasRealizadas(4);
        $this->registrarPresencas($this->inscricao, $aulas, 4);
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 8.25);

        $apurado = $this->noTenant($this->tenant, fn () => app(ApuracaoConclusaoService::class)->apurar($this->inscricao->load('turma.curso')));

        $this->assertSame(['concluiu' => true, 'frequencia' => 100.0, 'nota' => 8.25], $apurado);
    }

    public function test_alterar_a_nota_minima_depois_do_encerramento_nao_muda_o_resultado(): void
    {
        $this->prepararTurma(['nota_minima' => 7]);
        $aulas = $this->agendarAulasRealizadas(4);
        $this->registrarPresencas($this->inscricao, $aulas, 4);
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 6.0);
        $this->encerrarTurma()->assertOk();
        $this->assertSame('nao_concluida', $this->inscricaoAtual()->status);

        $this->noTenant($this->tenant, fn () => Curso::query()->whereKey($this->curso->id)->update(['nota_minima' => 5]));

        $inscricao = $this->inscricaoAtual();
        $this->assertSame('nao_concluida', $inscricao->status);
        $this->assertSame('6.00', $inscricao->nota_apurada);
    }
}
