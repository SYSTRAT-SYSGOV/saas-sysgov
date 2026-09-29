<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Unit;

use Modules\Cursos\Services\Relatorios\IndicadoresRelatorio;
use PHPUnit\Framework\TestCase;

/**
 * Relatórios do Cursos, tarefa 1.2 — cálculo único dos indicadores (design D2).
 */
final class IndicadoresRelatorioTest extends TestCase
{
    private IndicadoresRelatorio $indicadores;

    protected function setUp(): void
    {
        parent::setUp();
        $this->indicadores = new IndicadoresRelatorio();
    }

    public function test_taxa_de_conclusao(): void
    {
        $this->assertSame(80.0, $this->indicadores->taxaConclusao(8, 2));
        $this->assertSame(33.33, $this->indicadores->taxaConclusao(1, 2));
    }

    public function test_taxa_de_conclusao_sem_base_e_nula(): void
    {
        $this->assertNull($this->indicadores->taxaConclusao(0, 0));
    }

    /** Cenário "Curso sem avaliação": a média aparece como ausente (nula), não como zero. */
    public function test_curso_sem_avaliacao_tem_media_ausente(): void
    {
        $this->assertNull($this->indicadores->media(null, 0));
        // Soma presente mas nenhum valor computado: continua ausente, nunca 0,00.
        $this->assertNull($this->indicadores->media(0.0, 0));
    }

    public function test_media_arredonda_em_duas_casas(): void
    {
        $this->assertSame(63.33, $this->indicadores->media(190.0, 3));
    }

    /**
     * Cenário "Turma encerrada não muda": os indicadores são funções puras dos valores já
     * congelados (frequência e nota apuradas no encerramento) — as mesmas entradas sempre
     * devolvem a mesma saída, sem recalcular nada por conta própria. A imutabilidade dos valores
     * apurados em si é responsabilidade do EncerramentoService (Fase 2) e do RelatorioTurmaService
     * (tarefa 2.1), que usam os valores gravados em vez de recalcular a partir das tentativas.
     */
    public function test_indicadores_sao_deterministicos(): void
    {
        $primeira = $this->indicadores->media(637.5, 10);
        $segunda = $this->indicadores->media(637.5, 10);

        $this->assertSame($primeira, $segunda);
        $this->assertSame(63.75, $primeira);
    }

    /** Cenário "Certificado revogado": as horas certificadas do curso caem com a contagem. */
    public function test_horas_certificadas_cai_quando_um_certificado_e_revogado(): void
    {
        $antes = $this->indicadores->horasCertificadasMinutos(480, 2);
        $depois = $this->indicadores->horasCertificadasMinutos(480, 1);

        $this->assertSame(960, $antes);
        $this->assertSame(480, $depois);
        $this->assertLessThan($antes, $depois);
    }

    public function test_curso_sem_carga_horaria_certificada(): void
    {
        $this->assertSame(0, $this->indicadores->horasCertificadasMinutos(480, 0));
    }
}
