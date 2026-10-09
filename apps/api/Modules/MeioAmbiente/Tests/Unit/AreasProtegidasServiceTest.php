<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Services\AreasProtegidasService;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Tests\TestCase;

final class AreasProtegidasServiceTest extends TestCase
{
    use RefreshDatabase;

    private AreasProtegidasService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(AreasProtegidasService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
    }

    /**
     * Quadrado fechado em torno da origem (-1,-1) a (1,1), em [longitude, latitude].
     *
     * @return array<string, mixed>
     */
    private function poligonoQuadrado(): array
    {
        return [
            'type' => 'Polygon',
            'coordinates' => [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]],
        ];
    }

    public function test_cadastra_unidade_de_conservacao_municipal(): void
    {
        $area = $this->service->cadastrarAreaProtegida([
            'tipo' => AreaProtegida::TIPO_UNIDADE_CONSERVACAO,
            'subtipo' => 'parque_municipal',
            'geometria' => $this->poligonoQuadrado(),
            'ato_legal' => 'Lei Municipal 1234/2020',
        ]);

        self::assertSame(AreaProtegida::TIPO_UNIDADE_CONSERVACAO, $area->tipo);
        self::assertSame('parque_municipal', $area->subtipo);
    }

    public function test_geometria_invalida_e_rejeitada(): void
    {
        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Geometria da área protegida inválida.');

        $this->service->cadastrarAreaProtegida([
            'tipo' => AreaProtegida::TIPO_APP,
            'geometria' => ['type' => 'Polygon', 'coordinates' => [[[0, 0], [1, 1]]]],
        ]);
    }

    public function test_empreendimento_com_sobreposicao_a_app_e_sinalizado(): void
    {
        $this->service->cadastrarAreaProtegida([
            'tipo' => AreaProtegida::TIPO_APP,
            'geometria' => $this->poligonoQuadrado(),
        ]);

        $empreendimento = app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_MEDIO,
            'latitude' => 0,
            'longitude' => 0,
        ]);

        $sobrepostas = $this->service->verificarSobreposicao($empreendimento);

        self::assertCount(1, $sobrepostas);
        self::assertSame(AreaProtegida::TIPO_APP, $sobrepostas[0]->tipo);
    }

    public function test_empreendimento_fora_da_area_protegida_nao_e_sinalizado(): void
    {
        $this->service->cadastrarAreaProtegida([
            'tipo' => AreaProtegida::TIPO_APP,
            'geometria' => $this->poligonoQuadrado(),
        ]);

        $empreendimento = app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_MEDIO,
            'latitude' => 50,
            'longitude' => 50,
        ]);

        self::assertCount(0, $this->service->verificarSobreposicao($empreendimento));
    }

    public function test_listagem_para_mapa_filtra_apenas_reservas_legais(): void
    {
        $this->service->cadastrarAreaProtegida(['tipo' => AreaProtegida::TIPO_APP, 'geometria' => $this->poligonoQuadrado()]);
        $this->service->cadastrarAreaProtegida(['tipo' => AreaProtegida::TIPO_APP, 'geometria' => $this->poligonoQuadrado()]);
        $this->service->cadastrarAreaProtegida(['tipo' => AreaProtegida::TIPO_RESERVA_LEGAL, 'geometria' => $this->poligonoQuadrado()]);

        $features = $this->service->listarParaMapa(['tipo' => AreaProtegida::TIPO_RESERVA_LEGAL]);

        self::assertCount(1, $features);
        self::assertSame(AreaProtegida::TIPO_RESERVA_LEGAL, $features[0]['properties']['tipo']);
    }
}
