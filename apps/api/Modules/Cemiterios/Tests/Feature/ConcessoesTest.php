<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Models\JazigoHistorico;
use Modules\Cemiterios\Services\PrecoService;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/concessoes e privacidade-auditoria › Proteção LGPD (tarefas 3.1–3.5). */
final class ConcessoesTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    // 3.1

    public function test_concessionario_valida_documento_cifra_e_mascara(): void
    {
        $admin = $this->admin($this->tenant);
        $cpf = $this->cpfValido();

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessionarios', ['nome' => 'Ana', 'documento' => '123.456.789-00'])
            ->assertUnprocessable()->assertJsonValidationErrors('documento');

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessionarios', ['nome' => 'Ana', 'documento' => $cpf, 'email' => 'ana@x.com'])
            ->assertCreated()->assertJsonMissingPath('documento')->assertJsonPath('tipo_doc', 'cpf');

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessionarios', ['nome' => 'Outra Ana', 'documento' => $cpf])
            ->assertUnprocessable()->assertJsonValidationErrors('documento');

        $mascara = '***.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-**';
        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessionarios')
            ->assertOk()->assertJsonPath('data.0.documento_mascarado', $mascara)->assertJsonMissingPath('data.0.documento');

        $bruto = DB::table('concession_holders')->first();
        self::assertStringNotContainsString($cpf, (string) $bruto->documento);
        self::assertStringNotContainsString('ana@x.com', (string) $bruto->email);
    }

    // 3.2

    public function test_concessao_temporaria_e_perpetua_ativam_o_jazigo(): void
    {
        $titular = Concessionario::create(['nome' => 'Ana', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        $temporario = $this->novoJazigo(2, false);
        $perpetuo = $this->novoJazigo(2, false);
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', [
            'plot_id' => $temporario->id, 'holder_id' => $titular->id, 'tipo' => 'temporaria', 'inicio' => '2026-01-01', 'lock_version' => 0,
        ])->assertCreated()->assertJsonPath('numero', '1/2026')->assertJsonPath('jazigo.estado', 'concedido')
            ->assertJsonPath('data_fim', fn ($v) => str_starts_with((string) $v, '2031-01-01'));

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', [
            'plot_id' => $perpetuo->id, 'holder_id' => $titular->id, 'tipo' => 'perpetua', 'lock_version' => 0,
        ])->assertCreated()->assertJsonPath('data_fim', null);
    }

    public function test_concessao_concorrente_recebe_409(): void
    {
        $jazigo = $this->novoJazigo(2, false);
        $a = Concessionario::create(['nome' => 'A', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        $b = Concessionario::create(['nome' => 'B', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', ['plot_id' => $jazigo->id, 'holder_id' => $a->id, 'tipo' => 'temporaria', 'lock_version' => 0])
            ->assertCreated();
        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', ['plot_id' => $jazigo->id, 'holder_id' => $b->id, 'tipo' => 'temporaria', 'lock_version' => 0])
            ->assertStatus(409)->assertJsonPath('code', 'jazigo.conflito_versao');

        $this->noTenant($this->tenant);
        self::assertSame(1, Concessao::where('plot_id', $jazigo->id)->count());
    }

    public function test_coveiro_nao_cadastra_concessao(): void
    {
        $this->como($this->usuario($this->tenant, ['cemiterios.operacoes.executar']), $this->tenant)
            ->postJson('/api/cemiterios/concessoes', ['plot_id' => 1, 'holder_id' => 1, 'tipo' => 'temporaria', 'lock_version' => 0])
            ->assertForbidden();
    }

    // 3.3

    public function test_expiracao_e_idempotente_e_sinaliza_pendencia_com_restos(): void
    {
        $vazio = $this->novoJazigo();
        $comRestos = $this->novoJazigo();
        $this->sepultado($comRestos, '2020-01-01');

        // Create concessions for both jazigos
        $titular = Concessionario::first();
        if (!$titular) {
            $titular = Concessionario::create(['nome' => 'Test', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        }
        Concessao::create([
            'numero' => '1/2026',
            'plot_id' => $vazio->id,
            'holder_id' => $titular->id,
            'tipo' => 'temporaria',
            'data_inicio' => today()->subYear()->toDateString(),
            'data_fim' => today()->subDay()->toDateString(), // expired
            'lock_version' => 0,
        ]);
        Concessao::create([
            'numero' => '2/2026',
            'plot_id' => $comRestos->id,
            'holder_id' => $titular->id,
            'tipo' => 'temporaria',
            'data_inicio' => today()->subYear()->toDateString(),
            'data_fim' => today()->addYear()->toDateString(), // not expired
            'lock_version' => 0,
        ]);

        $this->artisan('cemiterios:expirar-concessoes')->assertSuccessful();
        $this->artisan('cemiterios:expirar-concessoes')->assertSuccessful();

        $this->noTenant($this->tenant);
        self::assertSame(1, Concessao::where('estado', 'Vencida')->count());
        self::assertSame(EstadoJazigo::Disponivel, $vazio->refresh()->estado);
        self::assertSame(EstadoJazigo::Ocupado, $comRestos->refresh()->estado);
        self::assertTrue((bool) Concessao::where('plot_id', $comRestos->id)->value('pendencia_regularizacao'));
        self::assertSame(1, JazigoHistorico::where('plot_id', $vazio->id)->where('para_estado', 'disponivel')->count());
    }

    // 3.4

    public function test_renovacao_estende_o_termino_e_gera_guia_pelo_preco_vigente(): void
    {
        $jazigo = $this->novoJazigo();
        // Ensure we have a concessionario
        $titular = Concessionario::first();
        if (!$titular) {
            $titular = Concessionario::create(['nome' => 'Test', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        }
        // Create a concession for the jazigo
        Concessao::create([
            'numero' => '1/2026',
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'temporaria',
            'data_inicio' => today()->subYear()->toDateString(),
            'data_fim' => '2027-06-30',
            'lock_version' => 0,
        ]);
        $concessao = Concessao::where('plot_id', $jazigo->id)->first();
        $concessao->update(['data_fim' => '2027-06-30']);
        app(PrecoService::class)->novaVigencia('renovacao', 35000, CarbonImmutable::today());

        $this->como($this->admin($this->tenant), $this->tenant)->postJson("/api/cemiterios/concessoes/{$concessao->id}/renovar")
            ->assertOk()
            ->assertJsonPath('concessao.data_fim', fn ($v) => str_starts_with((string) $v, '2032-06-30'))
            ->assertJsonPath('guia.valor_centavos', 35000)
            ->assertJsonPath('guia.servico', 'renovacao');

        $this->noTenant($this->tenant);
        self::assertSame(1, Guia::where('origem_type', 'concessao')->where('origem_id', $concessao->id)->count());
    }

    // 3.5

    public function test_aviso_de_termino_uma_vez_por_ciclo(): void
    {
        $titular = Concessionario::create(['nome' => 'Ana', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido(), 'email' => 'ana@x.com']);
        $this->concessao($this->novoJazigo(2, false), $titular, '+20 days');
        $this->concessao($this->novoJazigo(2, false), $titular, '+90 days'); // fora da antecedência

        $this->artisan('cemiterios:notificar-vencimentos')->assertSuccessful();
        $this->artisan('cemiterios:notificar-vencimentos')->assertSuccessful();

        $emails = OutboxEvent::where('event_type', 'cemiterios.email')->get();
        self::assertCount(1, $emails);
        self::assertSame('ana@x.com', $emails->first()->payload['para']);
    }

    public function test_concessao_persiste_processo_administrativo_e_filtra_titular_falecido(): void
    {
        $titular = Concessionario::create(['nome' => 'Carlos', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido(), 'titular_falecido' => true]);
        $jazigo = $this->novoJazigo(2, false);
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', [
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'modalidade' => 'perpetua',
            'processo_administrativo' => 'PROC-2026/00123',
            'lock_version' => 0,
        ])->assertCreated()->assertJsonPath('processo_administrativo', 'PROC-2026/00123');

        $this->noTenant($this->tenant);
        self::assertSame('PROC-2026/00123', $jazigo->refresh()->processo_administrativo);

        // Listagem filtrando por processo administrativo
        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?processo_administrativo=00123')
            ->assertOk()->assertJsonCount(1, 'data');

        // Listagem filtrando por titular falecido
        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?titular_falecido=true')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    // cemiterio/concessoes-gestao — filtros avançados combináveis

    public function test_filtros_avancados_de_modalidade_setor_e_vencimento(): void
    {
        $admin = $this->admin($this->tenant);
        $temporario = $this->novoJazigo(2, true); // concessão temporária padrão (+5 anos)

        $perpetuo = $this->novoJazigo(2, false);
        $titular = Concessionario::create(['nome' => 'Perp', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', [
            'plot_id' => $perpetuo->id, 'holder_id' => $titular->id, 'modalidade' => 'perpetua', 'lock_version' => 0,
        ])->assertCreated();
        $this->noTenant($this->tenant); // ResolveTenant limpa o contexto ao fim de cada requisição HTTP simulada

        $vencendo = $this->novoJazigo(2, false);
        $this->concessao($vencendo, null, '+10 days');

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?modalidade=perpetua')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.plot_id', $perpetuo->id);

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?setor_id=' . $temporario->sector_id)
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.plot_id', $temporario->id);

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?vence_ate=' . today()->addDays(30)->toDateString())
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.plot_id', $vencendo->id);
    }

    public function test_busca_textual_combinada_localiza_por_jazigo_e_concessionario(): void
    {
        $admin = $this->admin($this->tenant);
        $titular = Concessionario::create(['nome' => 'Fulano da Busca', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        $jazigo = $this->novoJazigo(2, false);
        $this->concessao($jazigo, $titular);
        $this->novoJazigo(2, true); // ruído: outro jazigo/concessão que não deve aparecer na busca

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?busca=' . urlencode($jazigo->codigo))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.plot_id', $jazigo->id);

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?busca=' . urlencode('Fulano da Busca'))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.plot_id', $jazigo->id);
    }

    public function test_filtro_pendencia_regularizacao(): void
    {
        $admin = $this->admin($this->tenant);
        $comPendencia = $this->novoJazigo(2, true);
        Concessao::where('plot_id', $comPendencia->id)->update(['pendencia_regularizacao' => true]);
        $this->novoJazigo(2, true); // sem pendência

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?pendencia_regularizacao=true')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.plot_id', $comPendencia->id);
    }

    public function test_filtro_financeiro_classifica_adimplencia(): void
    {
        $admin = $this->admin($this->tenant);
        $comDebito = $this->novoJazigo(2, true);
        $semGuia = $this->novoJazigo(2, true);
        $concessaoComDebito = Concessao::where('plot_id', $comDebito->id)->firstOrFail();

        Guia::create([
            'numero' => 'G-' . Str::random(6), 'origem_type' => 'concessao', 'origem_id' => $concessaoComDebito->id,
            'contribuinte_nome' => 'Teste', 'servico' => 'anual', 'valor_centavos' => 10000,
            'vencimento' => today()->subDay()->toDateString(), 'situacao' => 'emitida',
        ]);

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?financeiro=inadimplente')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.plot_id', $comDebito->id);

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/concessoes?financeiro=sem_guias')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.plot_id', $semGuia->id);
    }

    // cemiterio/regras-concessao-sucessao — extinção por renúncia voluntária

    public function test_renuncia_extingue_concessao_vigente_e_libera_jazigo(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(2, true);
        $concessao = Concessao::where('plot_id', $jazigo->id)->firstOrFail();

        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/concessoes/{$concessao->id}/renunciar", [
            'motivo' => 'Concessionário devolveu o jazigo espontaneamente.',
        ])->assertOk()->assertJsonPath('estado', 'Caduca')->assertJsonPath('motivo_extincao', 'renuncia');

        $this->noTenant($this->tenant);
        self::assertSame(EstadoJazigo::Disponivel, $jazigo->refresh()->estado);
    }

    public function test_renuncia_exige_motivo(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(2, true);
        $concessao = Concessao::where('plot_id', $jazigo->id)->firstOrFail();

        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/concessoes/{$concessao->id}/renunciar", [])
            ->assertUnprocessable()->assertJsonValidationErrors('motivo');
    }

    public function test_renuncia_rejeita_concessao_nao_vigente(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(2, true);
        $concessao = Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        $concessao->update(['estado' => 'Vencida']);

        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/concessoes/{$concessao->id}/renunciar", ['motivo' => 'x'])
            ->assertStatus(422)->assertJsonPath('code', 'concessao.nao_renunciavel');
    }

    // cemiterio/concessoes-gestao — histórico auditável

    public function test_historico_lista_eventos_de_criacao_e_renovacao(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(2, false);
        $titular = Concessionario::create(['nome' => 'Hist', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        app(PrecoService::class)->novaVigencia('renovacao', 30000, CarbonImmutable::today());

        $concessaoId = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', [
            'plot_id' => $jazigo->id, 'holder_id' => $titular->id, 'modalidade' => 'temporaria', 'lock_version' => 0,
        ])->assertCreated()->json('id');
        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/concessoes/{$concessaoId}/renovar")->assertOk();

        $acoes = $this->como($admin, $this->tenant)->getJson("/api/cemiterios/concessoes/{$concessaoId}/historico")
            ->assertOk()->json('data.*.action');
        self::assertContains('concessao.created', $acoes);
        self::assertContains('concessao.renovada', $acoes);
    }

    public function test_historico_de_concessao_de_outro_tenant_retorna_404(): void
    {
        $jazigo = $this->novoJazigo(2, true);
        $concessao = Concessao::where('plot_id', $jazigo->id)->firstOrFail();

        $outroTenant = $this->criarTenant('pref-b');
        $this->como($this->admin($outroTenant), $outroTenant)
            ->getJson("/api/cemiterios/concessoes/{$concessao->id}/historico")
            ->assertNotFound();
    }
}

