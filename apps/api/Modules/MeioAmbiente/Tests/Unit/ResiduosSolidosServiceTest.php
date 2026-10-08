<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\PontoLogisticaReversa;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\ResiduosSolidosService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Tests\TestCase;

final class ResiduosSolidosServiceTest extends TestCase
{
    use RefreshDatabase;

    private ResiduosSolidosService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(ResiduosSolidosService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
    }

    public function test_cadastra_gerador_industrial_vinculado_a_empreendimento(): void
    {
        $empreendimento = app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $gerador = $this->service->cadastrarGerador([
            'tipo' => GeradorResiduo::TIPO_INDUSTRIAL,
            'empreendimento_id' => $empreendimento->id,
        ]);

        self::assertSame($empreendimento->id, $gerador->empreendimento_id);
        self::assertSame(GeradorResiduo::TIPO_INDUSTRIAL, $gerador->tipo);
    }

    public function test_registra_coleta_seletiva_com_destinacao_para_reciclagem(): void
    {
        $gerador = GeradorResiduo::create(['nome' => 'Comércio Exemplo', 'tipo' => GeradorResiduo::TIPO_COMERCIAL]);

        $coleta = $this->service->registrarColeta($gerador, [
            'tipo_coleta' => ColetaResiduo::TIPO_COLETA_SELETIVA,
            'rota' => 'Rota Centro',
            'volume_kg' => 150,
            'destinacao' => ColetaResiduo::DESTINACAO_RECICLAGEM,
        ]);

        self::assertSame($gerador->id, $coleta->gerador_residuo_id);
        self::assertSame('150.00', (string) $coleta->volume_kg);
        self::assertSame('Rota Centro', $coleta->rota);
    }

    public function test_rejeita_volume_coletado_negativo(): void
    {
        $gerador = GeradorResiduo::create(['nome' => 'Comércio Exemplo', 'tipo' => GeradorResiduo::TIPO_COMERCIAL]);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Volume coletado deve ser positivo.');

        $this->service->registrarColeta($gerador, [
            'tipo_coleta' => ColetaResiduo::TIPO_COLETA_REGULAR,
            'volume_kg' => -10,
            'destinacao' => ColetaResiduo::DESTINACAO_ATERRO,
        ]);
    }

    public function test_registra_entrega_de_pilhas_em_ponto_de_coleta(): void
    {
        $ponto = PontoLogisticaReversa::create(['nome' => 'Ponto Praça Central', 'categoria' => PontoLogisticaReversa::CATEGORIA_PILHAS_BATERIAS]);

        $this->service->registrarEntrega($ponto, ['quantidade_kg' => 12.5]);

        self::assertSame(12.5, $ponto->totalAcumuladoKg());
    }

    public function test_total_acumulado_soma_multiplas_entregas(): void
    {
        $ponto = PontoLogisticaReversa::create(['nome' => 'Ponto Praça Central', 'categoria' => PontoLogisticaReversa::CATEGORIA_PILHAS_BATERIAS]);

        $this->service->registrarEntrega($ponto, ['quantidade_kg' => 12.5]);
        $this->service->registrarEntrega($ponto, ['quantidade_kg' => 7.5]);

        self::assertSame(20.0, $ponto->totalAcumuladoKg());
    }
}
