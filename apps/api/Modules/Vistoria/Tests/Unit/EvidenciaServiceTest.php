<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Evidencia;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Pergunta;
use Modules\Vistoria\Services\EvidenciaService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class EvidenciaServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_registra_foto_preservando_original_e_gerando_versao_com_marca_dagua(): void
    {
        $tenant = $this->criarTenant();

        $evidencia = $this->noTenant($tenant, function () {
            [$execucao, $pergunta] = $this->montarExecucaoComPerguntaFoto();

            return app(EvidenciaService::class)->registrarFotoChecklist(
                $execucao,
                $pergunta,
                'data:image/png;base64,' . self::PNG_1X1_BASE64,
                -25.4284,
                -49.2733,
                '2026-10-10T12:00:00Z',
            );
        });

        self::assertSame(Evidencia::TIPO_FOTO, $evidencia->tipo);
        Storage::disk('public')->assertExists($evidencia->caminho_original);
        Storage::disk('public')->assertExists($evidencia->caminho_processado);

        $original = Storage::disk('public')->get($evidencia->caminho_original);
        $processado = Storage::disk('public')->get($evidencia->caminho_processado);

        // Original preservado byte a byte (sem marca d'água); processado é outra renderização.
        self::assertSame(base64_decode(self::PNG_1X1_BASE64), $original);
        self::assertNotSame($original, $processado);
        self::assertNotFalse(@getimagesizefromstring($processado));
    }

    public function test_reenvio_da_mesma_execucao_e_pergunta_reprocessa_em_vez_de_duplicar(): void
    {
        $tenant = $this->criarTenant();

        $total = $this->noTenant($tenant, function () {
            [$execucao, $pergunta] = $this->montarExecucaoComPerguntaFoto();
            $service = app(EvidenciaService::class);
            $imagem = 'data:image/png;base64,' . self::PNG_1X1_BASE64;

            $primeira = $service->registrarFotoChecklist($execucao, $pergunta, $imagem, null, null, null);
            $segunda = $service->registrarFotoChecklist($execucao, $pergunta, $imagem, null, null, null);

            self::assertSame($primeira->id, $segunda->id);

            return Evidencia::query()->count();
        });

        self::assertSame(1, $total);
    }

    public function test_lanca_exception_quando_payload_nao_e_imagem_valida(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () {
            [$execucao, $pergunta] = $this->montarExecucaoComPerguntaFoto();
            app(EvidenciaService::class)->registrarFotoChecklist($execucao, $pergunta, 'isto-nao-e-uma-imagem', null, null, null);
        });
    }

    public function test_anexa_documento_complementar_com_categoria_valida(): void
    {
        $tenant = $this->criarTenant();

        $evidencia = $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucaoComPerguntaFoto();
            $arquivo = UploadedFile::fake()->create('nota-fiscal.pdf', 50, 'application/pdf');

            return app(EvidenciaService::class)->anexarDocumentoComplementar($execucao, $arquivo, Evidencia::CATEGORIA_NOTA_FISCAL, 'NF 123');
        });

        self::assertSame(Evidencia::TIPO_DOCUMENTO_COMPLEMENTAR, $evidencia->tipo);
        self::assertSame(Evidencia::CATEGORIA_NOTA_FISCAL, $evidencia->categoria);
        self::assertNull($evidencia->caminho_processado);
        Storage::disk('public')->assertExists($evidencia->caminho_original);
    }

    public function test_lanca_exception_para_categoria_de_documento_complementar_invalida(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucaoComPerguntaFoto();
            $arquivo = UploadedFile::fake()->create('arquivo.pdf', 10, 'application/pdf');
            app(EvidenciaService::class)->anexarDocumentoComplementar($execucao, $arquivo, 'categoria_inexistente', null);
        });
    }

    /**
     * @return array{0: ExecucaoVistoria, 1: Pergunta, 2: User}
     */
    private function montarExecucaoComPerguntaFoto(): array
    {
        $tenant = app(\App\Support\TenantContext::class)->get();
        $modelo = ModeloFormulario::create(['tipo_fiscalizacao' => 'agroindustria', 'nome' => 'Checklist', 'ativo' => true]);
        $pergunta = Pergunta::create([
            'modelo_id' => $modelo->id,
            'enunciado' => 'Foto da fachada',
            'tipo' => Pergunta::TIPO_FOTO,
            'obrigatoria' => true,
            'ordem' => 0,
        ]);

        $proprietario = Pessoa::factory()->create();
        $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
        $local = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Teste',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'classificacao_atividade' => 'agroindustria',
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
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);

        return [$execucao, $pergunta, $fiscal];
    }
}
