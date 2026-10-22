<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Protocolo\Database\Seeders\TiposTramitacaoDefaultSeeder;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Services\ProcessoService;
use Tests\TestCase;

final class ProcessoCicloVidaEvolucaoTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private OrgUnit $secretaria;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Município Teste',
            'slug' => 'municipio-teste',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);
        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create([
            'name' => 'Agente Teste',
            'email' => 'agente@teste.gov.br',
            'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->tenant->users()->attach($this->user->id, ['status' => 'active', 'is_primary' => true]);

        $this->secretaria = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Gabinete do Prefeito',
            'code' => 'GAB',
            'type' => 'secretaria',
            'status' => 'active',
        ]);

        (new TiposTramitacaoDefaultSeeder())->seedParaTenant($this->tenant);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_concluir_processo_cria_andamento_e_define_data_conclusao(): void
    {
        $service = app(ProcessoService::class);
        $processo = $service->abrir([
            'assunto' => 'Solicitação de Alvará',
            'origem' => 'externa',
            'orgao_origem_id' => $this->secretaria->id,
            'descricao' => 'Processo para teste de conclusão',
            'tipo_processo' => 'administrativo',
        ], [], [], ['usuario_id' => $this->user->id]);

        $concluido = $service->concluir($processo, $this->user->id, 'Processo deferido e concluído.');

        self::assertSame('concluido', $concluido->status);
        self::assertNotNull($concluido->data_conclusao);

        $this->assertDatabaseHas('protocolo_andamentos', [
            'processo_id' => $processo->id,
            'descricao' => 'Processo deferido e concluído.',
        ]);
    }

    public function test_arquivar_processo_em_fase_permanente_e_desarquivar(): void
    {
        $service = app(ProcessoService::class);
        $processo = $service->abrir([
            'assunto' => 'Processo Histórico de Tombamento',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretaria->id,
            'tipo_processo' => 'patrimonio',
        ], [], [], ['usuario_id' => $this->user->id]);

        // Arquivar na fase permanente
        $arquivado = $service->arquivar($processo, $this->user->id, 'permanente', 'Caixa 42 - Arquivo Histórico');

        self::assertSame('arquivado', $arquivado->status);
        self::assertSame('permanente', $arquivado->arquivamento_tipo);
        self::assertNotNull($arquivado->data_arquivamento);

        // Desarquivar
        $desarquivado = $service->desarquivar($arquivado, $this->user->id, 'Solicitada consulta por auditoria');

        self::assertSame('em_tramitacao', $desarquivado->status);
        self::assertNull($desarquivado->arquivamento_tipo);
        self::assertNull($desarquivado->data_arquivamento);
    }

    public function test_reabrir_processo_concluido_cria_andamento_de_reabertura(): void
    {
        $service = app(ProcessoService::class);
        $processo = $service->abrir([
            'assunto' => 'Processo de Recurso Administrativo',
            'origem' => 'externa',
            'orgao_origem_id' => $this->secretaria->id,
        ], [], [], ['usuario_id' => $this->user->id]);

        $service->concluir($processo, $this->user->id, 'Encerrado por decurso de prazo.');
        $reaberto = $service->reabrir($processo->fresh(), $this->user->id, 'Apresentado fato novo relevante.');

        self::assertSame('em_tramitacao', $reaberto->status);
        self::assertNull($reaberto->data_conclusao);

        $this->assertDatabaseHas('protocolo_andamentos', [
            'processo_id' => $processo->id,
            'descricao' => 'Apresentado fato novo relevante.',
        ]);
    }

    private function como(User $user): self
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $this->tenant->id);
    }

    public function test_exportar_csv_gera_arquivo_com_bom_e_cabecalho(): void
    {
        $service = app(ProcessoService::class);
        $service->abrir([
            'assunto' => 'Processo Exportável 1',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secretaria->id,
            'tipo_processo' => 'financeiro',
        ], [], [], ['usuario_id' => $this->user->id]);

        $response = $this->como($this->user)
            ->getJson('/api/protocolo/processos/export');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        self::assertStringContainsString('Processo Exportável 1', $response->streamedContent());
    }

    public function test_busca_por_cpf_com_e_sem_pontuacao(): void
    {
        $pessoa = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'Cidadão Exemplar',
            'documento' => '12345678909',
        ]);

        $service = app(ProcessoService::class);
        $proc = $service->abrir([
            'assunto' => 'Requerimento de Cidadão',
            'origem' => 'externa',
            'orgao_origem_id' => $this->secretaria->id,
            'interessado_pessoa_id' => $pessoa->id,
        ], [], [], ['usuario_id' => $this->user->id]);

        // Busca com formatação "123.456.789-09"
        $respFormatado = $this->como($this->user)
            ->getJson('/api/protocolo/processos?q=123.456.789-09');
        $respFormatado->assertOk();
        self::assertCount(1, $respFormatado->json('data'));
        self::assertSame($proc->id, $respFormatado->json('data.0.id'));

        // Busca apenas números "12345678909"
        $respNumeros = $this->como($this->user)
            ->getJson('/api/protocolo/processos?q=12345678909');
        $respNumeros->assertOk();
        self::assertCount(1, $respNumeros->json('data'));
    }

    public function test_rastreamento_publico_aplica_lgpd_mascarando_cpf(): void
    {
        $pessoa = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'Maria de Jesus Oliveira',
            'documento' => '98765432100',
        ]);

        $service = app(ProcessoService::class);
        $proc = $service->abrir([
            'assunto' => 'Pedido de Certidão Negativa',
            'origem' => 'externa',
            'orgao_origem_id' => $this->secretaria->id,
            'interessado_pessoa_id' => $pessoa->id,
        ], [], [], ['usuario_id' => $this->user->id]);

        $response = $this->como($this->user)
            ->getJson('/api/protocolo/processos/consulta-publica?numero=' . urlencode($proc->numero_formatado));

        $response->assertOk();
        $response->assertJsonPath('data.numero_formatado', $proc->numero_formatado);
        // CPF deve estar mascarado no endpoint público via padrão MDM Pessoas
        self::assertSame('***.654.321-**', $response->json('data.interessado.cpf_cnpj_mascarado'));
    }
}
