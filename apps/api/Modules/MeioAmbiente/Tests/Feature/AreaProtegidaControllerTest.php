<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\AreaProtegida;
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
}
