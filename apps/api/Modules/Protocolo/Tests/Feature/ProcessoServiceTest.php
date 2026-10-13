<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Protocolo\Database\Seeders\TiposTramitacaoDefaultSeeder;
use Modules\Protocolo\Models\Andamento;
use Modules\Protocolo\Models\Atributo;
use Modules\Protocolo\Models\Documento;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Services\ProcessoService;
use Tests\TestCase;

final class ProcessoServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private OrgUnit $secretaria;
    private ProcessoService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->tenant = Tenant::create(['name' => 'Município Teste', 'slug' => 'municipio-teste', 'type' => 'prefeitura', 'status' => 'active']);
        $this->user = User::create(['name' => 'Servidor Teste', 'email' => 'servidor@teste.gov.br']);

        app(TenantContext::class)->set($this->tenant);
        $this->actingAs($this->user);

        $this->secretaria = OrgUnit::create(['name' => 'Secretaria Geral', 'code' => 'SEC-GER', 'tenant_id' => $this->tenant->id]);

        // Semeia tipos de tramitação
        (new TiposTramitacaoDefaultSeeder())->seedParaTenant($this->tenant);

        $this->service = app(ProcessoService::class);
    }

    public function test_abertura_de_processo_em_cascata_atomica_com_sucesso(): void
    {
        $file = UploadedFile::fake()->create('oficio_01.pdf', 500, 'application/pdf');

        $processo = $this->service->abrir(
            dadosProcesso: [
                'assunto' => 'Solicitação de Reforma de Escola',
                'origem' => 'externa',
                'orgao_origem_id' => $this->secretaria->id,
                'created_by' => $this->user->id,
            ],
            atributos: [
                ['chave' => 'prioridade', 'valor' => 'alta', 'tipo_atributo' => 'texto'],
                ['chave' => 'valor_estimado', 'valor' => '25000.50', 'tipo_atributo' => 'decimal'],
            ],
            documentos: [
                ['tipo_documento' => 'requerimento', 'arquivo' => $file, 'nome_arquivo' => 'oficio_01.pdf'],
            ],
            dadosAndamentoInicial: [
                'descricao' => 'Processo protocolado pelo cidadão',
            ]
        );

        self::assertInstanceOf(Processo::class, $processo);
        self::assertSame(1, $processo->numero);
        self::assertSame(now()->year, $processo->ano);
        self::assertSame('0001/' . now()->year, $processo->numero_formatado);
        self::assertSame('aberto', $processo->status);

        // Verifica atributos
        self::assertSame(2, Atributo::where('processo_id', $processo->id)->count());
        $attrDecimal = Atributo::where('processo_id', $processo->id)->where('chave', 'valor_estimado')->firstOrFail();
        self::assertSame('25000.50', $attrDecimal->valor);

        // Verifica documentos
        self::assertSame(1, Documento::where('processo_id', $processo->id)->count());
        $doc = Documento::where('processo_id', $processo->id)->firstOrFail();
        Storage::disk('local')->assertExists($doc->caminho_arquivo);

        // Verifica andamento inicial
        $andamento = Andamento::where('processo_id', $processo->id)->firstOrFail();
        self::assertTrue($andamento->and_atual);
        self::assertSame(1, $andamento->sequencia);
        self::assertSame($processo->id, $andamento->processo_id);
        self::assertSame($andamento->id, $processo->fresh()->ultimo_andamento_id);

        // Verifica auditoria
        self::assertTrue(AuditLog::where('action', 'processo.abrir')->exists());

        app(TenantContext::class)->clear();
    }

    public function test_falha_na_cascata_desfaz_tudo_e_compensa_arquivos(): void
    {
        $file = UploadedFile::fake()->create('documento_teste.pdf', 300, 'application/pdf');

        try {
            $this->service->abrir(
                dadosProcesso: [
                    'assunto' => 'Processo que falhará no atributo',
                    'origem' => 'interna',
                    'orgao_origem_id' => $this->secretaria->id,
                    'created_by' => $this->user->id,
                ],
                atributos: [
                    // Atributo propositalmente inválido (data inválida) para forçar falha no meio da transação
                    ['chave' => 'data_limite', 'valor' => '31/02/2026', 'tipo_atributo' => 'data'],
                ],
                documentos: [
                    ['tipo_documento' => 'anexo', 'arquivo' => $file],
                ]
            );
            self::fail('Deveria ter lançado InvalidArgumentException para data inválida.');
        } catch (InvalidArgumentException) {
            // Esperado
        }

        // 1. Nenhum registro persistido
        self::assertSame(0, Processo::count());
        self::assertSame(0, Documento::count());
        self::assertSame(0, Atributo::count());
        self::assertSame(0, Andamento::count());

        // 2. Nenhum arquivo permaneceu no storage
        self::assertEmpty(Storage::disk('local')->allFiles());

        // 3. Sequência de numeração não foi consumida (próximo ainda será 1)
        $processoValido = $this->service->abrir(
            dadosProcesso: [
                'assunto' => 'Processo Válido Pós-Rollback',
                'origem' => 'interna',
                'orgao_origem_id' => $this->secretaria->id,
                'created_by' => $this->user->id,
            ]
        );

        self::assertSame(1, $processoValido->numero);

        app(TenantContext::class)->clear();
    }
}
