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

final class KpisEquipeTest extends TestCase
{
    use RefreshDatabase;

    public function test_avaliador_comum_ve_apenas_kpis_da_propria_equipe(): void
    {
        $tenant = Tenant::create(['name' => 'Município KPIs', 'slug' => 'pref-kpis', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliadorA = User::create(['name' => 'Avaliador A', 'email' => 'avaliador.a@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliadorA->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $avaliadorB = User::create(['name' => 'Avaliador B', 'email' => 'avaliador.b@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliadorB->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidor1 = User::create(['name' => 'Servidor 1', 'email' => 'servidor1.kpis@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233377']);
        $servidor2 = User::create(['name' => 'Servidor 2', 'email' => 'servidor2.kpis@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233388']);
        $servidor3 = User::create(['name' => 'Servidor 3', 'email' => 'servidor3.kpis@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233399']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo KPIs 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        // Equipe do avaliador A: 2 avaliações, 1 concluída com nota 8.00
        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidor1->id,
            'avaliador_id' => $avaliadorA->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => ['F3' => ['grau' => 4]],
            'nota_final' => '8.00', 'data_conclusao' => now(),
        ]);
        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidor2->id,
            'avaliador_id' => $avaliadorA->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);

        // Equipe do avaliador B: 1 avaliação concluída (não deve aparecer para A)
        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidor3->id,
            'avaliador_id' => $avaliadorB->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => ['F3' => ['grau' => 5]],
            'nota_final' => '9.50', 'data_conclusao' => now(),
        ]);

        $response = $this->actingAs($avaliadorA)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/avaliacoes/kpis-equipe?ciclo_id={$ciclo->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'total_equipe' => 2,
            'pendentes'    => 1,
            'concluidas'   => 1,
            'nota_media'   => '8.00',
        ]);
        $this->assertSame(1, $response->json('distribuicao_graus.4'));
        $this->assertSame(0, $response->json('distribuicao_graus.5'));

        app(TenantContext::class)->clear();
    }
}
