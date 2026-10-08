<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Jobs\VerificarPrazosProcessoJob;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class VerificarPrazosProcessoJobTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_avanca_processo_com_prazo_de_defesa_vencido_sem_manifestacao(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () {
            $processo = $this->montarProcesso();
            $processo->update(['prazo_defesa_limite' => now()->subDays(2)->toDateString()]);

            return $processo;
        });

        (new VerificarPrazosProcessoJob())->handle(app(ProcessoSancionatorioService::class));

        self::assertSame(ProcessoSancionatorio::STATUS_EM_JULGAMENTO, $processo->fresh()->status);
    }

    public function test_nao_avanca_processo_dentro_do_prazo(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, fn () => $this->montarProcesso());

        (new VerificarPrazosProcessoJob())->handle(app(ProcessoSancionatorioService::class));

        self::assertSame(ProcessoSancionatorio::STATUS_ABERTO, $processo->fresh()->status);
    }

    public function test_nao_avanca_processo_com_defesa_ja_apresentada(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () {
            $processo = $this->montarProcesso();
            $service = app(ProcessoSancionatorioService::class);
            $processo = $service->apresentarDefesa($processo, 'Defesa apresentada em dia.');
            $processo->update(['prazo_defesa_limite' => now()->subDays(2)->toDateString()]);

            return $processo;
        });

        (new VerificarPrazosProcessoJob())->handle(app(ProcessoSancionatorioService::class));

        self::assertSame(ProcessoSancionatorio::STATUS_EM_DEFESA, $processo->fresh()->status);
    }

    public function test_conclui_processo_com_prazo_de_recurso_vencido_sem_manifestacao(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () use ($tenant) {
            $service = app(ProcessoSancionatorioService::class);
            $chefe = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');
            $processo = $service->apresentarDefesa($this->montarProcesso(), 'Defesa apresentada.');
            $processo = $service->julgar($processo, ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Procedente', $chefe, 40_000);
            $processo->update(['prazo_recurso_limite' => now()->subDays(2)->toDateString()]);

            return $processo;
        });

        (new VerificarPrazosProcessoJob())->handle(app(ProcessoSancionatorioService::class));

        $processo = $processo->fresh();
        self::assertSame(ProcessoSancionatorio::STATUS_CONCLUIDO, $processo->status);
        self::assertNull($processo->recurso_decisao);
        self::assertNotNull($processo->concluido_em);
    }

    private function montarProcesso(): ProcessoSancionatorio
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

        return $documento->processoSancionatorio;
    }
}
