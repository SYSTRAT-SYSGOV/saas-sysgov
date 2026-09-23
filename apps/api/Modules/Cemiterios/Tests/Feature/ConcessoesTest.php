<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
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
            'plot_id' => $temporario->id, 'holder_id' => $titular->id, 'modalidade' => 'temporaria', 'inicio' => '2026-01-01', 'lock_version' => 0,
        ])->assertCreated()->assertJsonPath('numero', '1/2026')->assertJsonPath('jazigo.estado', 'concedido')
            ->assertJsonPath('termino', fn ($v) => str_starts_with((string) $v, '2031-01-01'));

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', [
            'plot_id' => $perpetuo->id, 'holder_id' => $titular->id, 'modalidade' => 'perpetua', 'lock_version' => 0,
        ])->assertCreated()->assertJsonPath('termino', null);
    }

    public function test_concessao_concorrente_recebe_409(): void
    {
        $jazigo = $this->novoJazigo(2, false);
        $a = Concessionario::create(['nome' => 'A', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        $b = Concessionario::create(['nome' => 'B', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', ['plot_id' => $jazigo->id, 'holder_id' => $a->id, 'modalidade' => 'temporaria', 'lock_version' => 0])
            ->assertCreated();
        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/concessoes', ['plot_id' => $jazigo->id, 'holder_id' => $b->id, 'modalidade' => 'temporaria', 'lock_version' => 0])
            ->assertStatus(409)->assertJsonPath('code', 'jazigo.conflito_versao');

        $this->noTenant($this->tenant);
        self::assertSame(1, Concessao::where('plot_id', $jazigo->id)->count());
    }

    public function test_coveiro_nao_cadastra_concessao(): void
    {
        $this->como($this->usuario($this->tenant, ['cemiterios.operacoes.executar']), $this->tenant)
            ->postJson('/api/cemiterios/concessoes', ['plot_id' => 1, 'holder_id' => 1, 'modalidade' => 'temporaria', 'lock_version' => 0])
            ->assertForbidden();
    }

    // 3.3

    public function test_expiracao_e_idempotente_e_sinaliza_pendencia_com_restos(): void
    {
        $vazio = $this->novoJazigo();
        $comRestos = $this->novoJazigo();
        $this->sepultado($comRestos, '2020-01-01');
        Concessao::query()->update(['termino' => today()->subDay()->toDateString()]);

        $this->artisan('cemiterios:expirar-concessoes')->assertSuccessful();
        $this->artisan('cemiterios:expirar-concessoes')->assertSuccessful();

        $this->noTenant($this->tenant);
        self::assertSame(2, Concessao::where('situacao', 'expirada')->count());
        self::assertSame(EstadoJazigo::Disponivel, $vazio->refresh()->estado);
        self::assertSame(EstadoJazigo::Ocupado, $comRestos->refresh()->estado);
        self::assertTrue((bool) Concessao::where('plot_id', $comRestos->id)->value('pendencia_regularizacao'));
        self::assertSame(1, JazigoHistorico::where('plot_id', $vazio->id)->where('para', 'disponivel')->count());
    }

    // 3.4

    public function test_renovacao_estende_o_termino_e_gera_guia_pelo_preco_vigente(): void
    {
        $jazigo = $this->novoJazigo();
        $concessao = Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        $concessao->update(['termino' => '2027-06-30']);
        app(PrecoService::class)->novaVigencia('renovacao', 35000, CarbonImmutable::today());

        $this->como($this->admin($this->tenant), $this->tenant)->postJson("/api/cemiterios/concessoes/{$concessao->id}/renovar")
            ->assertOk()
            ->assertJsonPath('concessao.termino', fn ($v) => str_starts_with((string) $v, '2032-06-30'))
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
}
