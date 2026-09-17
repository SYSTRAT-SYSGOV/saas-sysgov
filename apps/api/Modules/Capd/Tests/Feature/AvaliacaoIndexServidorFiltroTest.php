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

final class AvaliacaoIndexServidorFiltroTest extends TestCase
{
    use RefreshDatabase;

    public function test_filtra_avaliacoes_por_servidor_id(): void
    {
        $tenant = Tenant::create(['name' => 'Município Filtro', 'slug' => 'pref-filtro', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliador = User::create(['name' => 'Avaliador Filtro', 'email' => 'avaliador.filtro@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliador->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidor1 = User::create(['name' => 'Servidor Um', 'email' => 'servidor1.filtro@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233301']);
        $servidor2 = User::create(['name' => 'Servidor Dois', 'email' => 'servidor2.filtro@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233302']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Filtro 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidor1->id,
            'avaliador_id' => $avaliador->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);
        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidor2->id,
            'avaliador_id' => $avaliador->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);

        $response = $this->actingAs($avaliador)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/avaliacoes?servidor_id={$servidor1->id}");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($servidor1->id, $data[0]['servidor_id']);

        app(TenantContext::class)->clear();
    }
}
