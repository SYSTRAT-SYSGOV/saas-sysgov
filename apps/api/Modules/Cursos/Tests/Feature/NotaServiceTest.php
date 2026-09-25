<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\NotaService;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 5.1 — nota final da inscrição (média ponderada pela melhor tentativa).
 */
final class NotaServiceTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararCenarioAvaliacao();
    }

    private function nota(?Inscricao $inscricao = null): ?float
    {
        return $this->noTenant($this->tenant, fn () => app(NotaService::class)->notaFinal(($inscricao ?? $this->inscricao)->load('turma')));
    }

    public function test_media_ponderada_pela_melhor_tentativa(): void
    {
        $a = $this->avaliacaoDireta(peso: 1, titulo: 'A');
        $b = $this->avaliacaoDireta(peso: 3, titulo: 'B');
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 6.0, numero: 1);
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 8.0, numero: 2);
        $this->tentativaDireta($b, $this->inscricao, 'corrigida', 9.0);

        // (8 × 1 + 9 × 3) ÷ 4 = 8,75: vale a melhor tentativa de A, não a última nem a média.
        $this->assertSame(8.75, $this->nota());
    }

    public function test_melhor_tentativa_vale_mesmo_quando_a_ultima_e_pior(): void
    {
        $a = $this->avaliacaoDireta();
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 9.0, numero: 1);
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 2.0, numero: 2);

        $this->assertSame(9.0, $this->nota());
    }

    public function test_avaliacao_nao_feita_conta_como_zero(): void
    {
        $feita = $this->avaliacaoDireta(titulo: 'Feita');
        $this->avaliacaoDireta(titulo: 'Não feita');
        $this->tentativaDireta($feita, $this->inscricao, 'corrigida', 10.0);

        $this->assertSame(5.0, $this->nota());
    }

    public function test_so_tentativas_corrigidas_contam(): void
    {
        $a = $this->avaliacaoDireta();
        $this->tentativaDireta($a, $this->inscricao, 'aguardando_correcao', null, numero: 1);
        $this->tentativaDireta($a, $this->inscricao, 'em_andamento', null, numero: 2);

        $this->assertSame(0.0, $this->nota());

        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 7.5, numero: 3);
        $this->assertSame(7.5, $this->nota());
    }

    public function test_avaliacao_nao_publicada_nao_entra_na_conta(): void
    {
        $publicada = $this->avaliacaoDireta(titulo: 'Publicada');
        $rascunho = $this->avaliacaoDireta(publicada: false, titulo: 'Rascunho');
        $this->tentativaDireta($publicada, $this->inscricao, 'corrigida', 8.0);
        $this->tentativaDireta($rascunho, $this->inscricao, 'corrigida', 0.0);

        $this->assertSame(8.0, $this->nota());
    }

    public function test_curso_sem_avaliacao_publicada_nao_tem_nota(): void
    {
        $this->assertNull($this->nota());

        $this->avaliacaoDireta(publicada: false);
        $this->assertNull($this->nota());
    }

    public function test_tentativa_de_outra_inscricao_nao_conta(): void
    {
        $a = $this->avaliacaoDireta();
        $outro = $this->usuario($this->tenant, ['participante_cursos'], 'Outro aluno');
        $outraInscricao = $this->inscrever($this->tenant, $this->turma, $outro);
        $this->tentativaDireta($a, $outraInscricao, 'corrigida', 10.0);
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 4.0);

        $this->assertSame(4.0, $this->nota());
        $this->assertSame(10.0, $this->nota($outraInscricao));
    }

    public function test_arredonda_em_duas_casas(): void
    {
        $a = $this->avaliacaoDireta(peso: 1, titulo: 'A');
        $b = $this->avaliacaoDireta(peso: 2, titulo: 'B');
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 10.0);
        $this->tentativaDireta($b, $this->inscricao, 'corrigida', 3.33);

        // (10 + 6,66) ÷ 3 = 5,5533… → 5,55
        $this->assertSame(5.55, $this->nota());
    }

    public function test_exibida_e_parcial_com_a_turma_aberta_e_apurada_depois_do_encerramento(): void
    {
        $a = $this->avaliacaoDireta();
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 6.0);
        $servico = app(NotaService::class);

        $this->assertSame(6.0, $this->noTenant($this->tenant, fn () => $servico->exibida($this->inscricao->load('turma'))));

        // Turma encerrada: vale o que ficou gravado, mesmo que as tentativas mudem depois.
        $this->noTenant($this->tenant, function (): void {
            Inscricao::query()->whereKey($this->inscricao->id)->update(['nota_apurada' => 6.0]);
            Turma::query()->whereKey($this->turma->id)->update(['status' => 'encerrada']);
        });
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 10.0, numero: 2);

        $this->assertSame(6.0, $this->noTenant($this->tenant, fn () => $servico->exibida(Inscricao::query()->with('turma')->findOrFail($this->inscricao->id))));
    }
}
