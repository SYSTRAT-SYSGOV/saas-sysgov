<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class RelatoriosEIndicadoresControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    public function test_usuario_sem_permissao_de_chefia_nao_acessa_o_painel(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $this->como($fiscal, $this->tenant)->getJson('/api/meio_ambiente/painel/indicadores')->assertForbidden();
        $this->como($fiscal, $this->tenant)->getJson('/api/meio_ambiente/painel/mapa')->assertForbidden();
        $this->como($fiscal, $this->tenant)
            ->postJson('/api/meio_ambiente/relatorios', ['tipo' => RelatorioAmbiental::TIPO_RARS, 'exercicio' => 2025])
            ->assertForbidden();

        self::assertSame(0, RelatorioAmbiental::withoutGlobalScopes()->count());
    }

    public function test_chefia_consulta_indicadores_e_mapa(): void
    {
        $chefia = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');

        $this->como($chefia, $this->tenant)
            ->getJson('/api/meio_ambiente/painel/indicadores?data_inicio=2026-01-01&data_fim=2026-03-31')
            ->assertOk()
            ->assertJsonPath('periodo.data_inicio', '2026-01-01')
            ->assertJsonPath('multas.valor_aplicado_centavos', 0)
            ->assertJsonCount(3, 'coleta_seletiva.evolucao_mensal');

        $this->como($chefia, $this->tenant)
            ->getJson('/api/meio_ambiente/painel/mapa')
            ->assertOk()
            ->assertJsonPath('type', 'FeatureCollection');
    }

    public function test_chefia_gera_e_exporta_relatorio_via_api(): void
    {
        $chefia = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');

        $resposta = $this->como($chefia, $this->tenant)
            ->postJson('/api/meio_ambiente/relatorios', ['tipo' => RelatorioAmbiental::TIPO_GEE, 'exercicio' => 2025])
            ->assertCreated()
            ->assertJsonPath('tipo', RelatorioAmbiental::TIPO_GEE);
        $id = $resposta->json('id');

        $this->como($chefia, $this->tenant)->getJson('/api/meio_ambiente/relatorios')->assertOk()->assertJsonCount(1, 'data');

        $this->como($chefia, $this->tenant)
            ->get("/api/meio_ambiente/relatorios/{$id}/exportar?formato=csv")
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->assertHeader('Content-Disposition', "attachment; filename=\"gee_2025_{$id}.csv\"");

        $this->como($chefia, $this->tenant)
            ->getJson("/api/meio_ambiente/relatorios/{$id}/exportar?formato=xml")
            ->assertUnprocessable();
    }

    public function test_relatorio_de_outro_tenant_nao_e_acessivel(): void
    {
        $outroTenant = $this->criarTenant('prefeitura-b');
        $relatorio = $this->noTenant($outroTenant, fn () => RelatorioAmbiental::create([
            'tipo' => RelatorioAmbiental::TIPO_RARS, 'exercicio' => 2025, 'dados' => ['total_coletado_toneladas' => 1],
        ]));
        $chefia = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');

        $this->como($chefia, $this->tenant)->getJson("/api/meio_ambiente/relatorios/{$relatorio->id}")->assertForbidden();
        $this->como($chefia, $this->tenant)->get("/api/meio_ambiente/relatorios/{$relatorio->id}/exportar?formato=json")->assertForbidden();
        $this->como($chefia, $this->tenant)->getJson('/api/meio_ambiente/relatorios')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_exercicio_futuro_e_rejeitado(): void
    {
        $chefia = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');

        $this->como($chefia, $this->tenant)
            ->postJson('/api/meio_ambiente/relatorios', ['tipo' => RelatorioAmbiental::TIPO_RARS, 'exercicio' => now()->year + 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('exercicio');
    }
}
