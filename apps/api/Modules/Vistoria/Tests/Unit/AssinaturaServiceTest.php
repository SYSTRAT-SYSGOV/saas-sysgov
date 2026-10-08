<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Assinatura;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Services\AssinaturaService;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class AssinaturaServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_sincroniza_assinatura_com_hash_sha256_e_timestamp_do_servidor(): void
    {
        $tenant = $this->criarTenant();

        $resultado = $this->noTenant($tenant, function () {
            [$documento] = $this->montarDocumento();

            return app(AssinaturaService::class)->sincronizarAssinatura($documento, (string) Str::uuid(), [
                'papel' => Assinatura::PAPEL_AUTUADO,
                'tracado_vetorial' => [['x' => 1, 'y' => 2], ['x' => 3, 'y' => 4]],
                'imagem_base64' => 'data:image/png;base64,' . self::PNG_1X1_BASE64,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
                'coletado_em_dispositivo' => '2020-01-01T00:00:00Z', // relógio do dispositivo desconfigurado
            ]);
        });

        $assinatura = $resultado['assinatura'];
        self::assertFalse($resultado['duplicado']);
        self::assertSame(Assinatura::STATUS_ASSINADA, $assinatura->status);
        self::assertNotNull($assinatura->hash_sha256);
        self::assertSame(hash('sha256', base64_decode(self::PNG_1X1_BASE64)), $assinatura->hash_sha256);
        // Timestamp oficial é o do servidor (agora), não o do dispositivo (2020, desconfigurado).
        self::assertLessThan(60, $assinatura->assinado_em->diffInSeconds(now()));
        self::assertSame(2020, $assinatura->coletado_em_dispositivo->year);
        Storage::disk('public')->assertExists($assinatura->imagem_path);
    }

    public function test_reenvio_com_mesmo_client_uuid_nao_duplica(): void
    {
        $tenant = $this->criarTenant();

        $total = $this->noTenant($tenant, function () {
            [$documento] = $this->montarDocumento();
            $clientUuid = (string) Str::uuid();
            $service = app(AssinaturaService::class);
            $dados = ['papel' => Assinatura::PAPEL_AUTUADO, 'imagem_base64' => self::PNG_1X1_BASE64];

            $primeiro = $service->sincronizarAssinatura($documento, $clientUuid, $dados);
            $segundo = $service->sincronizarAssinatura($documento, $clientUuid, $dados);

            self::assertFalse($primeiro['duplicado']);
            self::assertTrue($segundo['duplicado']);
            self::assertSame($primeiro['assinatura']->id, $segundo['assinatura']->id);

            return Assinatura::query()->count();
        });

        self::assertSame(1, $total);
    }

    public function test_registra_recusa_com_motivo_e_testemunha(): void
    {
        $tenant = $this->criarTenant();

        $assinatura = $this->noTenant($tenant, function () {
            [$documento] = $this->montarDocumento();
            $testemunha = Pessoa::factory()->create(['nome' => 'Testemunha Teste']);

            $resultado = app(AssinaturaService::class)->registrarRecusa($documento, (string) Str::uuid(), [
                'motivo' => 'Autuado se recusou a assinar sem justificativa.',
                'testemunha_pessoa_id' => $testemunha->id,
            ]);

            return $resultado['assinatura'];
        });

        self::assertSame(Assinatura::STATUS_RECUSADA, $assinatura->status);
        self::assertSame('Autuado se recusou a assinar sem justificativa.', $assinatura->motivo_recusa);
        self::assertNotNull($assinatura->testemunha_pessoa_id);

        $documento = $this->noTenant($tenant, fn () => Documento::find($assinatura->documento_id));
        self::assertSame(Documento::ASSINATURA_RECUSADA, $documento->fresh()->assinatura_status);
    }

    public function test_lanca_exception_quando_falta_motivo_na_recusa(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () {
            [$documento] = $this->montarDocumento();
            app(AssinaturaService::class)->registrarRecusa($documento, (string) Str::uuid(), []);
        });
    }

    public function test_lanca_exception_quando_testemunha_nao_existe_no_cadastro_unico(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () {
            [$documento] = $this->montarDocumento();
            app(AssinaturaService::class)->registrarRecusa($documento, (string) Str::uuid(), [
                'motivo' => 'Recusa',
                'testemunha_pessoa_id' => 999999,
            ]);
        });
    }

    /**
     * @return array{0: Documento, 1: User}
     */
    private function montarDocumento(): array
    {
        $tenant = app(\App\Support\TenantContext::class)->get();
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
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);
        $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, []);

        return [$documento, $fiscal];
    }
}
