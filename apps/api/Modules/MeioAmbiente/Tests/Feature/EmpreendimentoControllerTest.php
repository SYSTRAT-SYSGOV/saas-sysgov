<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class EmpreendimentoControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    public function test_analista_cadastra_empreendimento_pessoa_juridica_via_api(): void
    {
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');

        $resposta = $this->como($analista, $this->tenant)->postJson('/api/meio_ambiente/empreendimentos', [
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $resposta->assertCreated();
        self::assertSame(1, Empreendimento::count());
    }

    public function test_cadastro_sem_titular_pf_nem_cnpj_retorna_422(): void
    {
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');

        $resposta = $this->como($analista, $this->tenant)->postJson('/api/meio_ambiente/empreendimentos', [
            'atividade' => 'agroindustria',
            'porte' => Empreendimento::PORTE_PEQUENO,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $resposta->assertStatus(422)->assertJsonPath('code', 'titular_obrigatorio');
    }

    public function test_fiscal_sem_permissao_de_empreendimentos_e_recusado(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $this->como($fiscal, $this->tenant)->postJson('/api/meio_ambiente/empreendimentos', [
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ])->assertForbidden();

        self::assertSame(0, Empreendimento::count());
    }

    public function test_lista_empreendimentos_para_mapa_filtrando_por_atividade(): void
    {
        $this->noTenant($this->tenant, function (): void {
            Empreendimento::create([
                'cnpj' => '12345678000199', 'razao_social' => 'Agroindústria A', 'atividade' => 'agroindustria',
                'porte' => Empreendimento::PORTE_MEDIO, 'latitude' => -25.1, 'longitude' => -49.1,
            ]);
            Empreendimento::create([
                'cnpj' => '98765432000188', 'razao_social' => 'Química B', 'atividade' => 'industria_quimica',
                'porte' => Empreendimento::PORTE_GRANDE, 'latitude' => -25.2, 'longitude' => -49.2,
            ]);
        });

        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $resposta = $this->como($fiscal, $this->tenant)->getJson('/api/meio_ambiente/empreendimentos/mapa?atividade=agroindustria');

        $resposta->assertOk();
        self::assertCount(1, $resposta->json('features'));
        self::assertSame('agroindustria', $resposta->json('features.0.properties.atividade'));
    }
}
