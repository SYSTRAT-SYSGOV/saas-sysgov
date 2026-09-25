<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class OperadoresTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_cadastro_e_listagem_de_coveiros_e_pedreiros(): void
    {
        $admin = $this->admin($this->tenant);

        // 1. Cadastrar coveiro municipal
        $respCov = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', [
            'nome' => 'Sebastião Coveiro',
            'tipo' => 'coveiro',
            'matricula_funcional' => 'MAT-9901',
            'telefone' => '41988887777',
        ]);
        $respCov->assertCreated()->assertJsonPath('nome', 'Sebastião Coveiro');
        $coveiroId = (int) $respCov->json('id');

        // 2. Cadastrar pedreiro credenciado com alvará
        $respPed = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', [
            'nome' => 'Antônio Pedreiro Obras',
            'tipo' => 'pedreiro',
            'alvara_numero' => 'ALV-2026/01',
            'alvara_validade' => today()->addMonths(6)->toDateString(),
            'telefone' => '41977776666',
        ]);
        $respPed->assertCreated()->assertJsonPath('tipo', 'pedreiro');
        $pedreiroId = (int) $respPed->json('id');

        // 3. Cadastrar pedreiro com alvará vencido
        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', [
            'nome' => 'José Pedreiro Vencido',
            'tipo' => 'pedreiro',
            'alvara_numero' => 'ALV-2024/99',
            'alvara_validade' => today()->subMonth()->toDateString(),
        ])->assertCreated();

        // 4. Listagem geral e estatísticas
        $respList = $this->como($admin, $this->tenant)->getJson('/api/cemiterios/operadores');
        $respList->assertOk()
            ->assertJsonPath('total', 3)
            ->assertJsonPath('stats.total_coveiros', 1)
            ->assertJsonPath('stats.total_pedreiros', 2)
            ->assertJsonPath('stats.alvaras_vencidos', 1);

        // 5. Filtro por alvará vencido
        $respVenc = $this->como($admin, $this->tenant)->getJson('/api/cemiterios/operadores?status_alvara=vencido');
        $respVenc->assertOk()->assertJsonPath('total', 1);

        // 6. Consultar operador individual
        $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$pedreiroId}")
            ->assertOk()
            ->assertJsonPath('status_alvara', 'valido');
    }

    public function test_historico_operacional_vinculado(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(concedido: false);

        $coveiro = OperadorCemiterio::create([
            'nome' => 'Carlos Pereira',
            'tipo' => 'coveiro',
            'matricula_funcional' => 'MAT-7700',
            'situacao' => 'ativo',
        ]);

        $falecido = Falecido::create([
            'nome' => 'Falecido Teste Operador',
            'falecimento' => '2026-05-10',
        ]);

        Inumacao::create([
            'deceased_id' => $falecido->id,
            'plot_id' => $jazigo->id,
            'sepultado_em' => '2026-05-10 14:00:00',
            'carencia_desde' => '2026-05-10',
            'origem' => 'historico',
            'coveiro_nome' => 'Carlos Pereira',
            'situacao' => 'confirmada',
        ]);

        $respHist = $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$coveiro->id}/historico");
        $respHist->assertOk()
            ->assertJsonPath('total_operacoes', 1)
            ->assertJsonPath('operacoes.0.falecido.nome', 'Falecido Teste Operador');
    }

    public function test_isolamento_multi_tenant_operadores(): void
    {
        $adminA = $this->admin($this->tenant);
        $tenantB = $this->criarTenant('pref-b');
        $adminB = $this->admin($tenantB);

        $opA = OperadorCemiterio::create([
            'nome' => 'Operador A',
            'tipo' => 'coveiro',
            'situacao' => 'ativo',
        ]);

        // Tenant B não enxerga operador do Tenant A
        $this->como($adminB, $tenantB)->getJson('/api/cemiterios/operadores')
            ->assertOk()
            ->assertJsonPath('total', 0);

        $this->como($adminB, $tenantB)->getJson("/api/cemiterios/operadores/{$opA->id}")
            ->assertNotFound();
    }
}
