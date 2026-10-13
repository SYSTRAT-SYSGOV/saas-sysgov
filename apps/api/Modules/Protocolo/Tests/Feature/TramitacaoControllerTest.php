<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Protocolo\Models\Andamento;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;
use Tests\TestCase;

final class TramitacaoControllerTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private OrgUnit $secObras;
    private OrgUnit $secSaude;
    private User $userObras;
    private User $userSaude;
    private User $userSemPermissao;
    private TipoTramitacao $tipoDespacho;
    private TipoTramitacao $tipoConclusao;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Prefeitura Central', 'slug' => 'pref-central', 'type' => 'prefeitura', 'status' => 'active']);

        // Permissões
        $permView = Permission::firstOrCreate(['slug' => 'protocolo.processos.view'], ['name' => 'Visualizar Processos', 'guard_name' => 'web']);
        $permTramitar = Permission::firstOrCreate(['slug' => 'protocolo.processos.tramitar'], ['name' => 'Tramitar Processos', 'guard_name' => 'web']);
        $permRastrear = Permission::firstOrCreate(['slug' => 'protocolo.processos.rastrear'], ['name' => 'Rastrear Processos', 'guard_name' => 'web']);

        $roleTramitador = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Tramitador',
            'slug' => 'tramitador',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $roleTramitador->permissions()->sync([$permView->id, $permTramitar->id, $permRastrear->id]);

        $this->userObras = User::create(['name' => 'Servidor Obras', 'email' => 'obras@gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->userObras->id, ['status' => 'active', 'is_primary' => true]);
        $this->userObras->roles()->attach($roleTramitador->id, ['tenant_id' => $this->tenant->id]);
        $this->userObras->clearPermissionCache();

        $this->userSaude = User::create(['name' => 'Servidor Saude', 'email' => 'saude@gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->userSaude->id, ['status' => 'active', 'is_primary' => true]);
        $this->userSaude->roles()->attach($roleTramitador->id, ['tenant_id' => $this->tenant->id]);
        $this->userSaude->clearPermissionCache();

        $this->userSemPermissao = User::create(['name' => 'Sem Permissao', 'email' => 'sem@gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->userSemPermissao->id, ['status' => 'active', 'is_primary' => true]);

        app(TenantContext::class)->set($this->tenant);
        $this->secObras = OrgUnit::create(['name' => 'Secretaria de Obras', 'code' => 'SOB', 'tenant_id' => $this->tenant->id]);
        $this->secSaude = OrgUnit::create(['name' => 'Secretaria de Saúde', 'code' => 'SMS', 'tenant_id' => $this->tenant->id]);

        $this->tipoDespacho = TipoTramitacao::create(['slug' => 'despacho', 'nome' => 'Despacho', 'prazo_dias' => 5, 'ativo' => true]);
        $this->tipoConclusao = TipoTramitacao::create(['slug' => 'conclusao', 'nome' => 'Conclusão', 'efeito_status' => 'concluido', 'ativo' => true]);

        OrgUnitUser::create(['user_id' => $this->userObras->id, 'org_unit_id' => $this->secObras->id, 'role' => 'membro', 'is_primary' => true]);
        OrgUnitUser::create(['user_id' => $this->userSaude->id, 'org_unit_id' => $this->secSaude->id, 'role' => 'membro', 'is_primary' => true]);

        app(TenantContext::class)->clear();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function como(User $user): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $this->tenant->id);
    }

    private function criarProcesso(): Processo
    {
        app(TenantContext::class)->set($this->tenant);

        $proc = Processo::create([
            'numero' => 10,
            'ano' => 2026,
            'assunto' => 'Construção da UBS Central',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secObras->id,
            'orgao_atual_id' => $this->secObras->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $andamento = Andamento::create([
            'processo_id' => $proc->id,
            'orgao_origem_id' => $this->secObras->id,
            'orgao_destino_id' => $this->secObras->id,
            'tipo_tramitacao_id' => $this->tipoDespacho->id,
            'usuario_id' => $this->userObras->id,
            'descricao' => 'Processo iniciado',
            'sequencia' => 1,
            'and_atual' => true,
            'data_recebimento' => now(),
        ]);

        $proc->update(['ultimo_andamento_id' => $andamento->id]);
        app(TenantContext::class)->clear();

        return $proc;
    }

    public function test_tramitacao_sucesso_pelo_orgao_detentor(): void
    {
        $proc = $this->criarProcesso();

        $response = $this->como($this->userObras)->postJson("/api/protocolo/processos/{$proc->id}/andamentos", [
            'orgao_destino_id' => $this->secSaude->id,
            'tipo_tramitacao_id' => $this->tipoDespacho->id,
            'descricao' => 'Encaminhando projeto para aprovação sanitária',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('sequencia', 2)
            ->assertJsonPath('and_atual', true);

        $proc = $proc->fresh();
        self::assertSame($this->secSaude->id, $proc->orgao_atual_id);
        self::assertSame('em_tramitacao', $proc->status);
    }

    public function test_tramitacao_rejeita_usuario_de_outro_orgao(): void
    {
        $proc = $this->criarProcesso();

        // userSaude tenta tramitar processo que está na Secretaria de Obras -> 403
        $response = $this->como($this->userSaude)->postJson("/api/protocolo/processos/{$proc->id}/andamentos", [
            'orgao_destino_id' => $this->secSaude->id,
            'tipo_tramitacao_id' => $this->tipoDespacho->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_tramitacao_rejeita_processo_concluido(): void
    {
        $proc = $this->criarProcesso();
        $proc->update(['status' => 'concluido', 'data_conclusao' => now()]);

        $response = $this->como($this->userObras)->postJson("/api/protocolo/processos/{$proc->id}/andamentos", [
            'orgao_destino_id' => $this->secSaude->id,
            'tipo_tramitacao_id' => $this->tipoDespacho->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Não é possível tramitar um processo concluído ou arquivado.');
    }

    public function test_recebimento_sucesso_pelo_destino(): void
    {
        $proc = $this->criarProcesso();

        // Obras tramita para Saúde
        $this->como($this->userObras)->postJson("/api/protocolo/processos/{$proc->id}/andamentos", [
            'orgao_destino_id' => $this->secSaude->id,
            'tipo_tramitacao_id' => $this->tipoDespacho->id,
        ]);

        // Saúde confirma recebimento
        $response = $this->como($this->userSaude)
            ->postJson("/api/protocolo/processos/{$proc->id}/andamentos/atual/receber");

        $response->assertStatus(200);
        self::assertNotNull($response->json('data_recebimento'));
        self::assertSame($this->userSaude->id, $response->json('usuario_recebedor_id'));
    }

    public function test_recebimento_rejeita_usuario_que_nao_e_do_orgao_de_destino(): void
    {
        $proc = $this->criarProcesso();

        // Obras tramita para Saúde
        $this->como($this->userObras)->postJson("/api/protocolo/processos/{$proc->id}/andamentos", [
            'orgao_destino_id' => $this->secSaude->id,
            'tipo_tramitacao_id' => $this->tipoDespacho->id,
        ]);

        // Obras tenta confirmar recebimento em nome da Saúde -> 403
        $response = $this->como($this->userObras)
            ->postJson("/api/protocolo/processos/{$proc->id}/andamentos/atual/receber");

        $response->assertStatus(403);
    }

    public function test_recebimento_duplicado_rejeitado(): void
    {
        $proc = $this->criarProcesso();

        $this->como($this->userObras)->postJson("/api/protocolo/processos/{$proc->id}/andamentos", [
            'orgao_destino_id' => $this->secSaude->id,
            'tipo_tramitacao_id' => $this->tipoDespacho->id,
        ]);

        // Primeiro recebimento
        $this->como($this->userSaude)->postJson("/api/protocolo/processos/{$proc->id}/andamentos/atual/receber");

        // Segundo recebimento -> 422
        $response = $this->como($this->userSaude)
            ->postJson("/api/protocolo/processos/{$proc->id}/andamentos/atual/receber");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Este andamento já foi recebido anteriormente.');
    }

    public function test_localizacao_e_permanencia_endpoints(): void
    {
        $proc = $this->criarProcesso();

        // Localização
        $respLoc = $this->como($this->userObras)->getJson("/api/protocolo/processos/{$proc->id}/localizacao");
        $respLoc->assertStatus(200)
            ->assertJsonPath('situacao', 'em_posse')
            ->assertJsonPath('orgao_atual.name', 'Secretaria de Obras');

        // Permanência
        $respPerm = $this->como($this->userObras)->getJson("/api/protocolo/processos/{$proc->id}/permanencia");
        $respPerm->assertStatus(200);
        self::assertCount(1, $respPerm->json());
    }

    public function test_prazos_excedidos_endpoint(): void
    {
        $dataInicial = Carbon::parse('2026-03-01 10:00:00');
        Carbon::setTestNow($dataInicial);

        $proc = $this->criarProcesso();
        $this->como($this->userObras)->postJson("/api/protocolo/processos/{$proc->id}/andamentos", [
            'orgao_destino_id' => $this->secSaude->id,
            'tipo_tramitacao_id' => $this->tipoDespacho->id, // Prazo 5 dias
        ]);
        $this->como($this->userSaude)->postJson("/api/protocolo/processos/{$proc->id}/andamentos/atual/receber");

        // Avança 10 dias (atraso de 5 dias)
        Carbon::setTestNow($dataInicial->copy()->addDays(10));

        $response = $this->como($this->userSaude)->getJson('/api/protocolo/prazos/excedidos');
        $response->assertStatus(200);

        $itens = $response->json();
        self::assertCount(1, $itens);
        self::assertSame(5, $itens[0]['dias_atraso']);
        self::assertSame('Secretaria de Saúde', $itens[0]['orgao_nome']);
    }
}
