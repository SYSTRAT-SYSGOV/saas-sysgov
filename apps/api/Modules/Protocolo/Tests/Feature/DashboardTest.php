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

final class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private OrgUnit $secSaude;
    private OrgUnit $secEducacao;
    private User $userGestorGeral;
    private User $userGestorSaude;
    private User $userComum;
    private TipoTramitacao $tipoEntrada;
    private TipoTramitacao $tipoParecer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura Dashboard Test',
            'slug' => 'pref-dash',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Órgãos
        $this->secSaude = OrgUnit::create(['name' => 'Secretaria de Saúde', 'code' => 'SMS', 'tenant_id' => $this->tenant->id]);
        $this->secEducacao = OrgUnit::create(['name' => 'Secretaria de Educação', 'code' => 'SME', 'tenant_id' => $this->tenant->id]);

        // Permissões
        $permRelatorios = Permission::firstOrCreate(['slug' => 'protocolo.processos.relatorios'], ['name' => 'Ver Relatórios', 'guard_name' => 'web']);
        $permView = Permission::firstOrCreate(['slug' => 'protocolo.processos.view'], ['name' => 'Ver Processos', 'guard_name' => 'web']);
        $permScopeAll = Permission::firstOrCreate(['slug' => 'org.scope_all'], ['name' => 'Ver Todas Unidades', 'guard_name' => 'web']);

        // Perfil Geral (todas as unidades)
        $roleGeral = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Gestor Geral',
            'slug' => 'gestor_geral',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $roleGeral->permissions()->sync([$permRelatorios->id, $permView->id, $permScopeAll->id]);

        // Perfil Restrito (unidade específica)
        $roleRestrito = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Gestor Saúde',
            'slug' => 'gestor_saude',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $roleRestrito->permissions()->sync([$permRelatorios->id, $permView->id]);

        // Usuários
        $this->userGestorGeral = User::create(['name' => 'Gestor Geral', 'email' => 'geral@dash.gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->userGestorGeral->id, ['status' => 'active', 'is_primary' => true]);
        $this->userGestorGeral->roles()->attach($roleGeral->id, ['tenant_id' => $this->tenant->id]);
        $this->userGestorGeral->clearPermissionCache();

        $this->userGestorSaude = User::create(['name' => 'Gestor Saúde', 'email' => 'saude@dash.gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->userGestorSaude->id, ['status' => 'active', 'is_primary' => true]);
        $this->userGestorSaude->roles()->attach($roleRestrito->id, ['tenant_id' => $this->tenant->id]);
        $this->userGestorSaude->clearPermissionCache();
        OrgUnitUser::create(['user_id' => $this->userGestorSaude->id, 'org_unit_id' => $this->secSaude->id, 'role' => 'membro', 'is_primary' => true]);

        $this->userComum = User::create(['name' => 'Usuário Comum', 'email' => 'comum@dash.gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->userComum->id, ['status' => 'active', 'is_primary' => true]);
        $this->userComum->clearPermissionCache();

        // Tipos de tramitação
        $this->tipoEntrada = TipoTramitacao::firstOrCreate(['slug' => 'entrada'], ['nome' => 'Entrada', 'ativo' => true]);
        $this->tipoParecer = TipoTramitacao::firstOrCreate(
            ['slug' => 'parecer_tecnico'],
            ['nome' => 'Parecer Técnico', 'prazo_dias' => 5, 'ativo' => true]
        );

        app(TenantContext::class)->clear();
    }

    private function como(User $user): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $this->tenant->id);
    }

    public function test_usuario_sem_permissao_recebe_403(): void
    {
        $response = $this->como($this->userComum)->getJson('/api/protocolo/dashboard');

        $response->assertStatus(403);
    }

    public function test_dashboard_sem_processos_retorna_metricas_zeradas_sem_erro(): void
    {
        $response = $this->como($this->userGestorGeral)->getJson('/api/protocolo/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('total_processos', 0)
            ->assertJsonPath('por_status.aberto', 0)
            ->assertJsonPath('por_status.concluido', 0)
            ->assertJsonPath('por_origem.interna', 0)
            ->assertJsonPath('por_origem.externa', 0)
            ->assertJsonPath('tempo_medio_tramitacao_segundos', null)
            ->assertJsonPath('tempo_medio_tramitacao_dias', null)
            ->assertJsonPath('total_prazos_excedidos', 0);
    }

    public function test_dashboard_com_dados_semeados_calcula_distribuicoes_e_medias(): void
    {
        app(TenantContext::class)->set($this->tenant);

        // Processo 1: Interno, Saúde, Concluído (aberto há 10 dias, concluído há 2 dias = 8 dias de tramitação)
        $proc1 = Processo::create([
            'numero' => 101,
            'ano' => 2026,
            'assunto' => 'Compra de Medicamentos',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secSaude->id,
            'orgao_atual_id' => $this->secSaude->id,
            'status' => 'concluido',
            'data_abertura' => Carbon::parse('2026-03-01 10:00:00'),
            'data_conclusao' => Carbon::parse('2026-03-09 10:00:00'), // 8 dias = 691200 seg
        ]);

        // Processo 2: Externo, Educação, Em tramitação
        $proc2 = Processo::create([
            'numero' => 102,
            'ano' => 2026,
            'assunto' => 'Reforma de Escola',
            'origem' => 'externa',
            'orgao_origem_id' => $this->secEducacao->id,
            'orgao_atual_id' => $this->secEducacao->id,
            'status' => 'em_tramitacao',
            'data_abertura' => Carbon::parse('2026-03-05 10:00:00'),
        ]);

        // Processo 3: Interno, Saúde, Aberto com prazo excedido (prazo 5 dias, recebido há 10 dias)
        $proc3 = Processo::create([
            'numero' => 103,
            'ano' => 2026,
            'assunto' => 'Auditoria Hospitalar',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secSaude->id,
            'orgao_atual_id' => $this->secSaude->id,
            'status' => 'aberto',
            'data_abertura' => Carbon::parse('2026-03-01 10:00:00'),
        ]);

        $andamento3 = Andamento::create([
            'processo_id' => $proc3->id,
            'sequencia' => 1,
            'tipo_tramitacao_id' => $this->tipoParecer->id,
            'orgao_origem_id' => $this->secSaude->id,
            'orgao_destino_id' => $this->secSaude->id,
            'usuario_id' => $this->userGestorGeral->id,
            'data_recebimento' => Carbon::now()->subDays(10),
            'and_atual' => true,
        ]);
        $proc3->update(['ultimo_andamento_id' => $andamento3->id]);

        // Andamento encerrado para permanência na Educação: recebido dia 2, enviado dia 4 (2 dias = 172800 seg)
        Andamento::create([
            'processo_id' => $proc2->id,
            'sequencia' => 1,
            'tipo_tramitacao_id' => $this->tipoEntrada->id,
            'orgao_origem_id' => $this->secEducacao->id,
            'orgao_destino_id' => $this->secEducacao->id,
            'usuario_id' => $this->userGestorGeral->id,
            'data_recebimento' => Carbon::parse('2026-03-02 10:00:00'),
            'data_envio' => Carbon::parse('2026-03-04 10:00:00'),
            'and_atual' => false,
        ]);

        app(TenantContext::class)->clear();

        // Consulta Gestor Geral
        $response = $this->como($this->userGestorGeral)->getJson('/api/protocolo/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('total_processos', 3)
            ->assertJsonPath('por_status.concluido', 1)
            ->assertJsonPath('por_status.em_tramitacao', 1)
            ->assertJsonPath('por_status.aberto', 1)
            ->assertJsonPath('por_origem.interna', 2)
            ->assertJsonPath('por_origem.externa', 1)
            ->assertJsonPath('tempo_medio_tramitacao_dias', 8)
            ->assertJsonPath('total_prazos_excedidos', 1);

        $dados = $response->json();
        $this->assertCount(2, $dados['por_orgao']);
        $this->assertNotEmpty($dados['tempo_permanencia_por_orgao']);
    }

    public function test_gestor_com_escopo_restrito_enxerga_apenas_seu_orgao(): void
    {
        app(TenantContext::class)->set($this->tenant);

        // Processo Saúde
        Processo::create([
            'numero' => 201,
            'ano' => 2026,
            'assunto' => 'Posto de Saúde',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secSaude->id,
            'orgao_atual_id' => $this->secSaude->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        // Processo Educação (fora do escopo do gestor de saúde)
        Processo::create([
            'numero' => 202,
            'ano' => 2026,
            'assunto' => 'Merenda Escolar',
            'origem' => 'externa',
            'orgao_origem_id' => $this->secEducacao->id,
            'orgao_atual_id' => $this->secEducacao->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        app(TenantContext::class)->clear();

        $response = $this->como($this->userGestorSaude)->getJson('/api/protocolo/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('total_processos', 1)
            ->assertJsonPath('por_origem.interna', 1)
            ->assertJsonPath('por_origem.externa', 0);
    }

    public function test_filtro_de_periodo_restringe_processos(): void
    {
        app(TenantContext::class)->set($this->tenant);

        Processo::create([
            'numero' => 301,
            'ano' => 2026,
            'assunto' => 'Processo de Janeiro',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secSaude->id,
            'orgao_atual_id' => $this->secSaude->id,
            'status' => 'aberto',
            'data_abertura' => '2026-01-15 10:00:00',
        ]);

        Processo::create([
            'numero' => 302,
            'ano' => 2026,
            'assunto' => 'Processo de Março',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secSaude->id,
            'orgao_atual_id' => $this->secSaude->id,
            'status' => 'aberto',
            'data_abertura' => '2026-03-15 10:00:00',
        ]);

        app(TenantContext::class)->clear();

        $response = $this->como($this->userGestorGeral)->getJson('/api/protocolo/dashboard?data_inicio=2026-03-01&data_fim=2026-03-31');

        $response->assertStatus(200)
            ->assertJsonPath('total_processos', 1);
    }
}
