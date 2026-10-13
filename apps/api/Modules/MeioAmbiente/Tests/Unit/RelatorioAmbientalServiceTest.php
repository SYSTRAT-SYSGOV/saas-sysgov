<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Services\RelatorioAmbientalService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Tests\TestCase;

final class RelatorioAmbientalServiceTest extends TestCase
{
    use RefreshDatabase;

    private RelatorioAmbientalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(RelatorioAmbientalService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
    }

    private function coleta(GeradorResiduo $gerador, string $tipo, string $destinacao, float $kg, string $data): void
    {
        ColetaResiduo::create([
            'gerador_residuo_id' => $gerador->id,
            'tipo_coleta' => $tipo,
            'volume_kg' => $kg,
            'destinacao' => $destinacao,
            'coletada_em' => $data,
        ]);
    }

    private function queimada(float $areaHa, string $data): void
    {
        OcorrenciaQueimada::create([
            'data_ocorrencia' => $data,
            'latitude' => -25.4,
            'longitude' => -49.2,
            'area_queimada_ha' => $areaHa,
            'situacao' => OcorrenciaQueimada::SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO,
        ]);
    }

    public function test_geracao_do_relatorio_anual_de_residuos_solidos(): void
    {
        $domiciliar = GeradorResiduo::create(['nome' => 'Bairro Centro', 'tipo' => GeradorResiduo::TIPO_DOMICILIAR]);
        $comercial = GeradorResiduo::create(['nome' => 'Mercado Exemplo', 'tipo' => GeradorResiduo::TIPO_COMERCIAL]);

        $this->coleta($domiciliar, ColetaResiduo::TIPO_COLETA_REGULAR, ColetaResiduo::DESTINACAO_ATERRO, 3000, '2025-03-10');
        $this->coleta($domiciliar, ColetaResiduo::TIPO_COLETA_REGULAR, ColetaResiduo::DESTINACAO_ATERRO, 2000, '2025-07-02');
        $this->coleta($comercial, ColetaResiduo::TIPO_COLETA_SELETIVA, ColetaResiduo::DESTINACAO_RECICLAGEM, 1500, '2025-11-20');
        // Fora do exercício — não entra.
        $this->coleta($domiciliar, ColetaResiduo::TIPO_COLETA_REGULAR, ColetaResiduo::DESTINACAO_ATERRO, 9999, '2024-12-31');

        $relatorio = $this->service->gerarRelatorio(RelatorioAmbiental::TIPO_RARS, 2025);

        self::assertSame(RelatorioAmbiental::TIPO_RARS, $relatorio->tipo);
        self::assertEquals(6.5, $relatorio->dados['total_coletado_toneladas']);

        /** @var list<array<string, mixed>> $porGrupo */
        $porGrupo = $relatorio->dados['por_tipo_coleta_e_destinacao'];
        $grupos = collect($porGrupo)->keyBy(fn (array $g): string => "{$g['tipo_coleta']}/{$g['destinacao']}");
        self::assertEquals(5.0, $grupos['regular/aterro']['volume_toneladas']);
        self::assertSame(2, $grupos['regular/aterro']['quantidade_coletas']);
        self::assertEquals(1.5, $grupos['seletiva/reciclagem']['volume_toneladas']);
        self::assertEquals(0.0, $grupos['seletiva/aterro']['volume_toneladas']);

        self::assertEquals(5.0, $relatorio->dados['por_tipo_gerador_toneladas'][GeradorResiduo::TIPO_DOMICILIAR]);
        self::assertEquals(1.5, $relatorio->dados['por_tipo_gerador_toneladas'][GeradorResiduo::TIPO_COMERCIAL]);
    }

    public function test_inventario_de_gee_consolida_aterro_e_queimadas_com_fatores_de_emissao(): void
    {
        $gerador = GeradorResiduo::create(['nome' => 'Bairro Centro', 'tipo' => GeradorResiduo::TIPO_DOMICILIAR]);
        $this->coleta($gerador, ColetaResiduo::TIPO_COLETA_REGULAR, ColetaResiduo::DESTINACAO_ATERRO, 10_000, '2025-05-01');
        // Reciclagem não entra no inventário.
        $this->coleta($gerador, ColetaResiduo::TIPO_COLETA_SELETIVA, ColetaResiduo::DESTINACAO_RECICLAGEM, 4_000, '2025-05-01');
        $this->queimada(2.5, '2025-08-15');

        $relatorio = $this->service->gerarRelatorio(RelatorioAmbiental::TIPO_GEE, 2025);

        /** @var list<array<string, mixed>> $porFonte */
        $porFonte = $relatorio->dados['fontes'];
        $fontes = collect($porFonte)->keyBy('fonte');
        self::assertEquals(10.0, $fontes['residuos_aterro']['dado_atividade']);
        self::assertEquals(10.0 * RelatorioAmbientalService::FATOR_EMISSAO_ATERRO_TCO2E_POR_T, $fontes['residuos_aterro']['emissoes_tco2e']);
        self::assertEquals(2.5, $fontes['queimadas']['dado_atividade']);
        self::assertEquals(2.5 * RelatorioAmbientalService::FATOR_EMISSAO_QUEIMADA_TCO2E_POR_HA, $fontes['queimadas']['emissoes_tco2e']);
        self::assertEquals(5.0 + 20.0, $relatorio->dados['total_emissoes_tco2e']);
    }

    public function test_relatorio_gerado_e_um_retrato_que_nao_muda_com_lancamentos_posteriores(): void
    {
        $gerador = GeradorResiduo::create(['nome' => 'Bairro Centro', 'tipo' => GeradorResiduo::TIPO_DOMICILIAR]);
        $this->coleta($gerador, ColetaResiduo::TIPO_COLETA_REGULAR, ColetaResiduo::DESTINACAO_ATERRO, 1000, '2025-02-01');
        $relatorio = $this->service->gerarRelatorio(RelatorioAmbiental::TIPO_RARS, 2025);

        $this->coleta($gerador, ColetaResiduo::TIPO_COLETA_REGULAR, ColetaResiduo::DESTINACAO_ATERRO, 5000, '2025-03-01');

        self::assertEquals(1.0, $relatorio->refresh()->dados['total_coletado_toneladas']);
    }

    public function test_exportacao_do_inventario_de_gee_no_formato_solicitado(): void
    {
        $this->queimada(1.0, '2025-08-15');
        $relatorio = $this->service->gerarRelatorio(RelatorioAmbiental::TIPO_GEE, 2025);

        $csv = $this->service->exportarRelatorio($relatorio, RelatorioAmbiental::FORMATO_CSV);
        self::assertSame('text/csv; charset=UTF-8', $csv['content_type']);
        self::assertStringEndsWith('.csv', $csv['nome_arquivo']);
        self::assertStringContainsString('queimadas;1;ha;8;8', $csv['conteudo']);

        $json = $this->service->exportarRelatorio($relatorio, RelatorioAmbiental::FORMATO_JSON);
        $decodificado = json_decode($json['conteudo'], true);
        self::assertSame('gee', $decodificado['tipo']);
        self::assertSame(2025, $decodificado['exercicio']);
        self::assertEquals(8.0, $decodificado['dados']['total_emissoes_tco2e']);

        $pdf = $this->service->exportarRelatorio($relatorio, RelatorioAmbiental::FORMATO_PDF);
        self::assertSame('application/pdf', $pdf['content_type']);
        self::assertStringStartsWith('%PDF', $pdf['conteudo']);
    }

    public function test_formato_de_exportacao_desconhecido_e_rejeitado(): void
    {
        $relatorio = $this->service->gerarRelatorio(RelatorioAmbiental::TIPO_GEE, 2025);

        $this->expectException(RegraNegocioException::class);
        $this->service->exportarRelatorio($relatorio, 'xml');
    }
}
