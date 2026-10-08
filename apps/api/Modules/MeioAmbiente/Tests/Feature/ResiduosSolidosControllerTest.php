<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\PontoLogisticaReversa;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class ResiduosSolidosControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    public function test_gestor_cadastra_gerador_de_residuos_via_api(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');

        $resposta = $this->como($gestor, $this->tenant)
            ->postJson('/api/meio_ambiente/geradores-residuo', ['nome' => 'Gerador Teste', 'tipo' => GeradorResiduo::TIPO_DOMICILIAR]);

        $resposta->assertCreated();
        self::assertSame(1, GeradorResiduo::count());
    }

    public function test_analista_sem_permissao_de_residuos_e_recusado(): void
    {
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');

        $this->como($analista, $this->tenant)
            ->postJson('/api/meio_ambiente/geradores-residuo', ['nome' => 'Gerador Teste', 'tipo' => GeradorResiduo::TIPO_DOMICILIAR])
            ->assertForbidden();

        self::assertSame(0, GeradorResiduo::count());
    }

    public function test_gestor_registra_entrega_de_logistica_reversa_via_api(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');
        $ponto = $this->noTenant($this->tenant, fn () => PontoLogisticaReversa::create([
            'nome' => 'Ponto Praça Central', 'categoria' => PontoLogisticaReversa::CATEGORIA_PILHAS_BATERIAS,
        ]));

        $resposta = $this->como($gestor, $this->tenant)
            ->postJson("/api/meio_ambiente/pontos-logistica-reversa/{$ponto->id}/entregas", ['quantidade_kg' => 12.5]);

        $resposta->assertCreated();
    }
}
