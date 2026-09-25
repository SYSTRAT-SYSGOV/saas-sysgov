<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use LogicException;
use Modules\Cemiterios\Models\ExcecaoJudicial;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\OrdemServico;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Services\ParametroService;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/operacoes e privacidade-auditoria › Sigilo (tarefas 2.1–2.9). */
final class OperacoesTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // 2.1 / 2.2 — sigilo da causa da morte

    public function test_causa_da_morte_fica_cifrada_e_fora_da_resposta_padrao(): void
    {
        $falecido = Falecido::create(['nome' => 'José', 'falecimento' => '2026-01-10', 'nascimento' => '1950-05-20', 'causa_morte' => 'Infarto']);

        self::assertSame(75, $falecido->idade_obito);
        self::assertSame('jose', $falecido->nome_normalizado);
        self::assertStringNotContainsString('Infarto', (string) DB::table('deceased_records')->value('causa_morte'));

        $this->como($this->usuario($this->tenant, ['cemiterios.view']), $this->tenant)
            ->getJson("/api/cemiterios/falecidos/{$falecido->id}")
            ->assertOk()->assertJsonMissingPath('causa_morte')->assertJsonMissingPath('docs_medicos');
    }

    public function test_dados_restritos_exigem_permissao_e_a_leitura_e_auditada(): void
    {
        $falecido = Falecido::create(['nome' => 'José', 'falecimento' => '2026-01-10', 'causa_morte' => 'Infarto']);

        $this->como($this->usuario($this->tenant, ['cemiterios.view']), $this->tenant)
            ->getJson("/api/cemiterios/falecidos/{$falecido->id}/dados-restritos")->assertForbidden();

        $this->como($this->usuario($this->tenant, ['cemiterios.dados-restritos.view']), $this->tenant)
            ->getJson("/api/cemiterios/falecidos/{$falecido->id}/dados-restritos")
            ->assertOk()->assertJsonPath('causa_morte', 'Infarto');

        self::assertTrue(AuditLog::where('action', 'falecido.dados_restritos.lidos')->where('resource', "Falecido #{$falecido->id}")->exists());
    }

    public function test_falecimento_anterior_ao_nascimento_e_rejeitado(): void
    {
        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/cemiterios/falecidos', ['nome' => 'X', 'nascimento' => '2020-01-01', 'falecimento' => '2019-01-01'])
            ->assertUnprocessable()->assertJsonValidationErrors('nascimento');
    }

    // 2.3 / 2.4 — inumação e ordem de serviço

    public function test_inumacao_ocupa_o_jazigo_na_confirmacao_e_emite_ordem(): void
    {
        $jazigo = $this->novoJazigo();

        $resposta = $this->inumar($jazigo)->assertCreated()
            ->assertJsonPath('jazigo.estado', 'ocupado')
            ->assertJsonPath('carencia_desde', fn ($v) => str_starts_with((string) $v, '2026-09-20'))
            ->assertJsonPath('ordem_servico.numero', 1);

        $this->noTenant($this->tenant);
        self::assertSame(1, $jazigo->refresh()->ocupacao);
        self::assertSame((int) now()->year, OrdemServico::findOrFail($resposta->json('service_order_id'))->ano);
    }

    public function test_inumacao_sem_certidao_nao_emite_ordem(): void
    {
        $jazigo = $this->novoJazigo();

        $this->inumar($jazigo, ['certidao_arquivo' => null])->assertUnprocessable()->assertJsonValidationErrors('certidao_arquivo');

        $this->noTenant($this->tenant);
        self::assertSame(0, OrdemServico::count());
    }

    public function test_certidao_ja_usada_e_recusada(): void
    {
        $this->inumar($this->novoJazigo(), ['falecido' => ['certidao_numero' => 'CERT-1']])->assertCreated();

        $this->noTenant($this->tenant);
        $this->inumar($this->novoJazigo(), ['falecido' => ['certidao_numero' => 'CERT-1']])
            ->assertUnprocessable()->assertJsonPath('code', 'inumacao.certidao_duplicada');
    }

    public function test_bloqueio_em_capacidade_maxima_e_manutencao(): void
    {
        $lotado = $this->novoJazigo(1);
        $this->sepultado($lotado, '2026-01-01');
        $this->inumar($lotado->refresh())->assertUnprocessable()->assertJsonPath('code', 'jazigo.capacidade_maxima');

        $this->noTenant($this->tenant);
        $emRuina = $this->novoJazigo();
        app(JazigoEstadoService::class)->manual($emRuina, 'manutencao', 'Ruína', null);
        $this->inumar($emRuina)->assertUnprocessable()->assertJsonPath('code', 'jazigo.manutencao');

        $this->noTenant($this->tenant);
        $semConcessao = $this->novoJazigo(2, false);
        $this->inumar($semConcessao)->assertUnprocessable()->assertJsonPath('code', 'jazigo.sem_concessao');
    }

    public function test_cova_publica_disponivel_aceita_inumacao(): void
    {
        $this->inumar($this->novoJazigo(1, false, 'cova_publica'))->assertCreated()->assertJsonPath('jazigo.estado', 'capacidade_maxima');
    }

    public function test_cancelamento_desfaz_ocupacao_e_estado(): void
    {
        $jazigo = $this->novoJazigo();
        $id = $this->inumar($jazigo)->json('id');

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/cemiterios/inumacoes/{$id}/cancelar")
            ->assertOk()->assertJsonPath('situacao', 'cancelada')->assertJsonPath('jazigo.estado', 'concedido');

        $this->noTenant($this->tenant);
        self::assertSame(0, $jazigo->refresh()->ocupacao);
        self::assertSame('cancelada', OrdemServico::firstOrFail()->situacao);
    }

    public function test_numeracao_da_ordem_e_independente_por_tenant(): void
    {
        $this->inumar($this->novoJazigo())->assertJsonPath('ordem_servico.numero', 1);

        $b = $this->criarTenant('pref-b');
        $this->noTenant($b);
        $jazigoB = $this->novoJazigo();
        $this->como($this->admin($b), $b)
            ->post('/api/cemiterios/inumacoes', $this->payloadInumacao($jazigoB), ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('ordem_servico.numero', 1);
    }

    public function test_pdf_da_ordem_e_confirmacao_pelo_coveiro(): void
    {
        $ordemId = $this->inumar($this->novoJazigo())->json('service_order_id');
        $coveiro = $this->usuario($this->tenant, ['cemiterios.view', 'cemiterios.operacoes.executar']);

        $pdf = $this->como($coveiro, $this->tenant)->get("/api/cemiterios/ordens-servico/{$ordemId}/pdf")->assertOk();
        self::assertSame('application/pdf', $pdf->headers->get('Content-Type'));
        self::assertStringStartsWith('%PDF-1.4', (string) $pdf->getContent());

        $this->como($coveiro, $this->tenant)->postJson("/api/cemiterios/ordens-servico/{$ordemId}/concluir")
            ->assertOk()->assertJsonPath('situacao', 'concluida')->assertJsonPath('executada_por', $coveiro->id);
        $this->como($coveiro, $this->tenant)->postJson('/api/cemiterios/exumacoes', ['tipo' => 'ordinaria', 'burial_id' => 1])->assertForbidden();
    }

    // 2.5 — lançamento histórico

    public function test_inumacao_historica_sem_certidao_fica_pendente_de_revisao_sem_ordem(): void
    {
        $jazigo = $this->novoJazigo(3);
        $operador = $this->usuario($this->tenant, ['cemiterios.operacoes.historico']);

        $id = $this->como($operador, $this->tenant)->postJson('/api/cemiterios/inumacoes/historicas', [
            'falecido' => ['nome' => 'Antônio', 'falecimento' => '1998-04-02'],
            'plot_id' => $jazigo->id, 'sepultado_em' => '1998-04-03', 'livro_referencia' => 'Livro 12, folha 34',
        ])->assertCreated()->assertJsonPath('revisao_pendente', true)->assertJsonPath('service_order_id', null)->json('id');

        $this->noTenant($this->tenant);
        self::assertSame(1, $jazigo->refresh()->ocupacao);
        self::assertSame(0, OrdemServico::count());

        $this->como($operador, $this->tenant)->postJson("/api/cemiterios/inumacoes/{$id}/revisar")->assertOk()->assertJsonPath('revisao_pendente', false);
    }

    // 2.6 — prazo legal de exumação

    public function test_exumacao_de_adulto_no_limite_do_prazo(): void
    {
        $inumacao = $this->sepultado($this->novoJazigo(), '2023-09-22');

        Carbon::setTestNow('2026-09-21 10:00');
        $this->exumar($inumacao)->assertUnprocessable()
            ->assertJsonPath('code', 'exumacao.prazo_nao_decorrido')->assertJsonPath('liberada_em', '2026-09-22');
        $this->noTenant($this->tenant);
        self::assertSame(0, OrdemServico::count());

        Carbon::setTestNow('2026-09-22 10:00');
        $this->exumar($inumacao)->assertCreated()->assertJsonPath('prazo_aplicado_anos', 3);
    }

    public function test_exumacao_de_crianca_usa_o_prazo_infantil(): void
    {
        $inumacao = $this->sepultado($this->novoJazigo(), '2024-09-21', '2020-06-01'); // 4 anos no óbito

        Carbon::setTestNow('2026-09-20 10:00');
        $this->exumar($inumacao)->assertUnprocessable()->assertJsonPath('liberada_em', '2026-09-21');

        Carbon::setTestNow('2026-09-22 10:00'); // 2 anos e 1 dia
        $this->exumar($inumacao)->assertCreated()->assertJsonPath('prazo_aplicado_anos', 2);
    }

    public function test_prazo_de_exumacao_depende_dos_parametros_do_tenant(): void
    {
        $b = $this->criarTenant('pref-b');
        $this->noTenant($b);
        app(ParametroService::class)->novaVersao(['prazo_exumacao_adulto_anos' => 5], null);
        $inumacaoB = $this->sepultado($this->novoJazigo(), '2022-09-22');

        $this->noTenant($this->tenant);
        $inumacaoA = $this->sepultado($this->novoJazigo(), '2022-09-22');

        $this->exumar($inumacaoA)->assertCreated();
        $this->como($this->admin($b), $b)
            ->postJson('/api/cemiterios/exumacoes', ['tipo' => 'ordinaria', 'burial_id' => $inumacaoB->id])
            ->assertUnprocessable()->assertJsonPath('liberada_em', '2027-09-22');
    }

    // 2.7 — exumação judicial

    public function test_exumacao_judicial_exige_permissao_e_mandado_e_e_imutavel(): void
    {
        $inumacao = $this->sepultado($this->novoJazigo(), now()->subYear()->toDateString());
        $dados = ['tipo' => 'judicial', 'burial_id' => $inumacao->id, 'processo' => '0001234-56.2026.8.26.0001', 'juizo' => '1ª Vara Cível', 'data_decisao' => today()->toDateString()];

        $this->como($this->usuario($this->tenant, ['cemiterios.operacoes.create']), $this->tenant)
            ->post('/api/cemiterios/exumacoes', $dados + ['mandado' => UploadedFile::fake()->create('m.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertForbidden();

        $judicial = $this->usuario($this->tenant, ['cemiterios.exumacao.judicial']);
        $this->como($judicial, $this->tenant)->postJson('/api/cemiterios/exumacoes', $dados)
            ->assertUnprocessable()->assertJsonValidationErrors('mandado');

        $this->como($judicial, $this->tenant)
            ->post('/api/cemiterios/exumacoes', $dados + ['mandado' => UploadedFile::fake()->create('m.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('tipo', 'judicial');

        $this->noTenant($this->tenant);
        $excecao = ExcecaoJudicial::firstOrFail();
        self::assertSame($judicial->id, $excecao->autor_id);
        self::assertTrue(AuditLog::where('action', 'exumacao.judicial')->exists());

        try {
            $excecao->update(['juizo' => 'outro']);
            self::fail('Exceção judicial deveria ser imutável.');
        } catch (LogicException) {
        }
        $this->expectException(LogicException::class);
        $excecao->delete();
    }

    // 2.8 — suspensão em campo

    public function test_suspensao_mantem_ocupacao_e_reinicia_a_carencia(): void
    {
        Carbon::setTestNow('2027-03-01 09:00');
        $jazigo = $this->novoJazigo();
        $inumacao = $this->sepultado($jazigo, '2023-01-10');
        $ordemId = $this->exumar($inumacao)->assertCreated()->json('service_order_id');

        Carbon::setTestNow('2027-03-10 14:00');
        $this->como($this->usuario($this->tenant, ['cemiterios.operacoes.executar']), $this->tenant)
            ->postJson("/api/cemiterios/ordens-servico/{$ordemId}/suspender", ['motivo' => 'Restos não decompostos'])
            ->assertOk()->assertJsonPath('situacao', 'suspensa');

        $this->noTenant($this->tenant);
        self::assertSame(1, $jazigo->refresh()->ocupacao);
        self::assertSame('2027-03-10', $inumacao->refresh()->carencia_desde->toDateString());
        $this->exumar($inumacao)->assertUnprocessable()->assertJsonPath('liberada_em', '2030-03-10');
    }

    // 2.9 — trasladação

    public function test_trasladacao_interna_move_os_restos_e_desfaz_tudo_se_o_destino_lotar(): void
    {
        $origem = $this->novoJazigo();
        $destino = $this->novoJazigo(1);
        $inumacao = $this->sepultado($origem, '2020-01-10');
        $admin = $this->admin($this->tenant);

        $ordemId = $this->como($admin, $this->tenant)
            ->postJson('/api/cemiterios/trasladacoes', ['burial_id' => $inumacao->id, 'plot_destino_id' => $destino->id])
            ->assertCreated()->json('service_order_id');

        // O destino lota antes da execução: a conclusão falha sem efeito parcial.
        $this->noTenant($this->tenant);
        $this->sepultado($destino, '2026-01-01');
        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/ordens-servico/{$ordemId}/concluir")
            ->assertUnprocessable()->assertJsonPath('code', 'jazigo.capacidade_maxima');

        $this->noTenant($this->tenant);
        self::assertSame(1, $origem->refresh()->ocupacao);
        self::assertSame($origem->id, $inumacao->refresh()->plot_id);
        self::assertSame('emitida', OrdemServico::findOrFail($ordemId)->situacao);

        $this->como($admin, $this->tenant)
            ->postJson('/api/cemiterios/trasladacoes', ['burial_id' => $inumacao->id, 'plot_destino_id' => $destino->id])
            ->assertUnprocessable();
    }

    public function test_trasladacao_externa_decrementa_a_origem(): void
    {
        $origem = $this->novoJazigo();
        $inumacao = $this->sepultado($origem, '2020-01-10');
        $admin = $this->admin($this->tenant);

        $ordemId = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/trasladacoes', [
            'burial_id' => $inumacao->id, 'destino_externo' => 'Cemitério de Campinas', 'documento_destino' => 'Autorização 55/2026',
        ])->assertCreated()->json('service_order_id');
        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/ordens-servico/{$ordemId}/concluir")->assertOk();

        $this->noTenant($this->tenant);
        self::assertSame(0, $origem->refresh()->ocupacao);
        self::assertSame(EstadoJazigo::Concedido, $origem->estado);
        self::assertSame('removida', $inumacao->refresh()->situacao);
    }

    /**
     * @param array<string, mixed> $ajustes
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function inumar(Jazigo $jazigo, array $ajustes = []): TestResponse
    {
        $payload = array_replace_recursive($this->payloadInumacao($jazigo), $ajustes);

        return $this->como($this->admin($this->tenant), $this->tenant)
            ->post('/api/cemiterios/inumacoes', array_filter($payload, fn ($v) => $v !== null), ['Accept' => 'application/json']);
    }

    /** @return array<string, mixed> */
    private function payloadInumacao(Jazigo $jazigo): array
    {
        return [
            'falecido' => [
                'nome' => 'João da Conceição', 'nascimento' => '1940-02-10', 'falecimento' => '2026-09-19',
                'certidao_numero' => 'CERT-' . random_int(1000, 999999), 'certidao_cartorio' => '1º Cartório',
                'causa_morte' => 'Parada cardíaca',
            ],
            'certidao_arquivo' => UploadedFile::fake()->create('certidao.pdf', 20, 'application/pdf'),
            'plot_id' => $jazigo->id,
            'sepultado_em' => '2026-09-20 10:00',
        ];
    }

    /**
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function exumar(Inumacao $inumacao): TestResponse
    {
        return $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/cemiterios/exumacoes', ['tipo' => 'ordinaria', 'burial_id' => $inumacao->id]);
    }

    public function test_sepultamento_bloqueado_quando_titular_concessionario_falecido(): void
    {
        $jazigo = $this->novoJazigo();
        $concessao = $jazigo->concessaoVigente();
        $titular = $concessao->concessionario;
        $titular->update(['titular_falecido' => true, 'data_falecimento_titular' => '2025-05-10']);

        // Tentativa de sepultar terceiro sem autorização judicial
        $this->inumar($jazigo, [
            'falecido' => ['nome' => 'Terceiro Não Titular'],
        ])->assertUnprocessable()->assertJsonPath('code', 'concessao.titular_falecido_sucessao_pendente');
    }

    public function test_sepultamento_permitido_para_o_proprio_titular_concessionario_falecido(): void
    {
        $jazigo = $this->novoJazigo();
        $concessao = $jazigo->concessaoVigente();
        $titular = $concessao->concessionario;
        $titular->update(['titular_falecido' => true]);

        // Sepultamento do próprio titular pelo nome
        $this->inumar($jazigo, [
            'falecido' => ['nome' => $titular->nome],
        ])->assertCreated();

        self::assertSame(1, $jazigo->refresh()->ocupacao);
    }

    public function test_sepultamento_com_coveiro_pedreiro_e_gaveta(): void
    {
        $jazigo = $this->novoJazigo();
        $resposta = $this->inumar($jazigo, [
            'gaveta_numero' => 2,
            'coveiro_nome' => 'Sebastião Coveiro',
            'pedreiro_nome' => 'Antônio Pedreiro',
        ])->assertCreated();

        $inumacao = Inumacao::findOrFail($resposta->json('id'));
        self::assertSame(2, $inumacao->gaveta_numero);
        self::assertSame('Sebastião Coveiro', $inumacao->coveiro_nome);
        self::assertSame('Antônio Pedreiro', $inumacao->pedreiro_nome);
    }
}

