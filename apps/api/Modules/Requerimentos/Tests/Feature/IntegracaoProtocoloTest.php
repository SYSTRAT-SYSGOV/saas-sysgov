<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;
use Modules\Protocolo\Services\PromocaoService;
use Modules\Protocolo\Services\VinculoRegistry;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Models\TipoInstrumento;
use Modules\Requerimentos\Services\RequerimentoVinculavel;
use Modules\Requerimentos\Tests\Concerns\CenarioRequerimentos;
use Tests\TestCase;

final class IntegracaoProtocoloTest extends TestCase
{
    use CenarioRequerimentos;
    use RefreshDatabase;

    private Tenant $tenant;
    private OrgUnit $secGeral;
    private User $userGestor;
    private TipoInstrumento $tipo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = $this->criarTenant('pref-integracao');
        $this->tipo = $this->noTenant($this->tenant, fn () => TipoInstrumento::where('slug', 'requerimento')->firstOrFail());

        app(TenantContext::class)->set($this->tenant);

        $this->secGeral = OrgUnit::create([
            'name' => 'Secretaria Geral',
            'code' => 'SG',
            'tenant_id' => $this->tenant->id,
        ]);

        $permView = Permission::firstOrCreate(['slug' => 'protocolo.processos.view'], ['name' => 'Visualizar', 'guard_name' => 'web']);
        $permPromover = Permission::firstOrCreate(['slug' => 'protocolo.processos.promover_requerimento'], ['name' => 'Promover Requerimento', 'guard_name' => 'web']);

        $role = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Gestor Processos',
            'slug' => 'gestor_proc',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $role->permissions()->sync([$permView->id, $permPromover->id]);

        $this->userGestor = User::create([
            'name' => 'Gestor',
            'email' => 'gestor@integracao.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $this->tenant->users()->attach($this->userGestor->id, ['status' => 'active', 'is_primary' => true]);
        $this->userGestor->roles()->attach($role->id, ['tenant_id' => $this->tenant->id]);
        $this->userGestor->clearPermissionCache();

        OrgUnitUser::create([
            'user_id' => $this->userGestor->id,
            'org_unit_id' => $this->secGeral->id,
            'role' => 'membro',
            'is_primary' => true,
        ]);

        TipoTramitacao::firstOrCreate(['slug' => 'entrada'], ['nome' => 'Entrada', 'ativo' => true]);

        app(TenantContext::class)->clear();
    }

    public function test_handler_atualiza_vinculacao_processo_id_ao_promover(): void
    {
        app(TenantContext::class)->set($this->tenant);

        $proposicao = Proposicao::create([
            'tenant_id' => $this->tenant->id,
            'tipo_instrumento_id' => $this->tipo->id,
            'numero' => 'REQ-001/2026',
            'numero_sequencial' => 1,
            'exercicio' => 2026,
            'ementa' => 'Pedido de providências no asfalto',
            'justificativa' => 'Rua com buracos',
            'autor_principal_id' => $this->userGestor->id,
            'poder_origem' => Proposicao::PODER_CAMARA,
            'status' => Proposicao::STATUS_ENCAMINHADO,
        ]);

        $handler = new RequerimentoVinculavel();
        $this->assertSame('requerimento', $handler->tipo());
        $this->assertTrue($handler->existe($proposicao->id));
        $this->assertFalse($handler->jaPromovida($proposicao->id));

        $handler->aoPromover($proposicao->id, 9999);

        $proposicao->refresh();
        $this->assertSame(9999, $proposicao->vinculacao_processo_id);
        $this->assertTrue($handler->jaPromovida($proposicao->id));
    }

    public function test_promocao_ponta_a_ponta_via_api(): void
    {
        app(TenantContext::class)->set($this->tenant);

        $proposicao = Proposicao::create([
            'tenant_id' => $this->tenant->id,
            'tipo_instrumento_id' => $this->tipo->id,
            'numero' => 'REQ-002/2026',
            'numero_sequencial' => 2,
            'exercicio' => 2026,
            'ementa' => 'Iluminação pública praça central',
            'justificativa' => 'Lâmpadas queimadas',
            'autor_principal_id' => $this->userGestor->id,
            'poder_origem' => Proposicao::PODER_CAMARA,
            'status' => Proposicao::STATUS_ENCAMINHADO,
        ]);

        /** @var VinculoRegistry $registry */
        $registry = app(VinculoRegistry::class);
        $registry->registrar(new RequerimentoVinculavel());

        app(TenantContext::class)->clear();

        $response = $this->actingAs($this->userGestor)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/protocolo/processos/promover-requerimento', [
                'requerimento_id' => $proposicao->id,
                'orgao_destino_id' => $this->secGeral->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('origem', 'externa');

        $processoId = $response->json('id');
        $this->assertNotNull($processoId);

        $proposicao->refresh();
        $this->assertSame($processoId, $proposicao->vinculacao_processo_id);

        $this->assertDatabaseHas('protocolo_vinculos', [
            'processo_id' => $processoId,
            'entidade_tipo' => 'requerimento',
            'entidade_id' => $proposicao->id,
            'papel_vinculo' => 'origem',
        ]);

        // Segunda tentativa deve ser barrada com 409
        $responseRepetida = $this->actingAs($this->userGestor)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/protocolo/processos/promover-requerimento', [
                'requerimento_id' => $proposicao->id,
                'orgao_destino_id' => $this->secGeral->id,
            ]);

        $responseRepetida->assertStatus(409);
    }
}
