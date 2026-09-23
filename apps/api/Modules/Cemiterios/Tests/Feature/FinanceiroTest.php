<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Models\Reajuste;
use Modules\Cemiterios\Services\GuiaService;
use Modules\Cemiterios\Services\ParametroService;
use Modules\Cemiterios\Services\PrecoService;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/financeiro (tarefas 5.1–5.6). */
final class FinanceiroTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    // 5.1

    public function test_preco_vigente_por_data_e_cache_invalidado(): void
    {
        $precos = app(PrecoService::class);
        $precos->novaVigencia('inumacao', 10000, CarbonImmutable::parse('2026-01-01'));
        self::assertSame(10000, $precos->valorVigente('inumacao', CarbonImmutable::parse('2026-09-22')));

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/cemiterios/precos', ['servico' => 'inumacao', 'valor' => '120,00', 'vigencia_inicio' => today()->toDateString()])
            ->assertCreated()->assertJsonPath('valor_centavos', 12000);

        $this->noTenant($this->tenant);
        self::assertSame(12000, $precos->valorVigente('inumacao'));
        self::assertSame(10000, $precos->valorVigente('inumacao', CarbonImmutable::yesterday()));
    }

    public function test_valor_com_mais_de_duas_casas_e_recusado(): void
    {
        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/cemiterios/precos', ['servico' => 'inumacao', 'valor' => '10.555', 'vigencia_inicio' => today()->toDateString()])
            ->assertUnprocessable()->assertJsonPath('code', 'preco.valor_invalido');
    }

    // 5.2

    public function test_reajuste_pelo_ipca_arredonda_meio_para_cima_e_e_idempotente(): void
    {
        app(PrecoService::class)->novaVigencia('inumacao', 10000, CarbonImmutable::parse('2026-01-01'));
        app(PrecoService::class)->novaVigencia('exumacao', 333, CarbonImmutable::parse('2026-01-01'));
        Http::fake(['api.bcb.gov.br/*' => Http::response($this->serieIpca('4.50'))]);

        $this->artisan('cemiterios:reajustar-precos', ['--competencia' => 2027])->assertSuccessful();
        $this->artisan('cemiterios:reajustar-precos', ['--competencia' => 2027])->assertSuccessful();

        $this->noTenant($this->tenant);
        $precos = app(PrecoService::class);
        self::assertSame(10450, $precos->valorVigente('inumacao', CarbonImmutable::parse('2027-01-01')));
        self::assertSame(348, $precos->valorVigente('exumacao', CarbonImmutable::parse('2027-01-01'))); // 3,33 × 1,045 = 3,47985
        self::assertSame(10000, $precos->valorVigente('inumacao', CarbonImmutable::parse('2026-12-31')));
        self::assertSame(1, Reajuste::count());

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/cemiterios/precos/reajustes', ['competencia' => 2027, 'percentual' => '5.0'])
            ->assertUnprocessable()->assertJsonPath('code', 'reajuste.competencia_repetida');
    }

    public function test_falha_da_api_nao_altera_precos_e_avisa_o_financeiro(): void
    {
        app(PrecoService::class)->novaVigencia('inumacao', 10000, CarbonImmutable::parse('2026-01-01'));
        $financeiro = $this->usuario($this->tenant, ['cemiterios.financeiro.manage']);
        Http::fake(['api.bcb.gov.br/*' => Http::response('erro', 503)]);

        $this->artisan('cemiterios:reajustar-precos', ['--competencia' => 2027])->assertFailed();

        $this->noTenant($this->tenant);
        self::assertSame(10000, app(PrecoService::class)->valorVigente('inumacao', CarbonImmutable::parse('2027-01-01')));
        self::assertSame(0, Reajuste::count());
        self::assertTrue(OutboxEvent::where('event_type', 'cemiterios.email')->get()->contains(fn ($e) => $e->payload['para'] === $financeiro->email));
    }

    public function test_aplicar_percentual_sem_float(): void
    {
        self::assertSame(10450, PrecoService::aplicarPercentual(10000, '4.5'));
        self::assertSame(10000, PrecoService::aplicarPercentual(10000, '0'));
        self::assertSame(9950, PrecoService::aplicarPercentual(10000, '-0.5'));
        self::assertSame('R$ 1.234,56', PrecoService::brl(123456));
    }

    // 5.3

    public function test_pdf_da_guia_traz_instrucoes_e_pix_e_sinaliza_vencida(): void
    {
        app(ParametroService::class)->novaVersao(['chave_pix' => 'pix@prefeitura.gov.br', 'instrucoes_pagamento' => 'Pague na tesouraria.'], null);
        $guia = app(GuiaService::class)->emitir([
            'contribuinte_nome' => 'Ana', 'servico' => 'inumacao', 'valor_centavos' => 15050, 'vencimento' => today()->subDay()->toDateString(),
        ]);

        self::assertTrue($guia->vencida);
        self::assertSame('1/' . now()->year, $guia->numero);

        $pdf = (string) $this->como($this->admin($this->tenant), $this->tenant)->get("/api/cemiterios/guias/{$guia->id}/pdf")->assertOk()->getContent();
        self::assertStringContainsString('pix@prefeitura.gov.br', $pdf);
        self::assertStringContainsString('Pague na tesouraria.', $pdf);
        self::assertStringContainsString('VENCIDA', $pdf);
        self::assertStringContainsString('150,50', $pdf);
    }

    // 5.4

    public function test_lote_anual_reprocessa_apenas_o_que_faltou(): void
    {
        app(PrecoService::class)->novaVigencia('taxa_manutencao_anual', 8000, CarbonImmutable::parse('2026-01-01'));
        $this->novoJazigo();
        $this->novoJazigo();
        $falha = Concessao::orderByDesc('id')->firstOrFail();
        Concessionario::whereKey($falha->holder_id)->delete(); // titular inacessível → falha parcial

        $this->artisan('cemiterios:gerar-guias-anuais', ['--exercicio' => 2026])->assertFailed();
        $this->noTenant($this->tenant);
        self::assertSame(1, Guia::count());

        Concessionario::withTrashed()->whereKey($falha->holder_id)->restore();
        $this->artisan('cemiterios:gerar-guias-anuais', ['--exercicio' => 2026])->assertSuccessful();
        $this->artisan('cemiterios:gerar-guias-anuais', ['--exercicio' => 2026])->assertSuccessful();

        $this->noTenant($this->tenant);
        self::assertSame(2, Guia::where('exercicio', 2026)->where('valor_centavos', 8000)->count());
    }

    // 5.5 / 5.6

    public function test_segunda_via_baixa_e_inadimplencia(): void
    {
        $servico = app(GuiaService::class);
        $vencida = $servico->emitir(['contribuinte_nome' => 'Ana', 'servico' => 'inumacao', 'valor_centavos' => 5000, 'vencimento' => today()->subDays(5)->toDateString()]);
        $outra = $servico->emitir(['contribuinte_nome' => 'Bia', 'servico' => 'inumacao', 'valor_centavos' => 7000, 'vencimento' => today()->subDays(3)->toDateString()]);
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/relatorios/inadimplencia')
            ->assertOk()->assertJsonPath('quantidade', 2)->assertJsonPath('total_centavos', 12000);

        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/guias/{$vencida->id}/segunda-via")
            ->assertCreated()->assertJsonPath('original_id', $vencida->id);
        $this->noTenant($this->tenant);
        self::assertSame('cancelada', $vencida->refresh()->situacao);

        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/guias/{$outra->id}/baixa", ['pago_em' => today()->toDateString(), 'valor_pago' => '70,00'])
            ->assertUnprocessable()->assertJsonValidationErrors('comprovante');

        $this->como($admin, $this->tenant)->post("/api/cemiterios/guias/{$outra->id}/baixa", [
            'pago_em' => today()->toDateString(), 'valor_pago' => '70,00', 'comprovante' => UploadedFile::fake()->create('c.pdf', 5, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('situacao', 'paga')->assertJsonPath('valor_pago_centavos', 7000);

        $this->como($admin, $this->tenant)->postJson("/api/cemiterios/guias/{$outra->id}/segunda-via")
            ->assertUnprocessable()->assertJsonPath('code', 'guia.segunda_via_indisponivel');

        // A segunda via ainda vence no futuro; a paga saiu do relatório.
        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/relatorios/inadimplencia')
            ->assertOk()->assertJsonPath('quantidade', 0);
    }

    /** @return list<array{data: string, valor: string}> */
    private function serieIpca(string $dezembro): array
    {
        $meses = array_map(fn (int $m) => ['data' => sprintf('01/%02d/2026', $m), 'valor' => '0.00'], range(1, 11));
        $meses[] = ['data' => '01/12/2026', 'valor' => $dezembro];

        return $meses;
    }
}
