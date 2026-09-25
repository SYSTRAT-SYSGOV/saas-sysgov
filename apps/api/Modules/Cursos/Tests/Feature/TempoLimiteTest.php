<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Services\TentativaService;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 4.4 — salvamento de respostas e tempo limite sem job (design D7 e D8).
 */
final class TempoLimiteTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    private CarbonImmutable $inicio;

    private Questao $q1;

    private Questao $q2;

    private Avaliacao $avaliacao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararCenarioAvaliacao();
        $this->inicio = CarbonImmutable::now()->startOfMinute();
        $this->travarRelogio($this->inicio);
        $this->q1 = $this->criarObjetiva('Q1', 1, correta: 0);
        $this->q2 = $this->criarObjetiva('Q2', 1, correta: 0);
        $this->avaliacao = $this->criarAvaliacaoPublicada([$this->q1, $this->q2], ['tempo_limite_minutos' => 30, 'tentativas_max' => 3]);
    }

    protected function tearDown(): void
    {
        $this->liberarRelogio();
        parent::tearDown();
    }

    private function iniciar(): int
    {
        return (int) $this->iniciarTentativa($this->avaliacao)->assertCreated()->json('id');
    }

    /** @return array<string, int> */
    private function certa(Questao $q): array
    {
        return ['alternativa_id' => $this->alternativaId($q, 0)];
    }

    public function test_salva_a_resposta_dentro_do_prazo_e_devolve_a_hora_do_servidor(): void
    {
        $id = $this->iniciar();
        $this->travarRelogio($this->inicio->addMinutes(10));

        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk()
            ->assertJsonPath('questao_id', $this->q1->id)
            ->assertJsonPath('alternativa_id', $this->alternativaId($this->q1, 0))
            ->assertJsonPath('prazo_em', $this->inicio->addMinutes(30)->toIso8601String())
            ->assertJsonPath('servidor_agora', $this->inicio->addMinutes(10)->toIso8601String());
    }

    public function test_tempo_esgotado_recusa_a_resposta_e_envia_a_tentativa_com_o_que_foi_salvo(): void
    {
        $id = $this->iniciar();
        $this->travarRelogio($this->inicio->addMinutes(20));
        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk();

        // 1 minuto depois do fim do tempo limite.
        $this->travarRelogio($this->inicio->addMinutes(31));
        $resposta = $this->responder($id, $this->q2, $this->certa($this->q2));

        $this->assertErroDeNegocio($resposta, 'tempo desta avaliação terminou');
        $leitura = $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertOk();
        $leitura->assertJsonPath('status', 'corrigida')->assertJsonPath('nota', '5.00');
        $this->assertSame($this->inicio->addMinutes(30)->toIso8601String(), $leitura->json('enviada_em'), 'o envio vale como feito no prazo');
        $this->assertNull($leitura->json('questoes.1.resposta.alternativa_id'), 'a resposta fora do prazo não foi gravada');
    }

    public function test_tolerancia_de_30_segundos_para_a_latencia(): void
    {
        $id = $this->iniciar();

        $this->travarRelogio($this->inicio->addMinutes(30)->addSeconds(20));
        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk();

        $this->travarRelogio($this->inicio->addMinutes(30)->addSeconds(31));
        $this->assertErroDeNegocio($this->responder($id, $this->q2, $this->certa($this->q2)), 'tempo desta avaliação terminou');
    }

    public function test_leitura_depois_do_prazo_fecha_a_tentativa_sem_nenhuma_escrita(): void
    {
        $id = $this->iniciar();
        $this->travarRelogio($this->inicio->addMinutes(5));
        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk();

        $this->travarRelogio($this->inicio->addMinutes(45));
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertOk()
            ->assertJsonPath('status', 'corrigida')->assertJsonPath('nota', '5.00');

        $this->assertTrue(AuditLog::where('action', 'tentativa.enviada')->get()->contains(fn ($l) => ($l->after['origem'] ?? null) === 'tempo'));
    }

    public function test_enviar_depois_do_prazo_vale_como_envio_no_prazo(): void
    {
        $id = $this->iniciar();
        $this->travarRelogio($this->inicio->addMinutes(5));
        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk();

        $this->travarRelogio($this->inicio->addMinutes(40));
        $envio = $this->enviarTentativa($id)->assertOk()->assertJsonPath('status', 'corrigida')->assertJsonPath('nota', '5.00');

        $this->assertSame($this->inicio->addMinutes(30)->toIso8601String(), $envio->json('enviada_em'));
    }

    public function test_nova_tentativa_depois_de_uma_vencida_fecha_a_anterior_e_conta_o_numero(): void
    {
        $this->iniciar();

        $this->travarRelogio($this->inicio->addMinutes(45));
        $this->iniciarTentativa($this->avaliacao)->assertCreated()->assertJsonPath('numero', 2);
    }

    public function test_sem_tempo_limite_a_tentativa_nunca_vence(): void
    {
        $semLimite = $this->criarAvaliacaoPublicada([$this->q1], ['titulo' => 'Sem limite']);
        $id = (int) $this->iniciarTentativa($semLimite)->assertCreated()->assertJsonPath('prazo_em', null)->json('id');

        $this->travarRelogio($this->inicio->addDays(30));
        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk();
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertOk()->assertJsonPath('status', 'em_andamento');
    }

    public function test_resposta_pode_ser_trocada_ate_o_envio_e_nao_depois(): void
    {
        $id = $this->iniciar();

        $this->responder($id, $this->q1, ['alternativa_id' => $this->alternativaId($this->q1, 1)])->assertOk();
        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk()->assertJsonPath('alternativa_id', $this->alternativaId($this->q1, 0));
        $this->responder($id, $this->q1, ['alternativa_id' => null])->assertOk()->assertJsonPath('alternativa_id', null);
        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk();

        $this->enviarTentativa($id)->assertOk();

        $this->assertErroDeNegocio($this->responder($id, $this->q2, $this->certa($this->q2)), 'já foi enviada');
        $this->assertErroDeNegocio($this->enviarTentativa($id), 'já foi enviada');
    }

    public function test_dissertativa_guarda_texto_puro_sem_interpretar_html(): void
    {
        $dissertativa = $this->criarDissertativa();
        $avaliacao = $this->criarAvaliacaoPublicada([$dissertativa], ['titulo' => 'Dissertativa']);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');

        $texto = "Linha 1\nLinha 2 <b>não é negrito</b> a < b";
        $this->responder($id, $dissertativa, ['texto' => $texto])->assertOk()->assertJsonPath('texto', $texto);
        $this->assertErroDeNegocio($this->responder($id, $dissertativa, ['texto' => str_repeat('a', TentativaService::TEXTO_MAX + 1)]), 'longa demais');
    }

    public function test_recusa_alternativa_de_outra_questao_e_questao_fora_da_tentativa(): void
    {
        $id = $this->iniciar();
        $estranha = $this->criarObjetiva('Fora da prova');

        $this->assertErroDeNegocio($this->responder($id, $this->q1, ['alternativa_id' => $this->alternativaId($this->q2, 0)]), 'não pertence a esta questão');
        $this->assertErroDeNegocio($this->responder($id, $estranha, $this->certa($estranha)), 'não faz parte da tentativa');
    }

    public function test_so_o_dono_responde_e_envia(): void
    {
        $id = $this->iniciar();
        $outro = $this->usuario($this->tenant, ['participante_cursos'], 'Outro aluno');

        foreach ([$outro, $this->admin, $this->instrutor] as $usuario) {
            $this->responder($id, $this->q1, $this->certa($this->q1), $usuario)->assertForbidden();
            $this->enviarTentativa($id, $usuario)->assertForbidden();
        }
    }

    public function test_salvar_resposta_nao_gera_auditoria_por_resposta(): void
    {
        $id = $this->iniciar();
        $antes = AuditLog::count();

        $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk();
        $this->responder($id, $this->q1, ['alternativa_id' => $this->alternativaId($this->q1, 1)])->assertOk();
        $this->responder($id, $this->q2, $this->certa($this->q2))->assertOk();

        $this->assertSame($antes, AuditLog::count());
    }

    public function test_limite_de_60_salvamentos_por_minuto(): void
    {
        $id = $this->iniciar();

        for ($i = 0; $i < 60; $i++) {
            $this->responder($id, $this->q1, $this->certa($this->q1))->assertOk();
        }

        $this->responder($id, $this->q1, $this->certa($this->q1))->assertStatus(429);
    }

    public function test_tentativa_de_outro_tenant_responde_404(): void
    {
        $id = $this->iniciar();
        $tenantB = $this->criarTenant('prefeitura-b');
        $alunoB = $this->usuario($tenantB, ['participante_cursos'], 'Aluno B');

        $this->como($alunoB, $tenantB)->getJson("/api/cursos/tentativas/{$id}")->assertNotFound();
        $this->como($alunoB, $tenantB)->putJson("/api/cursos/tentativas/{$id}/respostas/{$this->q1->id}", $this->certa($this->q1))->assertNotFound();
        $this->como($alunoB, $tenantB)->postJson("/api/cursos/tentativas/{$id}/enviar")->assertNotFound();
    }
}
