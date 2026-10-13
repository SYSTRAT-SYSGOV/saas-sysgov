<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Dashboard; Validade dos documentos da entidade. */
final class DashboardTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_indicadores_acoes_rapidas_e_alertas(): void
    {
        Carbon::setTestNow('2026-10-06 10:00:00');
        $tenant = $this->criarTenant();
        $this->bem($tenant, '1');
        $this->bem($tenant, '2', PapelSituacao::EmAvaliacao);
        $pendente = $this->entidade($tenant, StatusEntidade::Pendente, '111111110001');
        $vencida = $this->entidade($tenant, StatusEntidade::Habilitada, '222222220001', ['estatuto_social' => '2026-09-30']);

        $resposta = $this->como($this->usuario($tenant), $tenant)->getJson('/api/inservivel/dashboard')->assertOk();
        $resposta->assertJsonPath('indicadores.bens', 2)->assertJsonPath('indicadores.bens_em_avaliacao', 1)
            ->assertJsonPath('indicadores.entidades', 2)->assertJsonPath('indicadores.entidades_aguardando', 1)
            ->assertJsonPath('entidades_aguardando.0.id', $pendente->id)
            ->assertJsonPath('alertas_documentos.0.entidade_id', $vencida->id)->assertJsonPath('alertas_documentos.0.vencido', true)
            ->assertJsonPath('solicitacoes_pendentes', 0)->assertJsonCount(2, 'ultimos_bens');
    }

    public function test_servidor_ve_dashboard_sem_dados_de_entidades(): void
    {
        $tenant = $this->criarTenant();
        $this->entidade($tenant, StatusEntidade::Pendente);

        $this->como($this->usuario($tenant, ['inservivel_servidor']), $tenant)->getJson('/api/inservivel/dashboard')->assertOk()
            ->assertJsonCount(0, 'entidades_aguardando')->assertJsonPath('solicitacoes_pendentes', null);
    }
}
