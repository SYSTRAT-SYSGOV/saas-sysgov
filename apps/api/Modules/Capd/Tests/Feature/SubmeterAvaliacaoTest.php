<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Database\Seeders\CapdFatoresSeeder;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Servidor;
use Tests\TestCase;

/**
 * Regressão: POST /avaliacoes/{id}/submeter — bug real encontrado ao testar
 * o novo formulário de avaliação no navegador. O fluxo de submissão lançava
 * "Class Modules\Capd\Contracts\AssiduacaoDados not found" porque duas
 * classes (AssiduacaoDados e DisciplinaDados) estavam declaradas juntas em
 * um único arquivo HrDtos.php, quebrando o autoload PSR-4 padrão (nome do
 * arquivo não batia com nenhuma das classes). Isso quebrava TODA submissão
 * de avaliação em produção, silenciosamente, pois nenhum teste cobria essa
 * rota antes.
 */
final class SubmeterAvaliacaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_submeter_avaliacao_calcula_nota_e_conclui_com_sucesso(): void
    {
        $tenant = Tenant::create(['name' => 'Município Submeter', 'slug' => 'pref-submeter', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new CapdFatoresSeeder())->run();

        $admin = User::create([
            'name' => 'Admin Submeter', 'email' => 'admin.submeter@araucaria.pr.gov.br', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Submeter', 'email' => 'servidor.submeter@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233344']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Submeter 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => [
                'F3' => ['grau' => 4], 'F4' => ['grau' => 4], 'F5' => ['grau' => 4],
                'F6' => ['grau' => 4], 'F7' => ['grau' => 4], 'F8' => ['grau' => 4],
            ],
        ]);

        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/capd/avaliacoes/{$avaliacao->id}/submeter");

        $response->assertStatus(200);
        $response->assertJsonPath('avaliacao.data_conclusao', fn ($v) => $v !== null);
        $this->assertNotNull($response->json('resultado.nota_final'));

        app(TenantContext::class)->clear();
    }
}
