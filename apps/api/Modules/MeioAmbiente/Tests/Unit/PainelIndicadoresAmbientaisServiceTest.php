<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\MeioAmbiente\Database\Seeders\TabelaMultaAmbientalSeeder;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Services\PainelIndicadoresAmbientaisService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Modules\MeioAmbiente\Tests\Concerns\CriaExecucaoVistoria;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Tests\TestCase;

final class PainelIndicadoresAmbientaisServiceTest extends TestCase
{
    use CriaExecucaoVistoria;
    use RefreshDatabase;

    private PainelIndicadoresAmbientaisService $painel;

    /** Período fixo para os cenários — independe da data em que a suíte roda. */
    private const PERIODO = ['data_inicio' => '2026-08-01', 'data_fim' => '2026-08-31'];

    protected function setUp(): void
    {
        parent::setUp();

        $this->painel = app(PainelIndicadoresAmbientaisService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
        (new TabelaMultaAmbientalSeeder())->run();
    }

    private function criarEmpreendimento(): Empreendimento
    {
        return app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Agropecuária Exemplo Ltda',
            'atividade' => 'agroindustria',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
    }

    private function julgar(ProcessoSancionatorio $processo, int $penalidadeCentavos): ProcessoSancionatorio
    {
        $processos = app(ProcessoSancionatorioService::class);
        $processos->apresentarDefesa($processo, 'Defesa apresentada.');
        $julgador = User::create(['name' => 'Chefia', 'email' => 'chefia-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);

        return $processos->julgar($processo->refresh(), ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação.', $julgador, $penalidadeCentavos);
    }

    public function test_indicador_de_multas_aplicadas_versus_arrecadadas(): void
    {
        // Julgamento e pagamentos acontecem dentro do período consultado.
        $this->travelTo(Carbon::parse('2026-08-10 10:00:00'));

        $fiscalizacao = app(FiscalizacaoAmbientalService::class);
        $auto = $fiscalizacao->emitirAutoInfracaoAmbiental($this->criarExecucaoVistoriaConcluida(), $this->criarEmpreendimento(), [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
            'area_afetada_ha' => 2,
        ]);
        $processo = $this->julgar($auto->documento->processoSancionatorio, 5_000_000);

        $parcelamento = $fiscalizacao->parcelar($processo, 5);
        foreach ($parcelamento->parcelas()->orderBy('numero')->take(3)->get() as $parcela) {
            $fiscalizacao->registrarPagamentoParcela($parcela);
        }

        // Auto de infração do Vistoria que NÃO é ambiental (sem AutoInfracaoAmbiental) — fica fora do indicador.
        $documentoNaoAmbiental = app(DocumentoService::class)->emitirDocumento($this->criarExecucaoVistoriaConcluida(), Documento::TIPO_AUTO_INFRACAO, []);
        $this->julgar($documentoNaoAmbiental->processoSancionatorio, 9_900_000);

        $indicadores = $this->painel->obterIndicadores(self::PERIODO);

        self::assertSame(5_000_000, $indicadores['multas']['valor_aplicado_centavos']);
        self::assertSame(3_000_000, $indicadores['multas']['valor_arrecadado_centavos']);
    }

    public function test_indicador_de_cobertura_de_coleta_seletiva_por_periodo(): void
    {
        $gerador = GeradorResiduo::create(['nome' => 'Bairro Centro', 'tipo' => GeradorResiduo::TIPO_DOMICILIAR]);
        foreach ([['2026-08-03', 5000], ['2026-08-17', 7000]] as [$data, $kg]) {
            ColetaResiduo::create([
                'gerador_residuo_id' => $gerador->id, 'tipo_coleta' => ColetaResiduo::TIPO_COLETA_SELETIVA,
                'volume_kg' => $kg, 'destinacao' => ColetaResiduo::DESTINACAO_RECICLAGEM, 'coletada_em' => $data,
            ]);
        }
        // Coleta regular e coleta seletiva fora do mês não entram.
        ColetaResiduo::create([
            'gerador_residuo_id' => $gerador->id, 'tipo_coleta' => ColetaResiduo::TIPO_COLETA_REGULAR,
            'volume_kg' => 40_000, 'destinacao' => ColetaResiduo::DESTINACAO_ATERRO, 'coletada_em' => '2026-08-10',
        ]);
        ColetaResiduo::create([
            'gerador_residuo_id' => $gerador->id, 'tipo_coleta' => ColetaResiduo::TIPO_COLETA_SELETIVA,
            'volume_kg' => 3_000, 'destinacao' => ColetaResiduo::DESTINACAO_RECICLAGEM, 'coletada_em' => '2026-09-01',
        ]);

        $indicadores = $this->painel->obterIndicadores(self::PERIODO);

        self::assertEquals(12, $indicadores['coleta_seletiva']['coleta_seletiva_toneladas']);
    }

    public function test_licencas_emitidas_e_area_queimada_em_km2_com_evolucao_mensal(): void
    {
        $empreendimento = $this->criarEmpreendimento();
        foreach ([[ProcessoLicenciamento::STATUS_DEFERIDO, '2026-08-05'], [ProcessoLicenciamento::STATUS_DEFERIDO, '2026-08-20'], [ProcessoLicenciamento::STATUS_EM_ANALISE, null]] as $i => [$status, $deferidoEm]) {
            ProcessoLicenciamento::create([
                'empreendimento_id' => $empreendimento->id, 'fase' => ProcessoLicenciamento::FASE_LP, 'numero' => "LP-{$i}/2026", 'numero_sequencial' => $i + 1,
                'exercicio' => 2026, 'status' => $status, 'data_deferimento' => $deferidoEm,
            ]);
        }
        foreach ([['2026-07-30', 150.0], ['2026-08-12', 250.0]] as [$data, $ha]) {
            OcorrenciaQueimada::create([
                'data_ocorrencia' => $data, 'latitude' => -25.4, 'longitude' => -49.2, 'area_queimada_ha' => $ha,
                'situacao' => OcorrenciaQueimada::SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO,
            ]);
        }

        $indicadores = $this->painel->obterIndicadores(['data_inicio' => '2026-07-01', 'data_fim' => '2026-08-31']);

        self::assertSame(2, $indicadores['licencas_emitidas']['total']);
        self::assertEquals(4.0, $indicadores['queimadas']['area_queimada_km2']);
        self::assertEquals([['mes' => '2026-07', 'area_km2' => 1.5], ['mes' => '2026-08', 'area_km2' => 2.5]], $indicadores['queimadas']['evolucao_mensal']);

        $mapa = $this->painel->mapa(['data_inicio' => '2026-07-01', 'data_fim' => '2026-08-31']);
        $camadas = collect($mapa['features'])->countBy(fn (array $f): string => $f['properties']['camada']);
        self::assertSame(['queimada' => 2, 'licenca' => 2], $camadas->all());
    }

    public function test_pagamento_de_parcela_ja_paga_e_rejeitado(): void
    {
        $fiscalizacao = app(FiscalizacaoAmbientalService::class);
        $auto = $fiscalizacao->emitirAutoInfracaoAmbiental($this->criarExecucaoVistoriaConcluida(), $this->criarEmpreendimento(), [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
            'area_afetada_ha' => 1,
        ]);
        $parcela = $fiscalizacao->parcelar($this->julgar($auto->documento->processoSancionatorio, 100_000), 1)->parcelas()->firstOrFail();
        $fiscalizacao->registrarPagamentoParcela($parcela);

        $this->expectException(RegraNegocioException::class);
        $fiscalizacao->registrarPagamentoParcela($parcela->refresh());
    }
}
