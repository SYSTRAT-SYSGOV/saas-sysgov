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
 * RF-12 — obterEspelho/exportarEspelhoPdf devem usar AvaliacaoPolicy::view
 * (self, avaliador ou membro CAPD), nunca ficar abertos a qualquer usuário
 * autenticado do tenant (BOLA).
 */
final class EspelhoAvaliacaoRbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_usuario_estranho_a_avaliacao_recebe_403_ao_ver_espelho(): void
    {
        $tenant = Tenant::create(['name' => 'Município Espelho RBAC', 'slug' => 'pref-espelho-rbac', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliador = User::create(['name' => 'Avaliador Espelho RBAC', 'email' => 'avaliador.espelho.rbac@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliador->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Espelho RBAC', 'email' => 'servidor.espelho.rbac@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        $estranho = User::create(['name' => 'Estranho', 'email' => 'estranho.espelho@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $estranho->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Espelho RBAC', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $avaliador->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F3' => ['grau' => 4, 'nota' => 85.50]],
            'nota_final' => '85.50', 'homologada' => true, 'data_conclusao' => now(),
        ]);

        $response = $this->actingAs($estranho)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/avaliacoes/{$avaliacao->id}/espelho");

        $response->assertStatus(403);

        app(TenantContext::class)->clear();
    }

    public function test_proprio_servidor_visualiza_seu_espelho(): void
    {
        $tenant = Tenant::create(['name' => 'Município Espelho Self', 'slug' => 'pref-espelho-self', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliador = User::create(['name' => 'Avaliador Espelho Self', 'email' => 'avaliador.espelho.self@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliador->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Espelho Self', 'email' => 'servidor.espelho.self@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $servidorUser->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Espelho Self', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $avaliador->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F3' => ['grau' => 4, 'nota' => 85.50]],
            'nota_final' => '85.50', 'homologada' => true, 'data_conclusao' => now(),
        ]);

        $response = $this->actingAs($servidorUser)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/avaliacoes/{$avaliacao->id}/espelho");

        $response->assertStatus(200);

        app(TenantContext::class)->clear();
    }
}
