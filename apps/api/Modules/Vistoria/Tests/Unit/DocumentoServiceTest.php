<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Reinspecao;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class DocumentoServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_emite_auto_de_infracao_com_dados_do_autuado_e_numeracao_unica(): void
    {
        $tenant = $this->criarTenant();

        $documento = $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);

            return app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, [
                'irregularidade' => 'Ausência de alvará sanitário',
                'enquadramento_legal' => 'Art. 10 da Lei Municipal XYZ',
                'prazo_dias' => 15,
            ]);
        });

        self::assertMatchesRegularExpression('#^auto_infracao/1/\d{4}$#', $documento->numero);
        self::assertSame('Proprietário Teste', $documento->dados_autuado['nome']);
        self::assertNotNull($documento->caminho_pdf);
        Storage::disk('public')->assertExists($documento->caminho_pdf);
    }

    public function test_numeracao_e_sequencial_por_tipo_e_reinicia_por_exercicio(): void
    {
        $tenant = $this->criarTenant();

        [$numero1, $numero2, $numeroOutroExercicio] = $this->noTenant($tenant, function () use ($tenant) {
            [$execucaoA] = $this->montarExecucao($tenant);
            [$execucaoB] = $this->montarExecucao($tenant);
            $service = app(DocumentoService::class);

            $doc1 = $service->emitirDocumento($execucaoA, Documento::TIPO_AUTO_INFRACAO, []);
            $doc2 = $service->emitirDocumento($execucaoB, Documento::TIPO_AUTO_INFRACAO, []);

            $this->travel(1)->years();
            [$execucaoC] = $this->montarExecucao($tenant);
            $doc3 = $service->emitirDocumento($execucaoC, Documento::TIPO_AUTO_INFRACAO, []);
            $this->travelBack();

            return [$doc1->numero_sequencial, $doc2->numero_sequencial, $doc3->numero_sequencial];
        });

        self::assertSame(1, $numero1);
        self::assertSame(2, $numero2);
        self::assertSame(1, $numeroOutroExercicio);
    }

    public function test_lanca_exception_para_tipo_de_documento_invalido(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);
            app(DocumentoService::class)->emitirDocumento($execucao, 'tipo_inexistente', []);
        });
    }

    public function test_prazo_de_regularizacao_agenda_reinspecao_automaticamente(): void
    {
        $tenant = $this->criarTenant();

        $totalReinspecoes = $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);

            app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 10]);

            return OrdemServico::where('tipo_acao', OrdemServico::TIPO_ACAO_REINSPECAO)->count();
        });

        self::assertSame(1, $totalReinspecoes);
    }

    public function test_prazo_de_regularizacao_cria_acompanhamento_de_reinspecao_vinculado_a_ordem_e_documento(): void
    {
        $tenant = $this->criarTenant();

        $reinspecao = $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 10]);

            return Reinspecao::where('documento_id', $documento->id)->first();
        });

        self::assertNotNull($reinspecao);
        self::assertSame(Reinspecao::STATUS_PENDENTE, $reinspecao->status);
        self::assertNotNull($reinspecao->ordem_servico_original_id);
        self::assertNotNull($reinspecao->ordem_servico_reinspecao_id);
        self::assertNotSame($reinspecao->ordem_servico_original_id, $reinspecao->ordem_servico_reinspecao_id);
        // Reaproveita a mesma OS criada pela 6.4 — não duplica.
        self::assertSame(1, OrdemServico::where('tipo_acao', OrdemServico::TIPO_ACAO_REINSPECAO)->count());
    }

    public function test_sem_prazo_nao_cria_reinspecao(): void
    {
        $tenant = $this->criarTenant();

        $totalReinspecoes = $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);

            app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_NOTIFICACAO, []);

            return OrdemServico::where('tipo_acao', OrdemServico::TIPO_ACAO_REINSPECAO)->count();
        });

        self::assertSame(0, $totalReinspecoes);
    }

    /**
     * @return array{0: ExecucaoVistoria, 1: User}
     */
    private function montarExecucao(Tenant $tenant): array
    {
        $proprietario = Pessoa::factory()->create(['nome' => 'Proprietário Teste']);
        $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
        $local = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Teste',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
        $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');
        $ordem = OrdemServico::create([
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'data_prevista' => now()->addDay()->toDateString(),
        ]);
        $execucao = ExecucaoVistoria::create([
            'ordem_servico_id' => $ordem->id,
            'fiscal_id' => $fiscal->id,
            'client_uuid' => (string) \Illuminate\Support\Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);

        return [$execucao, $fiscal];
    }
}
