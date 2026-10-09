<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\MeioAmbiente\Models\AlertaRecursoHidrico;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\OutorgaAgua;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\RecursosHidricosService;
use Tests\TestCase;

final class RecursosHidricosServiceTest extends TestCase
{
    use RefreshDatabase;

    private RecursosHidricosService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(RecursosHidricosService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
    }

    private function criarEmpreendimentoIndustrial(): Empreendimento
    {
        return app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
    }

    public function test_cadastra_outorga_de_poco_para_uso_industrial(): void
    {
        $empreendimento = $this->criarEmpreendimentoIndustrial();

        $outorga = $this->service->cadastrarOutorga($empreendimento, [
            'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO,
            'vazao_m3_hora' => 10,
            'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL,
        ]);

        self::assertSame($empreendimento->id, $outorga->empreendimento_id);
        self::assertSame(today()->addDays(OutorgaAgua::VALIDADE_DIAS)->toDateString(), $outorga->validade_em->toDateString());
    }

    public function test_cadastra_licenca_efluente_com_parametros_de_qualidade(): void
    {
        $empreendimento = $this->criarEmpreendimentoIndustrial();
        $this->service->cadastrarOutorga($empreendimento, [
            'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO,
            'vazao_m3_hora' => 10,
            'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL,
        ]);

        $licenca = $this->service->cadastrarLicencaEfluente($empreendimento, [
            ['parametro' => 'pH', 'limite_min' => 6, 'limite_max' => 9],
            ['parametro' => 'DBO', 'limite_max' => 60, 'unidade' => 'mg/L'],
        ]);

        self::assertCount(2, $licenca->parametros);
    }

    public function test_medicao_fora_do_limite_regulatorio_e_sinalizada(): void
    {
        $empreendimento = $this->criarEmpreendimentoIndustrial();
        $licenca = $this->service->cadastrarLicencaEfluente($empreendimento, [
            ['parametro' => 'pH', 'limite_min' => 6, 'limite_max' => 9],
        ]);
        $parametroPh = $licenca->parametros()->firstOrFail();

        $medicao = $this->service->registrarMedicao($parametroPh, ['valor' => 10.5]);

        self::assertFalse($medicao->conforme);
        self::assertTrue($licenca->temNaoConformidade());
    }

    public function test_medicao_dentro_do_limite_nao_gera_nao_conformidade(): void
    {
        $empreendimento = $this->criarEmpreendimentoIndustrial();
        $licenca = $this->service->cadastrarLicencaEfluente($empreendimento, [
            ['parametro' => 'pH', 'limite_min' => 6, 'limite_max' => 9],
        ]);
        $parametroPh = $licenca->parametros()->firstOrFail();

        $medicao = $this->service->registrarMedicao($parametroPh, ['valor' => 7.2]);

        self::assertTrue($medicao->conforme);
        self::assertFalse($licenca->temNaoConformidade());
    }

    public function test_alerta_gerado_90_dias_antes_do_vencimento_da_outorga(): void
    {
        $empreendimento = $this->criarEmpreendimentoIndustrial();
        $outorga = OutorgaAgua::create([
            'empreendimento_id' => $empreendimento->id,
            'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO,
            'vazao_m3_hora' => 10,
            'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL,
            'validade_em' => Carbon::now()->addDays(90),
        ]);

        $gerados = $this->service->verificarPrazos();

        self::assertSame(1, $gerados);
        self::assertSame(
            1,
            AlertaRecursoHidrico::where('tipo_referencia', AlertaRecursoHidrico::TIPO_OUTORGA_AGUA)
                ->where('referencia_id', $outorga->id)
                ->where('dias_para_vencimento', 90)
                ->count(),
        );
    }
}
