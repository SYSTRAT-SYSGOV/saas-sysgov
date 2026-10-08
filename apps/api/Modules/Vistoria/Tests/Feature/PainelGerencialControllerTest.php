<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class PainelGerencialControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->tenant = $this->criarTenant();
    }

    public function test_fiscal_sem_permissao_de_chefia_e_recusado_em_todos_os_endpoints(): void
    {
        $fiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Fiscal');

        $this->como($fiscal, $this->tenant)->getJson('/api/vistoria/painel/mapa')->assertStatus(403);
        $this->como($fiscal, $this->tenant)->getJson('/api/vistoria/painel/produtividade')->assertStatus(403);
        $this->como($fiscal, $this->tenant)->getJson('/api/vistoria/painel/indicadores')->assertStatus(403);
    }

    public function test_chefia_acessa_todos_os_endpoints_do_painel(): void
    {
        $chefe = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

        $this->como($chefe, $this->tenant)->getJson('/api/vistoria/painel/mapa')
            ->assertStatus(200)->assertJsonPath('type', 'FeatureCollection');

        $this->como($chefe, $this->tenant)->getJson('/api/vistoria/painel/produtividade')
            ->assertStatus(200)->assertJsonStructure(['periodo', 'fiscais']);

        $this->como($chefe, $this->tenant)->getJson('/api/vistoria/painel/indicadores')
            ->assertStatus(200)->assertJsonStructure(['periodo', 'autuacoes_por_tipo', 'taxa_regularizacao', 'tempo_medio_dias_vistoria_ate_conclusao_processo']);
    }

    public function test_recusa_periodo_invalido_com_422(): void
    {
        $chefe = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

        $this->como($chefe, $this->tenant)->getJson('/api/vistoria/painel/mapa?data_inicio=2026-10-10&data_fim=2026-10-01')
            ->assertStatus(422);
    }
}
