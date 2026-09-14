<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Database\Seeders\CapdFatoresSeeder;
use Modules\Capd\Database\Seeders\CapdPerguntasPadraoSeeder;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Tests\TestCase;

/**
 * RF-02 — GET /avaliacoes/{id}/preview-nota deve calcular a prévia usando os
 * pesos do modelo de formulário vigente (ModeloFatorPeso), sem travas.
 */
final class PreviewNotaTest extends TestCase
{
    use RefreshDatabase;

    public function test_preview_nota_calcula_sem_persistir_usando_pesos_do_modelo(): void
    {
        $tenant = Tenant::create(['name' => 'Município Preview', 'slug' => 'pref-preview', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new CapdFatoresSeeder())->run();
        (new CapdPerguntasPadraoSeeder())->seedTenant($tenant->id);

        $admin = User::create([
            'name' => 'Admin Preview', 'email' => 'admin.preview@araucaria.pr.gov.br', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Preview', 'email' => 'servidor.preview@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233344']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Preview 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);

        $query = http_build_query([
            'respostas_fatores' => [
                'F3' => ['grau' => 4], 'F4' => ['grau' => 4], 'F5' => ['grau' => 4],
                'F6' => ['grau' => 4], 'F7' => ['grau' => 4], 'F8' => ['grau' => 4],
            ],
        ]);

        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/avaliacoes/{$avaliacao->id}/preview-nota?{$query}");

        $response->assertStatus(200);
        $this->assertTrue($response->json('preview'));
        $this->assertNotNull($response->json('resultado.nota_final'));

        // Não persiste: avaliação segue sem nota gravada.
        $this->assertNull($avaliacao->fresh()->nota_final);

        app(TenantContext::class)->clear();
    }
}
