<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Protocolo\Contracts\EntidadeVinculavel;
use Modules\Protocolo\Models\Andamento;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;
use Modules\Protocolo\Services\VinculoRegistry;
use Tests\TestCase;

final class RoteiroIntegracaoPontaAPontaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private OrgUnit $secAdministracao;
    private OrgUnit $secFinancas;
    private User $gestorAdmin;
    private User $gestorFinancas;
    private TipoTramitacao $tipoEntrada;
    private TipoTramitacao $tipoEncaminhamento;
    private TipoTramitacao $tipoConclusao;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->tenant = Tenant::create([
            'name' => 'Município de Roteiro Integrado',
            'slug' => 'pref-roteiro',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Órgãos
        $this->secAdministracao = OrgUnit::create(['name' => 'Secretaria de Administração', 'code' => 'SMA', 'tenant_id' => $this->tenant->id]);
        $this->secFinancas = OrgUnit::create(['name' => 'Secretaria de Finanças', 'code' => 'SMF', 'tenant_id' => $this->tenant->id]);

        // Permissões
        $permView = Permission::firstOrCreate(['slug' => 'protocolo.processos.view'], ['name' => 'Ver', 'guard_name' => 'web']);
        $permCreate = Permission::firstOrCreate(['slug' => 'protocolo.processos.create'], ['name' => 'Criar', 'guard_name' => 'web']);
        $permUpdate = Permission::firstOrCreate(['slug' => 'protocolo.processos.update'], ['name' => 'Atualizar', 'guard_name' => 'web']);
        $permTramitar = Permission::firstOrCreate(['slug' => 'protocolo.processos.tramitar'], ['name' => 'Tramitar', 'guard_name' => 'web']);
        $permPromover = Permission::firstOrCreate(['slug' => 'protocolo.processos.promover_requerimento'], ['name' => 'Promover', 'guard_name' => 'web']);
        $permRelatorios = Permission::firstOrCreate(['slug' => 'protocolo.processos.relatorios'], ['name' => 'Relatórios', 'guard_name' => 'web']);
        $permScopeAll = Permission::firstOrCreate(['slug' => 'org.scope_all'], ['name' => 'Todas Unidades', 'guard_name' => 'web']);

        $role = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Gestor Pleno',
            'slug' => 'gestor_pleno',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $role->permissions()->sync([
            $permView->id,
            $permCreate->id,
            $permUpdate->id,
            $permTramitar->id,
            $permPromover->id,
            $permRelatorios->id,
            $permScopeAll->id,
        ]);

        // Usuário Administração
        $this->gestorAdmin = User::create(['name' => 'Gestor Admin', 'email' => 'admin@pref.gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->gestorAdmin->id, ['status' => 'active', 'is_primary' => true]);
        $this->gestorAdmin->roles()->attach($role->id, ['tenant_id' => $this->tenant->id]);
        $this->gestorAdmin->clearPermissionCache();
        OrgUnitUser::create(['user_id' => $this->gestorAdmin->id, 'org_unit_id' => $this->secAdministracao->id, 'role' => 'membro', 'is_primary' => true]);

        // Usuário Finanças
        $this->gestorFinancas = User::create(['name' => 'Gestor Finanças', 'email' => 'financas@pref.gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->gestorFinancas->id, ['status' => 'active', 'is_primary' => true]);
        $this->gestorFinancas->roles()->attach($role->id, ['tenant_id' => $this->tenant->id]);
        $this->gestorFinancas->clearPermissionCache();
        OrgUnitUser::create(['user_id' => $this->gestorFinancas->id, 'org_unit_id' => $this->secFinancas->id, 'role' => 'membro', 'is_primary' => true]);

        // Tipos de tramitação
        $this->tipoEntrada = TipoTramitacao::firstOrCreate(['slug' => 'entrada'], ['nome' => 'Entrada', 'ativo' => true]);
        $this->tipoEncaminhamento = TipoTramitacao::firstOrCreate(
            ['slug' => 'encaminhamento'],
            ['nome' => 'Encaminhamento', 'prazo_dias' => 10, 'ativo' => true]
        );
        $this->tipoConclusao = TipoTramitacao::firstOrCreate(
            ['slug' => 'conclusao'],
            ['nome' => 'Conclusão', 'efeito_status' => 'concluido', 'ativo' => true]
        );

        app(TenantContext::class)->clear();
    }

    private function como(User $user): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $this->tenant->id);
    }

    public function test_roteiro_completo_integrado(): void
    {
        // 1. Abrir processo interno na Administração
        $file = UploadedFile::fake()->create('oficio_inaugural.pdf', 100, 'application/pdf');

        $resAbertura = $this->como($this->gestorAdmin)->postJson('/api/protocolo/processos', [
            'assunto' => 'Revisão do Plano de Cargos e Salários',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secAdministracao->id,
            'orgao_destino_id' => $this->secAdministracao->id,
            'descricao' => 'Início dos estudos de impacto orçamentário',
            'tipo_tramitacao_id' => $this->tipoEntrada->id,
            'despacho_inicial' => 'Autuado pelo Gabinete de Administração',
            'documentos' => [
                ['arquivo' => $file, 'tipo_documento' => 'oficio', 'titulo' => 'Ofício Inaugural', 'categoria' => 'Ofício'],
            ],
            'atributos' => [
                ['chave' => 'impacto_previsto', 'label' => 'Impacto Previsto', 'tipo_atributo' => 'decimal', 'valor' => '500000.00'],
            ],
        ]);

        $resAbertura->assertStatus(201);
        $procInternoId = $resAbertura->json('id');
        $this->assertNotNull($procInternoId);
        $this->assertSame('aberto', $resAbertura->json('status'));

        // 2. Abrir processo externo via promoção de requerimento
        $registry = app(VinculoRegistry::class);
        $registry->limpar();
        $fakeHandler = new class implements EntidadeVinculavel {
            public bool $promovido = false;
            public function tipo(): string { return 'requerimento'; }
            public function existe(int $entidadeId): bool { return true; }
            public function jaPromovida(int $entidadeId): bool { return $this->promovido; }
            public function aoPromover(int $entidadeId, int $processoId): void { $this->promovido = true; }
            public function resumo(int $entidadeId): array { return ['titulo' => 'Requerimento da Câmara #42', 'detalhes' => 'Iluminação']; }
        };
        $registry->registrar($fakeHandler);

        $resPromocao = $this->como($this->gestorAdmin)->postJson('/api/protocolo/processos/promover-requerimento', [
            'requerimento_id' => 42,
            'orgao_destino_id' => $this->secAdministracao->id,
            'tipo_tramitacao_id' => $this->tipoEntrada->id,
            'despacho_inicial' => 'Promovido a processo para providências',
        ]);

        $resPromocao->assertStatus(201);
        $this->assertSame('externa', $resPromocao->json('origem'));
        $this->assertTrue($fakeHandler->promovido);

        // 3. Tramitar o processo interno da Administração para Finanças
        $resTramitacao = $this->como($this->gestorAdmin)->postJson("/api/protocolo/processos/{$procInternoId}/andamentos", [
            'orgao_destino_id' => $this->secFinancas->id,
            'tipo_tramitacao_id' => $this->tipoEncaminhamento->id,
            'despacho' => 'Encaminhado à Secretaria de Finanças para cálculo de dotação orçamentária.',
        ]);

        $resTramitacao->assertStatus(201);

        // Verificar que o processo agora está em posse/destino da Secretaria de Finanças
        $procAtualizado = Processo::find($procInternoId);
        $this->assertSame($this->secFinancas->id, $procAtualizado->orgao_atual_id);
        $this->assertSame('em_tramitacao', $procAtualizado->status);

        // 4. Receber pelo órgão de destino (Secretaria de Finanças)
        $resReceber = $this->como($this->gestorFinancas)->postJson("/api/protocolo/processos/{$procInternoId}/andamentos/atual/receber");
        $resReceber->assertStatus(200);

        // 5. Concluir o processo com tipo de tramitação de efeito 'concluido'
        $resConcluir = $this->como($this->gestorFinancas)->postJson("/api/protocolo/processos/{$procInternoId}/andamentos", [
            'orgao_destino_id' => $this->secFinancas->id,
            'tipo_tramitacao_id' => $this->tipoConclusao->id,
            'despacho' => 'Dotação calculada e parecer favorável emitido. Processo finalizado com sucesso.',
        ]);

        $resConcluir->assertStatus(201);
        $procFinal = Processo::find($procInternoId);
        $this->assertSame('concluido', $procFinal->status);
        $this->assertNotNull($procFinal->data_conclusao);

        // 6. Conferir Dashboard
        $resDashboard = $this->como($this->gestorAdmin)->getJson('/api/protocolo/dashboard');
        $resDashboard->assertStatus(200)
            ->assertJsonPath('total_processos', 2)
            ->assertJsonPath('por_status.concluido', 1)
            ->assertJsonPath('por_origem.interna', 1)
            ->assertJsonPath('por_origem.externa', 1);

        $this->assertNotNull($resDashboard->json('tempo_medio_tramitacao_segundos'));

        // 7. Conferir Audit Logs
        $logs = AuditLog::where('module', 'protocolo')->get();
        $this->assertNotEmpty($logs);
        $acoes = $logs->pluck('action')->all();
        $this->assertContains('processo.abrir', $acoes);
        $this->assertContains('processo.tramitar', $acoes);
        $this->assertContains('processo.receber', $acoes);
    }
}
