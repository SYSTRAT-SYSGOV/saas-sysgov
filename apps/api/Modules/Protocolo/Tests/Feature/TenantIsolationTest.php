<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Protocolo\Models\Andamento;
use Modules\Protocolo\Models\Atributo;
use Modules\Protocolo\Models\Documento;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\Sequencia;
use Modules\Protocolo\Models\TipoTramitacao;
use Modules\Protocolo\Models\Vinculo;
use Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private OrgUnit $orgaoA1;
    private OrgUnit $orgaoA2;
    private OrgUnit $orgaoB1;
    private User $userA;
    private User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'prefeitura-a', 'type' => 'prefeitura', 'status' => 'active']);
        $this->tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'prefeitura-b', 'type' => 'prefeitura', 'status' => 'active']);

        $this->userA = User::create(['name' => 'User A', 'email' => 'user.a@teste.gov.br']);
        $this->userB = User::create(['name' => 'User B', 'email' => 'user.b@teste.gov.br']);

        app(TenantContext::class)->set($this->tenantA);
        $this->orgaoA1 = OrgUnit::create(['name' => 'Secretaria A1', 'code' => 'SEC-A1', 'tenant_id' => $this->tenantA->id]);
        $this->orgaoA2 = OrgUnit::create(['name' => 'Secretaria A2', 'code' => 'SEC-A2', 'tenant_id' => $this->tenantA->id]);

        app(TenantContext::class)->set($this->tenantB);
        $this->orgaoB1 = OrgUnit::create(['name' => 'Secretaria B1', 'code' => 'SEC-B1', 'tenant_id' => $this->tenantB->id]);

        app(TenantContext::class)->clear();
    }

    public function test_isolamento_estrito_de_processos_entre_tenants(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        $processoA = Processo::create([
            'numero' => 1,
            'ano' => 2026,
            'assunto' => 'Processo Confidencial de A',
            'origem' => 'interna',
            'orgao_origem_id' => $this->orgaoA1->id,
            'orgao_atual_id' => $this->orgaoA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
            'created_by' => $this->userA->id,
        ]);

        self::assertSame($this->tenantA->id, $processoA->tenant_id);
        self::assertSame('0001/2026', $processoA->numero_formatado);

        // Mudar para o Tenant B
        app(TenantContext::class)->set($this->tenantB);
        self::assertSame(0, Processo::query()->count(), 'Tenant B não pode ver processo do Tenant A');

        // Tenant B pode criar seu próprio processo com mesmo número e ano (isolamento de unicidade)
        $processoB = Processo::create([
            'numero' => 1,
            'ano' => 2026,
            'assunto' => 'Processo de B',
            'origem' => 'externa',
            'orgao_origem_id' => $this->orgaoB1->id,
            'orgao_atual_id' => $this->orgaoB1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
            'created_by' => $this->userB->id,
        ]);

        self::assertSame(1, Processo::query()->count());
        self::assertSame('Processo de B', Processo::firstOrFail()->assunto);

        // Voltar para A
        app(TenantContext::class)->set($this->tenantA);
        self::assertSame(1, Processo::query()->count());
        self::assertSame('Processo Confidencial de A', Processo::firstOrFail()->assunto);

        app(TenantContext::class)->clear();
    }

    public function test_isolamento_de_tipos_tramitacao_e_sequencias(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        $tipoA = TipoTramitacao::create([
            'slug' => 'despacho',
            'nome' => 'Despacho Inicial',
            'ativo' => true,
        ]);

        $seqA = Sequencia::create([
            'ano' => 2026,
            'ultimo_numero' => 15,
        ]);

        app(TenantContext::class)->set($this->tenantB);
        self::assertSame(0, TipoTramitacao::query()->count());
        self::assertSame(0, Sequencia::query()->count());

        // Criar mesmo slug no Tenant B
        $tipoB = TipoTramitacao::create([
            'slug' => 'despacho',
            'nome' => 'Despacho B',
            'ativo' => true,
        ]);

        self::assertSame(1, TipoTramitacao::query()->count());

        app(TenantContext::class)->clear();
    }

    public function test_isolamento_de_documentos_atributos_e_vinculos(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        $procA = Processo::create([
            'numero' => 1,
            'ano' => 2026,
            'assunto' => 'Proc A',
            'origem' => 'interna',
            'orgao_origem_id' => $this->orgaoA1->id,
            'orgao_atual_id' => $this->orgaoA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $docA = Documento::create([
            'processo_id' => $procA->id,
            'tipo_documento' => 'oficio',
            'nome_arquivo' => 'oficio.pdf',
            'caminho_arquivo' => 'tenants/1/oficio.pdf',
            'hash_arquivo' => hash('sha256', 'conteudo'),
            'tamanho_bytes' => 1024,
            'mime_type' => 'application/pdf',
        ]);

        $attrA = Atributo::create([
            'processo_id' => $procA->id,
            'chave' => 'prioridade',
            'valor' => 'alta',
            'tipo_atributo' => 'texto',
        ]);

        $vincA = Vinculo::create([
            'processo_id' => $procA->id,
            'entidade_tipo' => 'requerimento',
            'entidade_id' => 99,
            'papel_vinculo' => 'origem',
        ]);

        app(TenantContext::class)->set($this->tenantB);
        self::assertSame(0, Documento::query()->count());
        self::assertSame(0, Atributo::query()->count());
        self::assertSame(0, Vinculo::query()->count());

        app(TenantContext::class)->clear();
    }

    public function test_nao_permite_criar_sem_contexto_de_tenant(): void
    {
        app(TenantContext::class)->clear();

        $this->expectException(LogicException::class);

        Processo::create([
            'numero' => 1,
            'ano' => 2026,
            'assunto' => 'Sem Tenant',
            'origem' => 'interna',
            'orgao_origem_id' => 1,
            'orgao_atual_id' => 1,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);
    }

    public function test_guarda_de_imutabilidade_de_andamento(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        $tipo = TipoTramitacao::create(['slug' => 'despacho', 'nome' => 'Despacho', 'ativo' => true]);

        $processo = Processo::create([
            'numero' => 10,
            'ano' => 2026,
            'assunto' => 'Processo Teste Imutabilidade',
            'origem' => 'interna',
            'orgao_origem_id' => $this->orgaoA1->id,
            'orgao_atual_id' => $this->orgaoA1->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $andamento = Andamento::create([
            'processo_id' => $processo->id,
            'orgao_origem_id' => $this->orgaoA1->id,
            'orgao_destino_id' => $this->orgaoA2->id,
            'tipo_tramitacao_id' => $tipo->id,
            'usuario_id' => $this->userA->id,
            'descricao' => 'Encaminhamento para análise',
            'sequencia' => 1,
            'and_atual' => true,
        ]);

        // 1. Tentar excluir deve lançar LogicException
        try {
            $andamento->delete();
            self::fail('Exclusão de andamento deveria ser bloqueada.');
        } catch (LogicException $e) {
            self::assertStringContainsString('imutáveis', $e->getMessage());
        }

        // 2. Tentar alterar descrição deve lançar LogicException
        try {
            $andamento->update(['descricao' => 'Nova descrição fraudulenta']);
            self::fail('Edição de descrição deveria ser bloqueada.');
        } catch (LogicException $e) {
            self::assertStringContainsString('imutáveis', $e->getMessage());
        }

        // 3. Confirmar recebimento (permitido uma única vez)
        $andamento = $andamento->fresh();
        $recebidoEm = now();
        $andamento->update([
            'data_recebimento' => $recebidoEm,
            'usuario_recebedor_id' => $this->userA->id,
        ]);
        self::assertNotNull($andamento->fresh()->data_recebimento);

        // 4. Tentar sobrescrever data de recebimento deve falhar
        try {
            $andamento->update(['data_recebimento' => now()->addHour()]);
            self::fail('Sobrescrita de data_recebimento deveria ser bloqueada.');
        } catch (LogicException $e) {
            self::assertStringContainsString('já foi preenchida', $e->getMessage());
        }

        // 5. Finalizar andamento (permitido: data_envio e and_atual -> false)
        $andamento = $andamento->fresh();
        $andamento->update([
            'data_envio' => now(),
            'and_atual' => false,
        ]);
        self::assertFalse($andamento->fresh()->and_atual);

        app(TenantContext::class)->clear();
    }
}