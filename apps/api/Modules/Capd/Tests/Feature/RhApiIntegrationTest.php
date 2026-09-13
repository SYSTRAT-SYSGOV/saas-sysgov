<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\RhIntegracao;
use Modules\Capd\Models\Servidor;
use Tests\TestCase;

final class RhApiIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_bloqueia_api_sem_api_key_valida(): void
    {
        $response = $this->postJson('/api/capd/rh-gateway/servidores/sync', [
            'servidores' => [],
        ]);

        $response->assertStatus(401);
    }

    public function test_sincroniza_servidores_via_api_com_api_key(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $integracao = RhIntegracao::create([
            'tenant_id' => $tenant->id,
            'nome'      => 'ERP Betha Folha',
            'driver'    => 'betha',
            'api_key'   => 'rh_key_test_1234567890abcdef',
            'is_active' => true,
        ]);

        $payload = [
            'servidores' => [
                [
                    'matricula'     => 'BETH-101',
                    'nome_completo' => 'Fernando Souza',
                    'cpf'           => '11122233344',
                    'cargo_efetivo' => 'Auditor Fiscal',
                    'orgao_lotacao' => 'Secretaria de Finanças',
                ],
                [
                    'matricula'     => 'BETH-102',
                    'nome_completo' => 'Juliana Lima',
                    'cpf'           => '55566677788',
                    'cargo_efetivo' => 'Médica Pediatra',
                    'orgao_lotacao' => 'Secretaria de Saúde',
                ],
            ],
        ];

        $response = $this->withHeader('X-RH-API-Key', 'rh_key_test_1234567890abcdef')
            ->postJson('/api/capd/rh-gateway/servidores/sync', $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'sucesso'     => true,
            'processados' => 2,
            'inseridos'   => 2,
            'erros'       => [],
        ]);

        self::assertSame(2, Servidor::query()->count());
        $auditor = Servidor::where('matricula', 'BETH-101')->firstOrFail();
        self::assertSame('Fernando Souza', $auditor->nome_completo);
        self::assertSame('111.222.333-44', $auditor->cpf);
        self::assertSame('betha', $auditor->origem_sistema);

        app(TenantContext::class)->clear();
    }

    public function test_exporta_avaliacoes_homologadas_para_rh(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $integracao = RhIntegracao::create([
            'tenant_id' => $tenant->id,
            'nome'      => 'ERP IPM',
            'driver'    => 'ipm',
            'api_key'   => 'rh_key_export_test',
            'is_active' => true,
        ]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id'              => $tenant->id,
            'ano_referencia'         => 2026,
            'nome'                   => 'Ciclo 2026',
            'data_inicio_avaliacao'  => '2026-01-01',
            'data_fim_avaliacao'     => '2026-12-31',
            'data_limite_recurso'    => '2027-01-15',
            'status'                 => 'homologado',
        ]);

        $user = User::create([
            'name'     => 'Servidor Avaliado',
            'email'    => 'servidor@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);

        Avaliacao::create([
            'tenant_id'           => $tenant->id,
            'ciclo_id'            => $ciclo->id,
            'servidor_id'         => $user->id,
            'avaliador_id'        => $user->id,
            'respostas_fatores'   => ['F1' => 5, 'F2' => 5],
            'nota_final'          => '95.50',
            'elegivel_progressao' => true,
            'homologada'          => true,
            'homologada_em'       => now(),
        ]);

        $response = $this->withHeader('X-RH-API-Key', 'rh_key_export_test')
            ->getJson("/api/capd/rh-gateway/avaliacoes/export?ciclo_id={$ciclo->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'tenant_id'        => $tenant->id,
            'total_avaliacoes' => 1,
        ]);

        $data = $response->json();
        self::assertSame('EXCELENTE', $data['avaliacoes'][0]['conceito']);
        self::assertTrue($data['avaliacoes'][0]['elegivel_progressao']);

        app(TenantContext::class)->clear();
    }
}
