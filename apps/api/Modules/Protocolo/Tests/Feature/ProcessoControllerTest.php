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
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;
use Tests\TestCase;

final class ProcessoControllerTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private OrgUnit $secretariaA1;
    private OrgUnit $secretariaA2;
    private OrgUnit $secretariaB1;
    private User $userA;
    private User $userSemPermissao;
    private TipoTramitacao $tipoEntrada;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'prefeitura-a', 'type' => 'prefeitura', 'status' => 'active']);
        $this->tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'prefeitura-b', 'type' => 'prefeitura', 'status' => 'active']);

        // Cria permissões do módulo
        $permView = Permission::firstOrCreate(['slug' => 'protocolo.processos.view'], ['name' => 'Visualizar Processos', 'guard_name' => 'web']);
        $permCreate = Permission::firstOrCreate(['slug' => 'protocolo.processos.create'], ['name' => 'Criar Processos', 'guard_name' => 'web']);
        $permUpdate = Permission::firstOrCreate(['slug' => 'protocolo.processos.update'], ['name' => 'Atualizar Processos', 'guard_name' => 'web']);
        $permDelete = Permission::firstOrCreate(['slug' => 'protocolo.processos.delete'], ['name' => 'Excluir Processos', 'guard_name' => 'web']);

        // Usuário com permissões completas no Tenant A
        $this->userA = User::create(['name' => 'Gestor Protocolo', 'email' => 'gestor@prefeitura-a.gov.br', 'password' => bcrypt('secret')]);
        $this->tenantA->users()->attach($this->userA->id, ['status' => 'active', 'is_primary' => true]);

        $roleProtocolo = Role::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Protocolista',
            'slug' => 'protocolista',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $roleProtocolo->permissions()->sync([$permView->id, $permCreate->id, $permUpdate->id, $permDelete->id]);
        $this->userA->roles()->attach($roleProtocolo->id, ['tenant_id' => $this->tenantA->id]);
        $this->userA->clearPermissionCache();

        // Usuário sem permissões
        $this->userSemPermissao = User::create(['name' => 'Sem Permissao', 'email' => 'sem@prefeitura-a.gov.br', 'password' => bcrypt('secret')]);
        $this->tenantA->users()->attach($this->userSemPermissao->id, ['status' => 'active', 'is_primary' => true]);

        // Unidades organizacionais
        app(TenantContext::class)->set($this->tenantA);
        $this->secretariaA1 = OrgUnit::create(['name' => 'Gabinete do Prefeito', 'code' => 'GAB', 'tenant_id' => $this->tenantA->id, 'is_active' => true]);
        $this->secretariaA2 = OrgUnit::create(['name' => 'Secretaria de Finanças', 'code' => 'SEFIN', 'tenant_id' => $this->tenantA->id, 'is_active' => true]);
        $this->tipoEntrada = TipoTramitacao::create(['slug' => 'entrada', 'nome' => 'Entrada / Abertura', 'ativo' => true]);

        // Vincula userA à secretariaA1
        OrgUnitUser::create([
            'user_id' => $this->userA->id,
            'org_unit_id' => $this->secretariaA1->id,
            'role' => 'membro',
            'is_primary' => true,
        ]);

        app(TenantContext::class)->set($this->tenantB);
        $this->secretariaB1 = OrgUnit::create(['name' => 'Secretaria de Saúde B', 'code' => 'SMS-B', 'tenant_id' => $this->tenantB->id, 'is_active' => true]);

        app(TenantContext::class)->clear();
    }

    private function como(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    public function test_rejeita_abertura_sem_autenticacao(): void
    {
        $response = $this->withHeader('X-Tenant-ID', (string) $this->tenantA->id)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Processo sem login',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretariaA1->id,
            ]);

        $response->assertStatus(401);
    }

    public function test_rejeita_abertura_sem_permissao_create(): void
    {
        $response = $this->como($this->userSemPermissao, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Processo não autorizado',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretariaA1->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_rejeita_abertura_sem_origem_ou_com_origem_invalida(): void
    {
        // 1. Sem origem
        $response1 = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Processo Teste',
                'orgao_origem_id' => $this->secretariaA1->id,
            ]);
        $response1->assertStatus(422)
            ->assertJsonValidationErrors(['origem']);

        // 2. Origem diferente de externa|interna
        $response2 = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Processo Teste',
                'origem' => 'invalida',
                'orgao_origem_id' => $this->secretariaA1->id,
            ]);
        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['origem']);
    }

    public function test_rejeita_abertura_com_orgao_origem_inexistente_ou_de_outro_tenant(): void
    {
        // Órgão do Tenant B não deve ser aceito para Tenant A
        $response = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Processo Cross Tenant',
                'origem' => 'externa',
                'orgao_origem_id' => $this->secretariaB1->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['orgao_origem_id']);
    }

    public function test_rejeita_abertura_com_processo_pai_de_outro_tenant(): void
    {
        // Cria processo no Tenant B
        app(TenantContext::class)->set($this->tenantB);
        $procB = Processo::create([
            'numero' => 99,
            'ano' => 2026,
            'assunto' => 'Processo de B',
            'origem' => 'externa',
            'orgao_origem_id' => $this->secretariaB1->id,
            'orgao_atual_id' => $this->secretariaB1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Processo com Pai Inválido',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretariaA1->id,
                'processo_pai_id' => $procB->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['processo_pai_id']);
    }

    public function test_abertura_ignora_campo_numero_injetado_pelo_cliente(): void
    {
        $response = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'numero' => 9999, // Injetado manualmente para burlar numeração sequencial
                'assunto' => 'Solicitação de Reforma da Praça',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretariaA1->id,
            ]);

        $response->assertStatus(201);
        $dados = $response->json();

        // O número real DEVE vir da sequência (1), não o 9999 forçado
        self::assertSame(1, $dados['numero']);
        self::assertSame(date('Y'), (string) $dados['ano']);
        self::assertSame('0001/' . date('Y'), $dados['numero_formatado']);
    }

    public function test_rejeita_abertura_com_documento_de_mime_nao_permitido(): void
    {
        $arquivoInvalido = UploadedFile::fake()->create('script.exe', 100, 'application/x-msdownload');

        $response = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Tentativa de Upload Malicioso',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretariaA1->id,
                'documentos' => [
                    [
                        'tipo_documento' => 'anexo',
                        'arquivo' => $arquivoInvalido,
                    ],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['documentos.0.arquivo']);
    }

    public function test_rejeita_abertura_com_documento_acima_do_limite_de_tamanho(): void
    {
        // 25 MB (limite é 20 MB / 20480 KB)
        $arquivoGigante = UploadedFile::fake()->create('documento_pesado.pdf', 25000, 'application/pdf');

        $response = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Arquivo Gigante',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretariaA1->id,
                'documentos' => [
                    [
                        'tipo_documento' => 'anexo',
                        'arquivo' => $arquivoGigante,
                    ],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['documentos.0.arquivo']);
    }

    public function test_rejeita_abertura_com_atributos_duplicados_ou_invalidos(): void
    {
        // 1. Chave duplicada
        $response1 = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Atributos Duplicados',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretariaA1->id,
                'atributos' => [
                    ['chave' => 'prioridade', 'tipo_atributo' => 'texto', 'valor' => 'alta'],
                    ['chave' => 'prioridade', 'tipo_atributo' => 'texto', 'valor' => 'baixa'],
                ],
            ]);
        $response1->assertStatus(422)
            ->assertJsonValidationErrors(['atributos.1.chave']);

        // 2. Tipo booleano inválido
        $response2 = $this->como($this->userA, $this->tenantA)
            ->postJson('/api/protocolo/processos', [
                'assunto' => 'Atributo Inválido',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretariaA1->id,
                'atributos' => [
                    ['chave' => 'urgente', 'tipo_atributo' => 'booleano', 'valor' => 'talvez'],
                ],
            ]);
        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['atributos.0.valor']);
    }

    public function test_rejeita_atualizacao_que_cria_ciclo_pai_filho(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        $processoA = Processo::create([
            'numero' => 10,
            'ano' => 2026,
            'assunto' => 'Processo Pai A',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $processoB = Processo::create([
            'numero' => 11,
            'ano' => 2026,
            'assunto' => 'Processo Filho B',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'processo_pai_id' => $processoA->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        app(TenantContext::class)->clear();

        // 1. Tentar tornar A filho de si mesmo
        $resp1 = $this->como($this->userA, $this->tenantA)
            ->putJson("/api/protocolo/processos/{$processoA->id}", [
                'processo_pai_id' => $processoA->id,
            ]);
        $resp1->assertStatus(422)
            ->assertJsonValidationErrors(['processo_pai_id']);

        // 2. Tentar tornar A filho de B (criando o ciclo A -> B -> A)
        $resp2 = $this->como($this->userA, $this->tenantA)
            ->putJson("/api/protocolo/processos/{$processoA->id}", [
                'processo_pai_id' => $processoB->id,
            ]);
        $resp2->assertStatus(422)
            ->assertJsonValidationErrors(['processo_pai_id']);
    }

    public function test_index_rejeita_usuario_sem_permissao_view(): void
    {
        $response = $this->como($this->userSemPermissao, $this->tenantA)
            ->getJson('/api/protocolo/processos');

        $response->assertStatus(403);
    }

    public function test_index_filtra_por_busca_status_e_escopo_organizacional(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        $proc1 = Processo::create([
            'numero' => 101,
            'ano' => 2026,
            'assunto' => 'Reforma do Teatro Municipal',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $proc2 = Processo::create([
            'numero' => 102,
            'ano' => 2026,
            'assunto' => 'Pagamento de Fornecedores',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA2->id,
            'orgao_atual_id' => $this->secretariaA2->id,
            'status' => 'concluido',
            'data_abertura' => now(),
        ]);

        app(TenantContext::class)->clear();

        // userA está vinculado apenas à secretariaA1 (Gabinete). Não tem scope_all.
        // Deve ver proc1 (orgao_atual_id = secretariaA1), mas NÃO proc2 (secretariaA2)
        $response = $this->como($this->userA, $this->tenantA)
            ->getJson('/api/protocolo/processos');

        $response->assertStatus(200);
        $dados = $response->json('data');
        self::assertCount(1, $dados);
        self::assertSame('Reforma do Teatro Municipal', $dados[0]['assunto']);

        // Filtro por busca textual 'Teatro'
        $respBusca = $this->como($this->userA, $this->tenantA)
            ->getJson('/api/protocolo/processos?q=Teatro');
        $respBusca->assertStatus(200);
        self::assertCount(1, $respBusca->json('data'));

        // Filtro por número formatado '101/2026'
        $respNum = $this->como($this->userA, $this->tenantA)
            ->getJson('/api/protocolo/processos?q=101/2026');
        $respNum->assertStatus(200);
        self::assertCount(1, $respNum->json('data'));

        // Filtro por status concluido (não deve achar nada no escopo de A1)
        $respStatus = $this->como($this->userA, $this->tenantA)
            ->getJson('/api/protocolo/processos?status=concluido');
        $respStatus->assertStatus(200);
        self::assertCount(0, $respStatus->json('data'));
    }

    public function test_show_retorna_404_para_processo_de_outro_tenant(): void
    {
        app(TenantContext::class)->set($this->tenantB);
        $procB = Processo::create([
            'numero' => 1,
            'ano' => 2026,
            'assunto' => 'Processo do Tenant B',
            'origem' => 'externa',
            'orgao_origem_id' => $this->secretariaB1->id,
            'orgao_atual_id' => $this->secretariaB1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);
        app(TenantContext::class)->clear();

        // Tentar acessar processo do Tenant B a partir do Tenant A retorna 404 (graças ao tenant-aware model binding)
        $response = $this->como($this->userA, $this->tenantA)
            ->getJson("/api/protocolo/processos/{$procB->id}");

        $response->assertStatus(404);
    }

    public function test_show_retorna_processo_completo_com_relacoes(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $proc = Processo::create([
            'numero' => 50,
            'ano' => 2026,
            'assunto' => 'Processo Detalhado',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userA, $this->tenantA)
            ->getJson("/api/protocolo/processos/{$proc->id}");

        $response->assertStatus(200)
            ->assertJsonPath('assunto', 'Processo Detalhado')
            ->assertJsonStructure([
                'id',
                'numero',
                'ano',
                'numero_formatado',
                'assunto',
                'status',
                'orgao_origem',
                'orgao_atual',
                'andamentos',
                'documentos',
                'atributos',
                'vinculos',
            ]);
    }

    public function test_update_atualiza_assunto_e_gera_log_de_auditoria(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $proc = Processo::create([
            'numero' => 60,
            'ano' => 2026,
            'assunto' => 'Assunto Original',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userA, $this->tenantA)
            ->putJson("/api/protocolo/processos/{$proc->id}", [
                'assunto' => 'Assunto Atualizado com Sucesso',
            ]);

        $response->assertStatus(200);
        self::assertSame('Assunto Atualizado com Sucesso', $proc->fresh()->assunto);

        // Verifica auditoria gravada
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenantA->id,
            'user_id' => $this->userA->id,
            'module' => 'protocolo',
            'action' => 'processo.editar',
        ]);

        $log = AuditLog::where('action', 'processo.editar')->latest('id')->first();
        self::assertNotNull($log);
        self::assertSame('Assunto Original', $log->before['assunto']);
        self::assertSame('Assunto Atualizado com Sucesso', $log->after['assunto']);
    }

    public function test_destroy_bloqueia_exclusao_de_processo_com_filhos_ativos(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $pai = Processo::create([
            'numero' => 70,
            'ano' => 2026,
            'assunto' => 'Processo Pai Principal',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $filho = Processo::create([
            'numero' => 71,
            'ano' => 2026,
            'assunto' => 'Processo Filho Ativo',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'processo_pai_id' => $pai->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userA, $this->tenantA)
            ->deleteJson("/api/protocolo/processos/{$pai->id}");

        $response->assertStatus(409)
            ->assertJsonPath('message', 'Não é possível excluir um processo que possui processos filhos ativos.');

        self::assertNull($pai->fresh()->deleted_at);
    }

    public function test_destroy_executa_soft_delete_e_gera_log_de_auditoria(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $proc = Processo::create([
            'numero' => 80,
            'ano' => 2026,
            'assunto' => 'Processo a ser Excluído',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userA, $this->tenantA)
            ->deleteJson("/api/protocolo/processos/{$proc->id}");

        $response->assertStatus(200);

        self::assertNotNull($proc->fresh()->deleted_at);

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenantA->id,
            'user_id' => $this->userA->id,
            'module' => 'protocolo',
            'action' => 'processo.excluir',
        ]);
    }

    public function test_filhos_lista_processos_filhos(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $pai = Processo::create([
            'numero' => 90,
            'ano' => 2026,
            'assunto' => 'Processo Pai',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $filho1 = Processo::create([
            'numero' => 91,
            'ano' => 2026,
            'assunto' => 'Filho 1',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'processo_pai_id' => $pai->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $filho2 = Processo::create([
            'numero' => 92,
            'ano' => 2026,
            'assunto' => 'Filho 2',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretariaA1->id,
            'orgao_atual_id' => $this->secretariaA1->id,
            'processo_pai_id' => $pai->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userA, $this->tenantA)
            ->getJson("/api/protocolo/processos/{$pai->id}/filhos");

        $response->assertStatus(200);
        $dados = $response->json();
        self::assertCount(2, $dados);
        self::assertSame('Filho 1', $dados[0]['assunto']);
        self::assertSame('Filho 2', $dados[1]['assunto']);
    }
}
