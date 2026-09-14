<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Tests\TestCase;

/**
 * RF-12 — Exportação do Espelho Funcional Individual em PDF.
 */
final class EspelhoPdfTest extends TestCase
{
    use RefreshDatabase;

    public function test_exporta_espelho_da_avaliacao_em_pdf(): void
    {
        $tenant = Tenant::create(['name' => 'Município de Araucária Espelho', 'slug' => 'pref-espelho', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliador = User::create(['name' => 'Avaliador Espelho', 'email' => 'avaliador.espelho@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliador->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidorUser = User::create(['name' => 'Servidor Espelho', 'email' => 'servidor.espelho@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Espelho 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $avaliador->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F1' => ['grau' => 4, 'pontos' => 85.50]],
            'nota_final' => '85.50', 'homologada' => true, 'data_conclusao' => now(),
        ]);

        $response = $this->actingAs($avaliador)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->get("/api/capd/avaliacoes/{$avaliacao->id}/espelho/exportar-pdf");

        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('Content-Type'), 'pdf')
            || str_contains((string) $response->headers->get('Content-Type'), 'html')
        );

        app(TenantContext::class)->clear();
    }
}
