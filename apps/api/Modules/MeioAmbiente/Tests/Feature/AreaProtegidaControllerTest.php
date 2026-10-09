<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class AreaProtegidaControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    public function test_gestor_cadastra_area_protegida_via_api(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');

        $resposta = $this->como($gestor, $this->tenant)->postJson('/api/meio_ambiente/areas-protegidas', [
            'tipo' => AreaProtegida::TIPO_APP,
            'geometria' => ['type' => 'Polygon', 'coordinates' => [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]]],
        ]);

        $resposta->assertCreated();
        self::assertSame(1, AreaProtegida::count());
    }

    public function test_fiscal_sem_permissao_de_areas_protegidas_e_recusado(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $this->como($fiscal, $this->tenant)->postJson('/api/meio_ambiente/areas-protegidas', [
            'tipo' => AreaProtegida::TIPO_APP,
            'geometria' => ['type' => 'Polygon', 'coordinates' => [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]]],
        ])->assertForbidden();

        self::assertSame(0, AreaProtegida::count());
    }

    public function test_mapa_responde_feature_collection(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');

        $this->noTenant($this->tenant, fn () => AreaProtegida::create([
            'tipo' => AreaProtegida::TIPO_RESERVA_LEGAL,
            'geometria' => ['type' => 'Polygon', 'coordinates' => [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]]],
        ]));

        $this->como($gestor, $this->tenant)->getJson('/api/meio_ambiente/areas-protegidas/mapa')
            ->assertOk()
            ->assertJsonPath('type', 'FeatureCollection')
            ->assertJsonCount(1, 'features');
    }

    public function test_lista_areas_e_verifica_sobreposicao_com_empreendimento(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');
        $this->como($gestor, $this->tenant)->postJson('/api/meio_ambiente/areas-protegidas', [
            'tipo' => AreaProtegida::TIPO_APP,
            'geometria' => ['type' => 'Polygon', 'coordinates' => [[[-50, -26], [-49, -26], [-49, -25], [-50, -25], [-50, -26]]]],
        ])->assertCreated();
        $empreendimento = $this->noTenant($this->tenant, fn () => Empreendimento::create([
            'cnpj' => '12345678000199', 'razao_social' => 'Dentro da APP Ltda', 'atividade' => 'industria',
            'porte' => Empreendimento::PORTE_PEQUENO, 'latitude' => -25.5, 'longitude' => -49.5,
        ]));

        $this->como($gestor, $this->tenant)->getJson('/api/meio_ambiente/areas-protegidas')->assertOk()->assertJsonCount(1, 'data');
        $this->como($gestor, $this->tenant)->getJson("/api/meio_ambiente/empreendimentos/{$empreendimento->id}/areas-protegidas-sobrepostas")
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_usuario_sem_acesso_nao_lista_areas_nem_mapa(): void
    {
        $semPerfil = $this->usuario($this->tenant, [], 'Sem perfil');

        $this->como($semPerfil, $this->tenant)->getJson('/api/meio_ambiente/areas-protegidas')->assertForbidden();
        $this->como($semPerfil, $this->tenant)->getJson('/api/meio_ambiente/areas-protegidas/mapa')->assertForbidden();
    }
}
