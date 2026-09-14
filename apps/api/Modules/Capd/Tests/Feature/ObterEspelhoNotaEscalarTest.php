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
 * Bug real encontrado ao ligar o Espelho da Avaliação no frontend: quando
 * respostas_fatores tem 'pontos' mas não tem a chave 'nota' explícita,
 * obterEspelho() devolvia o array inteiro {grau,pontos} em vez de um
 * escalar — o React quebrava com "Objects are not valid as a React child".
 */
final class ObterEspelhoNotaEscalarTest extends TestCase
{
    use RefreshDatabase;

    public function test_nota_do_fator_e_sempre_escalar_mesmo_sem_chave_nota_explicita(): void
    {
        $tenant = Tenant::create(['name' => 'Município Espelho Nota', 'slug' => 'pref-espelho-nota', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliador = User::create(['name' => 'Avaliador Nota', 'email' => 'avaliador.nota@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliador->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Nota', 'email' => 'servidor.nota@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Nota', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $avaliador->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            // Sem chave 'nota' — apenas grau e pontos, como o formulário real grava.
            'respostas_fatores' => ['F3' => ['grau' => 4, 'pontos' => 85.50]],
            'nota_final' => '85.50', 'homologada' => true, 'data_conclusao' => now(),
        ]);

        $response = $this->actingAs($avaliador)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/avaliacoes/{$avaliacao->id}/espelho");

        $response->assertStatus(200);
        $fator = collect($response->json('fatores'))->firstWhere('codigo', 'F3');

        $this->assertNotNull($fator);
        $this->assertIsScalar($fator['nota']);
        $this->assertEquals(85.50, $fator['nota']);

        app(TenantContext::class)->clear();
    }
}
