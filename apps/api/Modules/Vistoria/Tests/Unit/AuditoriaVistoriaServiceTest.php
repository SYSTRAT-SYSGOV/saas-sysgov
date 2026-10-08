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
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Services\AssinaturaService;
use Modules\Vistoria\Services\AuditoriaVistoriaService;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class AuditoriaVistoriaServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_trilha_reune_execucao_documento_assinatura_e_processo_em_ordem_cronologica(): void
    {
        $tenant = $this->criarTenant();

        [$execucao, $trilha] = $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);

            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, ['prazo_dias' => 10]);
            app(AssinaturaService::class)->sincronizarAssinatura($documento, (string) Str::uuid(), [
                'imagem_base64' => 'data:image/png;base64,' . self::PNG_1X1_BASE64,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);

            $trilha = app(AuditoriaVistoriaService::class)->obterTrilha($execucao);

            return [$execucao, $trilha];
        });

        /** @var list<string> $recursos */
        $recursos = $trilha->pluck('resource')->all();
        $contemPrefixo = static fn (string $prefixo): bool => array_any($recursos, fn (string $r): bool => str_starts_with($r, $prefixo));

        // Esta execução foi criada direto via Eloquent (sem passar por
        // `ExecucaoVistoriaService::sincronizar()`), então não há log "ExecucaoVistoria #..."
        // nesta trilha — o prefixo ainda assim é incluído na busca pelo service (verificado
        // à parte em `VistoriaAuditoriaControllerTest`, que sincroniza de verdade).
        self::assertTrue($contemPrefixo('Documento #'));
        self::assertTrue($contemPrefixo('Assinatura #'));
        self::assertTrue($contemPrefixo('ProcessoSancionatorio #'));

        // Ordem cronológica.
        /** @var list<\Illuminate\Support\Carbon> $datas */
        $datas = $trilha->pluck('created_at')->all();
        $ordenadas = $datas;
        usort($ordenadas, fn ($a, $b) => $a <=> $b);
        self::assertSame($datas, $ordenadas);
    }

    public function test_trilha_nao_inclui_entradas_de_outra_execucao(): void
    {
        $tenant = $this->criarTenant();

        [$trilhaA, $totalLogsNoTenant] = $this->noTenant($tenant, function () use ($tenant) {
            [$execucaoA] = $this->montarExecucao($tenant);
            [$execucaoB] = $this->montarExecucao($tenant);

            app(DocumentoService::class)->emitirDocumento($execucaoA, Documento::TIPO_AUTO_INFRACAO, []);
            app(DocumentoService::class)->emitirDocumento($execucaoB, Documento::TIPO_NOTIFICACAO, []);

            $trilhaA = app(AuditoriaVistoriaService::class)->obterTrilha($execucaoA);

            return [$trilhaA, \App\Models\AuditLog::where('module', 'vistoria')->count()];
        });

        self::assertGreaterThan($trilhaA->count(), $totalLogsNoTenant);
        self::assertTrue($trilhaA->every(fn ($log) => ! str_contains($log->resource, 'notificacao')));
    }

    public function test_trilha_registra_coordenadas_geograficas_da_assinatura(): void
    {
        $tenant = $this->criarTenant();

        $logAssinatura = $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, []);
            app(AssinaturaService::class)->sincronizarAssinatura($documento, (string) Str::uuid(), [
                'imagem_base64' => 'data:image/png;base64,' . self::PNG_1X1_BASE64,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);

            return app(AuditoriaVistoriaService::class)->obterTrilha($execucao)
                ->first(fn ($log) => str_starts_with($log->resource, 'Assinatura #'));
        });

        self::assertNotNull($logAssinatura);
        self::assertEqualsWithDelta(-25.4284, (float) $logAssinatura->after['latitude'], 0.0001);
        self::assertEqualsWithDelta(-49.2733, (float) $logAssinatura->after['longitude'], 0.0001);
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
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);

        return [$execucao, $fiscal];
    }
}
