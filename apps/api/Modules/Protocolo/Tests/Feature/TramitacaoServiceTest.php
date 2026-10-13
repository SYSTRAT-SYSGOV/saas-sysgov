<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Protocolo\Models\Andamento;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;
use Modules\Protocolo\Services\TramitacaoService;
use Tests\TestCase;

final class TramitacaoServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private OrgUnit $orgaoObras;
    private OrgUnit $orgaoProcuradoria;
    private User $userObras;
    private User $userProcuradoria;
    private TipoTramitacao $tipoEncaminhamento;
    private TipoTramitacao $tipoConclusao;
    private TipoTramitacao $tipoInativo;
    private TramitacaoService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'prefeitura-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $this->orgaoObras = OrgUnit::create(['name' => 'Secretaria de Obras', 'code' => 'OBRAS', 'tenant_id' => $this->tenant->id]);
        $this->orgaoProcuradoria = OrgUnit::create(['name' => 'Procuradoria Geral', 'code' => 'PGM', 'tenant_id' => $this->tenant->id]);

        $this->userObras = User::create(['name' => 'Engenheiro Obras', 'email' => 'obras@teste.gov.br']);
        $this->userProcuradoria = User::create(['name' => 'Procurador', 'email' => 'pgm@teste.gov.br']);

        $this->tipoEncaminhamento = TipoTramitacao::create([
            'slug' => 'encaminhamento',
            'nome' => 'Encaminhamento',
            'prazo_dias' => 5,
            'ativo' => true,
        ]);

        $this->tipoConclusao = TipoTramitacao::create([
            'slug' => 'conclusao',
            'nome' => 'Conclusão de Processo',
            'efeito_status' => 'concluido',
            'ativo' => true,
        ]);

        $this->tipoInativo = TipoTramitacao::create([
            'slug' => 'descontinuado',
            'nome' => 'Tipo Inativo',
            'ativo' => false,
        ]);

        $this->service = app(TramitacaoService::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function criarProcessoComAndamentoInicial(): Processo
    {
        $proc = Processo::create([
            'numero' => 1,
            'ano' => 2026,
            'assunto' => 'Obras na Praça Central',
            'origem' => 'interna',
            'orgao_origem_id' => $this->orgaoObras->id,
            'orgao_atual_id' => $this->orgaoObras->id,
            'status' => 'aberto',
            'data_abertura' => now(),
            'created_by' => $this->userObras->id,
        ]);

        $andamento = Andamento::create([
            'processo_id' => $proc->id,
            'orgao_origem_id' => $this->orgaoObras->id,
            'orgao_destino_id' => $this->orgaoObras->id,
            'tipo_tramitacao_id' => $this->tipoEncaminhamento->id,
            'usuario_id' => $this->userObras->id,
            'descricao' => 'Abertura do processo',
            'sequencia' => 1,
            'and_atual' => true,
            'data_recebimento' => now(),
        ]);

        $proc->update(['ultimo_andamento_id' => $andamento->id]);

        return $proc;
    }

    public function test_tramitacao_com_sucesso(): void
    {
        $proc = $this->criarProcessoComAndamentoInicial();
        $andamentoInicial = $proc->andamentoAtual;

        $novoAndamento = $this->service->tramitar(
            processo: $proc,
            orgaoDestinoId: $this->orgaoProcuradoria->id,
            tipoTramitacaoId: $this->tipoEncaminhamento->id,
            usuarioId: $this->userObras->id,
            descricao: 'Encaminhamento para análise jurídica',
        );

        // 1. Andamento anterior deve ter data_envio e and_atual = false
        $andamentoInicial = $andamentoInicial->fresh();
        self::assertFalse($andamentoInicial->and_atual);
        self::assertNotNull($andamentoInicial->data_envio);

        // 2. Novo andamento deve ser atual, com sequência 2 e sem data_recebimento
        self::assertTrue($novoAndamento->and_atual);
        self::assertSame(2, $novoAndamento->sequencia);
        self::assertSame($this->orgaoObras->id, $novoAndamento->orgao_origem_id);
        self::assertSame($this->orgaoProcuradoria->id, $novoAndamento->orgao_destino_id);
        self::assertNull($novoAndamento->data_recebimento);

        // 3. Processo atualizado
        $proc = $proc->fresh();
        self::assertSame($this->orgaoProcuradoria->id, $proc->orgao_atual_id);
        self::assertSame($novoAndamento->id, $proc->ultimo_andamento_id);
        self::assertSame('em_tramitacao', $proc->status);

        // 4. Invariante: exatamente 1 andamento atual
        self::assertSame(1, Andamento::where('processo_id', $proc->id)->where('and_atual', true)->count());

        // 5. Auditoria gravada
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenant->id,
            'action' => 'processo.tramitar',
        ]);
    }

    public function test_tramitacao_com_tipo_de_conclusao(): void
    {
        $proc = $this->criarProcessoComAndamentoInicial();

        $this->service->tramitar(
            processo: $proc,
            orgaoDestinoId: $this->orgaoProcuradoria->id,
            tipoTramitacaoId: $this->tipoConclusao->id,
            usuarioId: $this->userObras->id,
            descricao: 'Conclusão definitiva do pleito',
        );

        $proc = $proc->fresh();
        self::assertSame('concluido', $proc->status);
        self::assertNotNull($proc->data_conclusao);
    }

    public function test_tramitacao_bloqueia_processo_concluido(): void
    {
        $proc = $this->criarProcessoComAndamentoInicial();
        $proc->update(['status' => 'concluido', 'data_conclusao' => now()]);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Não é possível tramitar um processo concluído ou arquivado.');

        $this->service->tramitar(
            processo: $proc,
            orgaoDestinoId: $this->orgaoProcuradoria->id,
            tipoTramitacaoId: $this->tipoEncaminhamento->id,
            usuarioId: $this->userObras->id,
        );
    }

    public function test_tramitacao_bloqueia_tipo_inativo(): void
    {
        $proc = $this->criarProcessoComAndamentoInicial();

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Tipo de tramitação inativo.');

        $this->service->tramitar(
            processo: $proc,
            orgaoDestinoId: $this->orgaoProcuradoria->id,
            tipoTramitacaoId: $this->tipoInativo->id,
            usuarioId: $this->userObras->id,
        );
    }

    public function test_receber_com_sucesso(): void
    {
        $proc = $this->criarProcessoComAndamentoInicial();
        $novoAndamento = $this->service->tramitar(
            processo: $proc,
            orgaoDestinoId: $this->orgaoProcuradoria->id,
            tipoTramitacaoId: $this->tipoEncaminhamento->id,
            usuarioId: $this->userObras->id,
        );

        self::assertNull($novoAndamento->data_recebimento);

        $recebido = $this->service->receber(
            processo: $proc,
            usuarioRecebedorId: $this->userProcuradoria->id,
            orgaoUsuarioId: $this->orgaoProcuradoria->id,
        );

        self::assertNotNull($recebido->fresh()->data_recebimento);
        self::assertSame($this->userProcuradoria->id, $recebido->fresh()->usuario_recebedor_id);

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenant->id,
            'action' => 'processo.receber',
        ]);
    }

    public function test_receber_bloqueia_recebimento_duplicado(): void
    {
        $proc = $this->criarProcessoComAndamentoInicial();
        $this->service->tramitar(
            processo: $proc,
            orgaoDestinoId: $this->orgaoProcuradoria->id,
            tipoTramitacaoId: $this->tipoEncaminhamento->id,
            usuarioId: $this->userObras->id,
        );

        $this->service->receber($proc, $this->userProcuradoria->id, $this->orgaoProcuradoria->id);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Este andamento já foi recebido anteriormente.');

        $this->service->receber($proc, $this->userProcuradoria->id, $this->orgaoProcuradoria->id);
    }

    public function test_receber_bloqueia_orgao_diferente_do_destino(): void
    {
        $proc = $this->criarProcessoComAndamentoInicial();
        $this->service->tramitar(
            processo: $proc,
            orgaoDestinoId: $this->orgaoProcuradoria->id,
            tipoTramitacaoId: $this->tipoEncaminhamento->id,
            usuarioId: $this->userObras->id,
        );

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Apenas usuários do órgão de destino podem confirmar o recebimento.');

        // Passa orgaoObras em vez de orgaoProcuradoria
        $this->service->receber($proc, $this->userObras->id, $this->orgaoObras->id);
    }

    public function test_localizacao_e_permanencia(): void
    {
        $inicio = Carbon::parse('2026-03-01 09:00:00');
        Carbon::setTestNow($inicio);

        $proc = $this->criarProcessoComAndamentoInicial();

        // 1. Em posse em Obras
        $loc1 = $this->service->localizacao($proc);
        self::assertSame('em_posse', $loc1['situacao']);
        self::assertSame('Secretaria de Obras', $loc1['orgao_atual']['name']);

        // 2. Tramita para PGM no dia 01 às 14:00 (5 horas depois)
        Carbon::setTestNow($inicio->copy()->addHours(5));
        $this->service->tramitar($proc, $this->orgaoProcuradoria->id, $this->tipoEncaminhamento->id, $this->userObras->id);

        // 3. Em trânsito para PGM
        $loc2 = $this->service->localizacao($proc);
        self::assertSame('em_transito', $loc2['situacao']);
        self::assertSame('Procuradoria Geral', $loc2['orgao_atual']['name']);

        // 4. PGM recebe no dia 02 às 10:00 (20 horas depois do envio)
        Carbon::setTestNow(Carbon::parse('2026-03-02 10:00:00'));
        $this->service->receber($proc, $this->userProcuradoria->id, $this->orgaoProcuradoria->id);

        $loc3 = $this->service->localizacao($proc);
        self::assertSame('em_posse', $loc3['situacao']);
        self::assertSame($this->userProcuradoria->name, $loc3['usuario_atual']['name']);

        // Verifica permanência calculada
        $perm = $this->service->permanencia($proc);
        self::assertCount(2, $perm);
        self::assertSame(5 * 3600, $perm[0]['tempo_permanencia_segundos']); // 5h em obras
        self::assertSame('concluido', $perm[0]['situacao']);
        self::assertSame('em_posse', $perm[1]['situacao']);
    }

    public function test_prazos_excedidos_com_carbon_set_test_now(): void
    {
        $dataRecebimento = Carbon::parse('2026-03-01 08:00:00');
        Carbon::setTestNow($dataRecebimento);

        $proc = $this->criarProcessoComAndamentoInicial();
        $this->service->tramitar($proc, $this->orgaoProcuradoria->id, $this->tipoEncaminhamento->id, $this->userObras->id);
        $this->service->receber($proc, $this->userProcuradoria->id, $this->orgaoProcuradoria->id);

        // Prazo do tipoEncaminhamento é 5 dias
        // No dia 04 (3 dias corridos), não deve estar atrasado
        Carbon::setTestNow(Carbon::parse('2026-03-04 12:00:00'));
        self::assertCount(0, $this->service->prazosExcedidos());

        // No dia 13 (12 dias corridos), deve estar atrasado em 7 dias
        Carbon::setTestNow(Carbon::parse('2026-03-13 12:00:00'));
        $excedidos = $this->service->prazosExcedidos();
        self::assertCount(1, $excedidos);
        self::assertSame(7, $excedidos->first()['dias_atraso']);
        self::assertSame('Procuradoria Geral', $excedidos->first()['orgao_nome']);
        self::assertSame($this->userProcuradoria->name, $excedidos->first()['usuario_responsavel']);
    }
}
