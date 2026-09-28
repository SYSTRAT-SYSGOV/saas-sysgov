<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Contracts\ComLiberacao;
use Modules\Cursos\Enums\RegraLiberacao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Services\LiberacaoService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 1.3 — liberação programada por turma (design D2).
 */
final class LiberacaoServiceTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $instrutor;

    private Curso $curso;

    private LiberacaoService $servico;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->curso = $this->cursoPublicado($this->tenant);
        $this->servico = new LiberacaoService();
    }

    private function item(RegraLiberacao $regra, ?int $dias = null, ?int $aulaId = null): ComLiberacao
    {
        return new class ($regra, $dias, $aulaId) implements ComLiberacao {
            public function __construct(
                private readonly RegraLiberacao $regra,
                private readonly ?int $dias,
                private readonly ?int $aulaId,
            ) {
            }

            public function regraLiberacao(): RegraLiberacao
            {
                return $this->regra;
            }

            public function diasLiberacao(): ?int
            {
                return $this->dias;
            }

            public function aulaLiberacaoId(): ?int
            {
                return $this->aulaId;
            }
        };
    }

    private function sp(string $dataHora): CarbonImmutable
    {
        return CarbonImmutable::parse($dataHora, 'America/Sao_Paulo');
    }

    public function test_imediata_esta_sempre_liberada(): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);

        $situacao = $this->servico->situacao($this->item(RegraLiberacao::Imediata), $turma);

        $this->assertTrue($situacao->liberado);
        $this->assertNull($situacao->preverEm);
        $this->assertFalse($situacao->aguardandoAgendamento);
    }

    public function test_inicio_da_aula_so_libera_a_partir_do_horario_agendado(): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
        $aula = $this->aula($this->tenant, $this->curso);
        $this->agendamento($this->tenant, $turma, $aula, $this->sp('2026-10-20 14:00:00'));
        $item = $this->item(RegraLiberacao::InicioAula, aulaId: $aula->id);

        $antes = $this->noTenant($this->tenant, fn () => $this->servico->situacao($item, $turma, $this->sp('2026-10-20 13:59:00')));
        $this->assertFalse($antes->liberado);
        $this->assertTrue($this->sp('2026-10-20 14:00:00')->equalTo($antes->preverEm));

        $noHorario = $this->noTenant($this->tenant, fn () => $this->servico->situacao($item, $turma, $this->sp('2026-10-20 14:00:00')));
        $this->assertTrue($noHorario->liberado);
        $this->assertNull($noHorario->preverEm);
    }

    public function test_aula_sem_agendamento_na_turma_fica_aguardando_agendamento(): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
        $aula = $this->aula($this->tenant, $this->curso);
        $item = $this->item(RegraLiberacao::InicioAula, aulaId: $aula->id);

        $situacao = $this->noTenant($this->tenant, fn () => $this->servico->situacao($item, $turma, $this->sp('2030-01-01 00:00:00')));

        $this->assertFalse($situacao->liberado);
        $this->assertNull($situacao->preverEm);
        $this->assertTrue($situacao->aguardandoAgendamento);
    }

    public function test_agendamento_de_outra_turma_nao_libera(): void
    {
        $turmaA = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['nome' => 'Turma A']);
        $turmaB = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['nome' => 'Turma B']);
        $aula = $this->aula($this->tenant, $this->curso);
        $this->agendamento($this->tenant, $turmaA, $aula, $this->sp('2026-10-20 14:00:00'));
        $item = $this->item(RegraLiberacao::InicioAula, aulaId: $aula->id);

        $situacao = $this->noTenant($this->tenant, fn () => $this->servico->situacao($item, $turmaB, $this->sp('2026-10-21 10:00:00')));

        $this->assertTrue($situacao->aguardandoAgendamento);
        $this->assertFalse($situacao->liberado);
    }

    public function test_inicio_da_aula_sem_aula_vinculada_fica_aguardando_agendamento(): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);

        $situacao = $this->servico->situacao($this->item(RegraLiberacao::InicioAula), $turma);

        $this->assertTrue($situacao->aguardandoAgendamento);
        $this->assertFalse($situacao->liberado);
    }

    public function test_dias_apos_o_inicio_viram_a_meia_noite_de_brasilia(): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['data_inicio' => '2026-10-10', 'data_fim' => '2026-11-10']);
        $item = $this->item(RegraLiberacao::DiasAposInicio, dias: 7);

        $vespera = $this->servico->situacao($item, $turma, $this->sp('2026-10-16 23:59:59'));
        $this->assertFalse($vespera->liberado);
        $this->assertTrue($this->sp('2026-10-17 00:00:00')->equalTo($vespera->preverEm));

        $virada = $this->servico->situacao($item, $turma, $this->sp('2026-10-17 00:00:00'));
        $this->assertTrue($virada->liberado);
        $this->assertNull($virada->preverEm);
    }

    public function test_zero_dias_libera_na_meia_noite_do_dia_de_inicio_da_turma(): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['data_inicio' => '2026-10-10', 'data_fim' => '2026-11-10']);
        $item = $this->item(RegraLiberacao::DiasAposInicio, dias: 0);

        $this->assertFalse($this->servico->liberado($item, $turma, $this->sp('2026-10-09 23:59:59')));
        $this->assertTrue($this->servico->liberado($item, $turma, $this->sp('2026-10-10 00:00:00')));
    }

    public function test_mesmo_material_em_turmas_diferentes(): void
    {
        $agora = $this->sp('2026-10-20 12:00:00');
        $antiga = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['nome' => 'Antiga', 'data_inicio' => '2026-10-10', 'data_fim' => '2026-11-10']);
        $recente = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['nome' => 'Recente', 'data_inicio' => '2026-10-17', 'data_fim' => '2026-11-17']);
        $item = $this->item(RegraLiberacao::DiasAposInicio, dias: 7);

        $this->assertTrue($this->servico->liberado($item, $antiga, $agora));
        $this->assertFalse($this->servico->liberado($item, $recente, $agora));
    }
}
