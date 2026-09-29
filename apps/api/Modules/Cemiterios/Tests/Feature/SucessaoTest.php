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
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
            'pendencia_regularizacao' => true,
            'motivo_pendencia' => 'sucessao_hereditaria',
        ]);

        // 1. Listar pendências
        $respPend = $this->como($admin, $this->tenant)->getJson('/api/cemiterios/sucessoes/pendencias');
        $respPend->assertOk()->assertJsonPath('total', 1);

        // 2. Autuar processo de sucessão
        $respProc = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/sucessoes-legado', [
            'concession_id' => $concessao->id,
            'numero_processo' => 'PA-001/2026',
            'tipo_documento' => 'inventario_judicial',
            'vara_ou_cartorio' => '1ª Vara de Sucessões',
        ]);
        $respProc->assertCreated()->assertJsonPath('situacao', 'em_analise');
        $processoId = (int) $respProc->json('id');

        // 3. Adicionar herdeiro indicado como representante
        $respHerd = $this->como($admin, $this->tenant)->postJson("/api/cemiterios/sucessoes-legado/{$processoId}/herdeiros", [
            'nome' => 'Maria Silva (Filha Herdeira)',
            'parentesco' => 'filho',
            'documento' => $this->cpfValido(),
            'telefone' => '41999998888',
            'titular_indicado' => true,
        ]);
        $respHerd->assertCreated()->assertJsonPath('titular_indicado', true);

        // 4. Deferir processo de sucessão
        $respDef = $this->como($admin, $this->tenant)->postJson("/api/cemiterios/sucessoes-legado/{$processoId}/deferir", [
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
        $respTermo = $this->como($admin, $this->tenant)->getJson("/api/cemiterios/sucessoes-legado/{$processoId}/termo");
        $respTermo->assertOk()
            ->assertJsonPath('processo_numero', 'PA-001/2026')
            ->assertJsonPath('novo_titular.nome', 'Maria Silva (Filha Herdeira)');
    }

    /**
     * Regressão: AbrirSucessaoRequest/AtualizarSucessaoRequest/TransicaoSucessaoRequest
     * usavam $user->can('slug') (Gate nativo, sem Gate::define correspondente), o que
     * sempre retornava 403 independente de permissão — corrigido para hasPermission().
     */
    public function test_abertura_e_transicao_do_fluxo_rf_sucessao(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(concedido: false);

        $titular = Concessionario::create([
            'nome' => 'Titular Falecido RF-SUCESSAO',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'rf-sucessao'),
        ]);

        $concessao = Concessao::create([
            'numero' => 'CON-RF-01',
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
        ]);

        $respAbrir = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/sucessoes', [
            'concession_id' => $concessao->id,
            'park_id' => $jazigo->park_id,
            'plot_id' => $jazigo->id,
            'via' => 'inventario_extrajudicial',
            'data_falecimento' => '2026-01-10',
            'processo_referencia' => 'PROC-RF-0001',
        ]);
        $respAbrir->assertCreated()->assertJsonPath('estado', 'solicitada');

        $processoId = (int) $respAbrir->json('id');
        $lockVersion = (int) $respAbrir->json('lock_version');

        $respTransicao = $this->como($admin, $this->tenant)->postJson("/api/cemiterios/sucessoes/{$processoId}/transicao", [
            'para' => 'em_analise',
            'motivo' => 'Documentação inicial conferida.',
            'lock_version' => $lockVersion,
        ]);
        $respTransicao->assertOk()->assertJsonPath('estado', 'em_analise');
    }

    public function test_abertura_de_sucessao_exige_permissao_manage(): void
    {
        $semPermissao = $this->usuario($this->tenant, []);
        $jazigo = $this->novoJazigo(concedido: false);

        $titular = Concessionario::create([
            'nome' => 'Titular Sem Permissão',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'sem-permissao'),
        ]);

        $concessao = Concessao::create([
            'numero' => 'CON-RF-02',
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
        ]);

        $this->como($semPermissao, $this->tenant)->postJson('/api/cemiterios/sucessoes', [
            'concession_id' => $concessao->id,
            'via' => 'inventario_extrajudicial',
        ])->assertForbidden();
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
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
        ]);

        $proc = ProcessoSucessao::create([
            'concession_id' => $concessao->id,
            'numero_processo' => 'PA-TENANT-A',
            'tipo_documento' => 'outro',
            'situacao' => 'em_analise',
        ]);

        // Tenant B não enxerga processo do Tenant A
        $this->como($adminB, $tenantB)->getJson('/api/cemiterios/sucessoes-legado')
            ->assertOk()
            ->assertJsonPath('total', 0);

        // Tenant B recebe 404 ao tentar acessar processo do Tenant A
        $this->como($adminB, $tenantB)->getJson("/api/cemiterios/sucessoes-legado/{$proc->id}")
            ->assertNotFound();
    }
}
