<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\ProcessoSucessao;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class SucessaoTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_autuacao_processo_sucessao_e_adicao_herdeiros(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(concedido: false);

        $titularOriginal = Concessionario::create([
            'nome' => 'João Silva (Falecido)',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'joao'),
            'titular_falecido' => true,
        ]);

        $concessao = Concessao::create([
            'numero' => 'CON-TEST-01',
            'plot_id' => $jazigo->id,
            'holder_id' => $titularOriginal->id,
            'modalidade' => 'perpetua',
            'inicio' => '2000-01-01',
            'situacao' => 'vigente',
            'pendencia_regularizacao' => true,
            'motivo_pendencia' => 'sucessao_hereditaria',
        ]);

        // 1. Listar pendências
        $respPend = $this->como($admin, $this->tenant)->getJson('/api/cemiterios/sucessoes/pendencias');
        $respPend->assertOk()->assertJsonPath('total', 1);

        // 2. Autuar processo de sucessão
        $respProc = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/sucessoes', [
            'concession_id' => $concessao->id,
            'numero_processo' => 'PA-001/2026',
            'tipo_documento' => 'inventario_judicial',
            'vara_ou_cartorio' => '1ª Vara de Sucessões',
        ]);
        $respProc->assertCreated()->assertJsonPath('situacao', 'em_analise');
        $processoId = (int) $respProc->json('id');

        // 3. Adicionar herdeiro indicado como representante
        $respHerd = $this->como($admin, $this->tenant)->postJson("/api/cemiterios/sucessoes/{$processoId}/herdeiros", [
            'nome' => 'Maria Silva (Filha Herdeira)',
            'parentesco' => 'filho',
            'documento' => $this->cpfValido(),
            'telefone' => '41999998888',
            'titular_indicado' => true,
        ]);
        $respHerd->assertCreated()->assertJsonPath('titular_indicado', true);

        // 4. Deferir processo de sucessão
        $respDef = $this->como($admin, $this->tenant)->postJson("/api/cemiterios/sucessoes/{$processoId}/deferir", [
            'despacho_fundamentacao' => 'Defiro a sucessão por força do formal de partilha apresentado.',
        ]);
        $respDef->assertOk()
            ->assertJsonPath('situacao', 'deferido')
            ->assertJsonPath('novo_titular.nome', 'Maria Silva (Filha Herdeira)');

        // 5. Verificar destravamento da concessão
        $concessao->refresh();
        $this->assertFalse($concessao->pendencia_regularizacao);
        $this->assertNull($concessao->motivo_pendencia);
        $this->assertNotEquals($titularOriginal->id, $concessao->holder_id);

        // 6. Consultar dados do termo oficial
        $respTermo = $this->como($admin, $this->tenant)->getJson("/api/cemiterios/sucessoes/{$processoId}/termo");
        $respTermo->assertOk()
            ->assertJsonPath('processo_numero', 'PA-001/2026')
            ->assertJsonPath('novo_titular.nome', 'Maria Silva (Filha Herdeira)');
    }

    public function test_isolamento_multi_tenant_sucessao(): void
    {
        $adminA = $this->admin($this->tenant);
        $tenantB = $this->criarTenant('pref-b');
        $adminB = $this->admin($tenantB);

        $jazigo = $this->novoJazigo(concedido: false);
        $titular = Concessionario::create([
            'nome' => 'Titular Tenant A',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'a'),
        ]);
        $concessao = Concessao::create([
            'numero' => 'CON-A-01',
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'modalidade' => 'perpetua',
            'inicio' => '2000-01-01',
            'situacao' => 'vigente',
        ]);

        $proc = ProcessoSucessao::create([
            'concession_id' => $concessao->id,
            'numero_processo' => 'PA-TENANT-A',
            'tipo_documento' => 'outro',
            'situacao' => 'em_analise',
        ]);

        // Tenant B não enxerga processo do Tenant A
        $this->como($adminB, $tenantB)->getJson('/api/cemiterios/sucessoes')
            ->assertOk()
            ->assertJsonPath('total', 0);

        // Tenant B recebe 404 ao tentar acessar processo do Tenant A
        $this->como($adminB, $tenantB)->getJson("/api/cemiterios/sucessoes/{$proc->id}")
            ->assertNotFound();
    }
}
