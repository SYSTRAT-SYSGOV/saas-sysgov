<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Servidor;
use Tests\TestCase;

/**
 * RN-08 — simularProgressao deve usar os quinquênios persistidos em
 * capd_quinquenios (via QuinquenioService), não um recálculo em memória
 * desconectado da tabela.
 */
final class SimularProgressaoQuinquenioTest extends TestCase
{
    use RefreshDatabase;

    public function test_simular_progressao_persiste_e_usa_quinquenios_reais(): void
    {
        $tenant = Tenant::create([
            'name'   => 'Município de Araucária Simulação',
            'slug'   => 'pref-simulacao',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($tenant);

        $admin = User::create([
            'name'              => 'Admin Simulação',
            'email'             => 'admin.simulacao@araucaria.pr.gov.br',
            'password'          => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidorUser = User::create(['name' => 'Servidor Veterano', 'email' => 'veterano@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        // Admissão há ~12,7 anos: 2 quinquênios completados (10 e 15 anos ainda não atingidos).
        $servidor = Servidor::create([
            'tenant_id'             => $tenant->id,
            'user_id'               => $servidorUser->id,
            'matricula'             => 'SIM-001',
            'cpf'                   => '99988877766',
            'nome_completo'         => 'Servidor Veterano',
            'data_admissao'         => now()->subYears(12)->subMonths(8)->toDateString(),
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Analista',
            'orgao_lotacao'         => 'Secretaria de Administração',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);

        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/servidores/{$servidor->id}/simular-progressao");

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('quinquenios.qtd_quinquenios'));
        $this->assertEquals(10.0, $response->json('quinquenios.percentual_total'));

        // Efeito colateral esperado: os quinquênios ficam persistidos (idempotentes) na
        // tabela real, disponíveis também via GET /servidores/{id}/quinquenios.
        $this->assertDatabaseCount('capd_quinquenios', 2);
        $this->assertDatabaseHas('capd_quinquenios', [
            'tenant_id'   => $tenant->id,
            'servidor_id' => $servidor->id,
            'percentual'  => '5.00',
        ]);
    }

    public function test_simular_progressao_e_gerar_quinquenios_convergem_no_mesmo_total(): void
    {
        $tenant = Tenant::create([
            'name'   => 'Município de Araucária Simulação Convergência',
            'slug'   => 'pref-simulacao-convergencia',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($tenant);

        $admin = User::create([
            'name'              => 'Admin Convergência',
            'email'             => 'admin.convergencia@araucaria.pr.gov.br',
            'password'          => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidorUser = User::create(['name' => 'Servidor Convergente', 'email' => 'convergente@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        $servidor = Servidor::create([
            'tenant_id'             => $tenant->id,
            'user_id'               => $servidorUser->id,
            'matricula'             => 'SIM-002',
            'cpf'                   => '11122233300',
            'nome_completo'         => 'Servidor Convergente',
            'data_admissao'         => now()->subYears(6)->toDateString(),
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Analista',
            'orgao_lotacao'         => 'Secretaria de Administração',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);

        // Gera via endpoint dedicado primeiro (fluxo administrativo).
        $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/capd/servidores/{$servidor->id}/quinquenios/gerar")
            ->assertStatus(200);

        // A simulação deve enxergar exatamente os mesmos registros, sem duplicar.
        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/servidores/{$servidor->id}/simular-progressao");

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('quinquenios.qtd_quinquenios'));
        $this->assertDatabaseCount('capd_quinquenios', 1);
    }
}
