<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Modules\Cemiterios\Models\AlvaraObra;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Empreiteiro;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\OrdemServico;
use Modules\Cemiterios\Models\ProcessoAbandono;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/empreiteiros e cemiterio/vistoria-abandono (tarefas 7.1–7.4, 8.1–8.4). */
final class EmpreiteirosVistoriaTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->admin = $this->admin($this->tenant);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // 7.1

    public function test_empreiteiro_fica_inapto_quando_o_alvara_anual_vence(): void
    {
        $id = $this->empreiteiroApto('2026-12-31');
        $this->noTenant($this->tenant);
        self::assertSame('apto', Empreiteiro::findOrFail($id)->situacao);

        Carbon::setTestNow('2027-01-01 00:45');
        $this->artisan('cemiterios:atualizar-aptidao')->assertSuccessful();

        $this->noTenant($this->tenant);
        self::assertSame('inapto', Empreiteiro::findOrFail($id)->situacao);
        $this->obra($id, $this->jazigoConcedido())->assertUnprocessable()->assertJsonPath('code', 'empreiteiro.inapto');
    }

    // 7.2

    public function test_projeto_acima_da_dimensao_maxima_e_recusado(): void
    {
        $id = $this->empreiteiroApto();

        $this->obra($id, $this->jazigoConcedido(), ['comprimento_m' => 3.20, 'largura_m' => 2.10])
            ->assertUnprocessable()->assertJsonPath('code', 'jazigo.dimensao_excedida');
        $this->obra($id, $this->jazigoConcedido(2, false))->assertUnprocessable()->assertJsonPath('code', 'obra.sem_concessao');
    }

    // 7.3

    public function test_limite_de_obras_simultaneas(): void
    {
        $id = $this->empreiteiroApto();

        $primeira = $this->obra($id, $this->jazigoConcedido())->assertCreated()->json('id');
        $this->obra($id, $this->jazigoConcedido())->assertCreated();
        $this->obra($id, $this->jazigoConcedido())->assertUnprocessable()->assertJsonPath('code', 'empreiteiro.limite_obras')->assertJsonPath('limite', 2);

        $this->como($this->admin, $this->tenant)->putJson("/api/cemiterios/alvaras-obra/{$primeira}", ['situacao' => 'concluida'])->assertOk();
        $this->obra($id, $this->jazigoConcedido())->assertCreated();
    }

    // 7.4

    public function test_segunda_suspensao_cancela_e_sinaliza_obras(): void
    {
        $id = $this->empreiteiroApto();
        $this->obra($id, $this->jazigoConcedido())->assertCreated();
        $suspensao = ['tipo' => 'suspensao', 'inicio' => '2026-01-01', 'fim' => '2026-01-31', 'motivo' => 'Obra irregular'];

        $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/empreiteiros/{$id}/penalidades", $suspensao)
            ->assertCreated()->assertJsonPath('situacao', 'apto'); // suspensão já encerrada
        $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/empreiteiros/{$id}/penalidades", $suspensao)
            ->assertCreated()->assertJsonPath('situacao', 'cancelado');

        $this->noTenant($this->tenant);
        self::assertTrue((bool) AlvaraObra::where('contractor_id', $id)->value('sinalizada'));
    }

    // 8.1

    public function test_vistoria_exige_foto_e_o_download_exige_autorizacao(): void
    {
        $jazigo = $this->jazigoConcedido();
        $this->vistoria($jazigo, 'bom', [])->assertUnprocessable()->assertJsonValidationErrors('fotos');

        $resposta = $this->vistoria($jazigo, 'em_ruina', [UploadedFile::fake()->image('tumulo.jpg')], true)->assertCreated();
        $url = "/api/cemiterios/vistorias/{$resposta->json('id')}/fotos/{$resposta->json('fotos.0.id')}";

        $this->noTenant($this->tenant);
        self::assertSame(EstadoJazigo::Manutencao, $jazigo->refresh()->estado);

        $this->como($this->usuario($this->tenant, ['cemiterios.view']), $this->tenant)->get($url)->assertForbidden();
        $this->como($this->usuario($this->tenant, ['cemiterios.vistoria.create']), $this->tenant)->get($url)->assertOk();
    }

    // 8.2

    public function test_instauracao_exige_vistoria_que_justifique(): void
    {
        $jazigo = $this->jazigoConcedido();
        $this->vistoria($jazigo, 'bom', [UploadedFile::fake()->image('f.jpg')])->assertCreated();

        $this->instaurar($jazigo)->assertUnprocessable()->assertJsonPath('code', 'abandono.vistoria_insuficiente');

        $this->vistoria($jazigo, 'indicio_abandono', [UploadedFile::fake()->image('f.jpg')])->assertCreated();
        $this->instaurar($jazigo)->assertCreated()->assertJsonPath('situacao', 'instaurado');
    }

    // 8.3 / 8.4

    public function test_edital_bloqueia_decisao_antes_do_prazo_e_decisao_extingue_com_restos_pendentes(): void
    {
        $jazigo = $this->jazigoConcedido();
        $this->noTenant($this->tenant);
        $this->sepultado($jazigo, '2025-06-01'); // prazo legal ainda não decorrido
        $id = $this->processoEmEdital($jazigo, '2026-09-01');

        Carbon::setTestNow('2026-09-21 10:00'); // 20º dia de 30
        $this->decidir($id)->assertUnprocessable()->assertJsonPath('code', 'abandono.prazo_edital')->assertJsonPath('prazo_fim', '2026-10-01');

        Carbon::setTestNow('2026-10-01 10:00');
        $this->decidir($id)->assertOk()->assertJsonPath('situacao', 'decidido')->assertJsonPath('remocao_pendente', true);

        $this->noTenant($this->tenant);
        $processo = ProcessoAbandono::findOrFail($id);
        self::assertSame(30, $processo->prazo_dias_aplicado);
        self::assertSame('extinta', Concessao::where('plot_id', $jazigo->id)->value('situacao'));
        self::assertSame('demolicao', OrdemServico::findOrFail($processo->demolicao_order_id)->tipo);

        // Concluída a demolição, o jazigo volta ao estado derivado: segue ocupado, não Disponível.
        $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/ordens-servico/{$processo->demolicao_order_id}/concluir")->assertOk();
        $this->noTenant($this->tenant);
        self::assertSame(EstadoJazigo::Ocupado, $jazigo->refresh()->estado);

        // Vencido o prazo legal, a rotina emite a remoção.
        Carbon::setTestNow('2028-06-02 01:30');
        $this->artisan('cemiterios:liberar-remocoes')->assertSuccessful();
        $this->noTenant($this->tenant);
        self::assertSame(1, OrdemServico::where('tipo', 'exumacao')->count());
    }

    public function test_decisao_sem_restos_devolve_o_jazigo_apos_a_demolicao(): void
    {
        $jazigo = $this->jazigoConcedido();
        $id = $this->processoEmEdital($jazigo, today()->subDays(40)->toDateString());

        $ordem = $this->decidir($id)->assertOk()->assertJsonPath('remocao_pendente', false)->json('demolicao_order_id');
        $this->noTenant($this->tenant);
        self::assertSame(EstadoJazigo::Manutencao, $jazigo->refresh()->estado);

        $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/ordens-servico/{$ordem}/concluir")->assertOk();
        $this->noTenant($this->tenant);
        self::assertSame(EstadoJazigo::Disponivel, $jazigo->refresh()->estado);
    }

    public function test_manifestacao_aceita_arquiva_e_mantem_a_concessao(): void
    {
        $jazigo = $this->jazigoConcedido();
        $id = $this->processoEmEdital($jazigo, today()->toDateString());

        $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/processos-abandono/{$id}/manifestacao", ['texto' => 'Vou reformar', 'arquivar' => true])
            ->assertOk()->assertJsonPath('situacao', 'arquivado');

        $this->noTenant($this->tenant);
        self::assertSame('vigente', Concessao::where('plot_id', $jazigo->id)->value('situacao'));
    }

    private function empreiteiroApto(string $validade = '2027-12-31'): int
    {
        $id = $this->como($this->admin, $this->tenant)->postJson('/api/cemiterios/empreiteiros', ['nome' => 'Construtora Paz', 'documento' => $this->cpfValido()])
            ->assertCreated()->assertJsonPath('situacao', 'inapto')->json('id');
        $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/empreiteiros/{$id}/alvaras", ['numero' => 'AA-1', 'validade' => $validade])
            ->assertCreated()->assertJsonPath('situacao', 'apto');

        return (int) $id;
    }

    private function jazigoConcedido(int $capacidade = 2, bool $concedido = true): Jazigo
    {
        $this->noTenant($this->tenant);

        return $this->novoJazigo($capacidade, $concedido);
    }

    /**
     * @param array<string, mixed> $ajustes
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function obra(int $empreiteiro, Jazigo $jazigo, array $ajustes = []): TestResponse
    {
        return $this->como($this->admin, $this->tenant)->postJson('/api/cemiterios/alvaras-obra', $ajustes + [
            'contractor_id' => $empreiteiro, 'plot_id' => $jazigo->id, 'descricao' => 'Revestimento em granito',
            'comprimento_m' => 2.50, 'largura_m' => 1.20, 'prazo_fim' => today()->addMonth()->toDateString(),
        ]);
    }

    /**
     * @param list<UploadedFile> $fotos
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function vistoria(Jazigo $jazigo, string $estado, array $fotos, bool $mover = false): TestResponse
    {
        return $this->como($this->admin, $this->tenant)->post('/api/cemiterios/vistorias', [
            'plot_id' => $jazigo->id, 'estado_conservacao' => $estado, 'risco' => 'alto', 'fotos' => $fotos,
            'mover_para_manutencao' => $mover ? '1' : '0',
        ], ['Accept' => 'application/json']);
    }

    /**
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function instaurar(Jazigo $jazigo): TestResponse
    {
        return $this->como($this->admin, $this->tenant)->postJson('/api/cemiterios/processos-abandono', ['plot_id' => $jazigo->id]);
    }

    private function processoEmEdital(Jazigo $jazigo, string $publicadoEm): int
    {
        $this->vistoria($jazigo, 'indicio_abandono', [UploadedFile::fake()->image('f.jpg')])->assertCreated();
        $id = (int) $this->instaurar($jazigo)->assertCreated()->json('id');
        $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/processos-abandono/{$id}/edital", ['publicado_em' => $publicadoEm])
            ->assertOk()->assertJsonPath('situacao', 'em_edital');

        return $id;
    }

    /**
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function decidir(int $id): TestResponse
    {
        return $this->como($this->admin, $this->tenant)->postJson("/api/cemiterios/processos-abandono/{$id}/decisao", ['decisao' => 'Extinção por abandono']);
    }
}
