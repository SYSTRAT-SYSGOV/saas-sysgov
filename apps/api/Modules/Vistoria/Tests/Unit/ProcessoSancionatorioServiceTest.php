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
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class ProcessoSancionatorioServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_abre_automaticamente_ao_emitir_auto_de_infracao_com_prazo_de_defesa(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucao();

            return app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, [])->processoSancionatorio;
        });

        self::assertNotNull($processo);
        self::assertSame(ProcessoSancionatorio::STATUS_ABERTO, $processo->status);
        self::assertSame(now()->addDays(10)->toDateString(), $processo->prazo_defesa_limite->toDateString());
    }

    public function test_nao_abre_processo_para_outros_tipos_de_documento(): void
    {
        $tenant = $this->criarTenant();

        $documento = $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucao();

            return app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_NOTIFICACAO, []);
        });

        self::assertNull($documento->processoSancionatorio);
    }

    public function test_abertura_e_idempotente_por_documento(): void
    {
        $tenant = $this->criarTenant();

        $total = $this->noTenant($tenant, function () {
            $documento = app(DocumentoService::class)->emitirDocumento($this->montarExecucao()[0], Documento::TIPO_AUTO_INFRACAO, []);
            $service = app(ProcessoSancionatorioService::class);

            $primeiro = $service->abrirAutomaticamente($documento);
            $segundo = $service->abrirAutomaticamente($documento);

            self::assertSame($primeiro->id, $segundo->id);

            return ProcessoSancionatorio::query()->count();
        });

        self::assertSame(1, $total);
    }

    public function test_apresenta_defesa_move_para_em_defesa(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () {
            $processo = $this->montarProcesso();

            return app(ProcessoSancionatorioService::class)->apresentarDefesa($processo, 'Minha defesa: não houve irregularidade.');
        });

        self::assertSame(ProcessoSancionatorio::STATUS_EM_DEFESA, $processo->status);
        self::assertNotNull($processo->defesa_apresentada_em);
    }

    public function test_apresentar_defesa_lanca_exception_quando_texto_vazio(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () {
            $processo = $this->montarProcesso();
            app(ProcessoSancionatorioService::class)->apresentarDefesa($processo, '   ');
        });
    }

    public function test_apresentar_defesa_lanca_exception_quando_processo_nao_esta_aberto(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () {
            $processo = $this->montarProcesso();
            $service = app(ProcessoSancionatorioService::class);
            $service->apresentarDefesa($processo, 'Defesa');
            $service->apresentarDefesa($processo->fresh(), 'Segunda defesa');
        });
    }

    public function test_julga_procedente_aplica_penalidade_e_abre_prazo_de_recurso(): void
    {
        $tenant = $this->criarTenant();

        [$processo, $chefe] = $this->noTenant($tenant, function () use ($tenant) {
            $processo = $this->montarProcesso();
            app(ProcessoSancionatorioService::class)->apresentarDefesa($processo, 'Defesa apresentada');
            $chefe = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

            $processo = app(ProcessoSancionatorioService::class)->julgar(
                $processo->fresh(),
                ProcessoSancionatorio::DECISAO_PROCEDENTE,
                'Irregularidade confirmada em vistoria.',
                $chefe,
                150_000,
            );

            return [$processo, $chefe];
        });

        self::assertSame(ProcessoSancionatorio::STATUS_PENALIDADE_APLICADA, $processo->status);
        self::assertSame(150_000, $processo->penalidade_centavos);
        self::assertSame($chefe->id, $processo->julgado_por);
        self::assertNotNull($processo->prazo_recurso_limite);
    }

    public function test_julga_improcedente_arquiva_sem_penalidade(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () use ($tenant) {
            $service = app(ProcessoSancionatorioService::class);
            $processo = $service->apresentarDefesa($this->montarProcesso(), 'Defesa apresentada.');
            $chefe = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

            return $service->julgar(
                $processo,
                ProcessoSancionatorio::DECISAO_IMPROCEDENTE,
                'Não há provas suficientes da irregularidade.',
                $chefe,
            );
        });

        self::assertSame(ProcessoSancionatorio::STATUS_ARQUIVADO, $processo->status);
        self::assertNull($processo->penalidade_centavos);
        self::assertNull($processo->prazo_recurso_limite);
    }

    public function test_julgar_procedente_sem_penalidade_lanca_exception(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () use ($tenant) {
            $service = app(ProcessoSancionatorioService::class);
            $processo = $service->apresentarDefesa($this->montarProcesso(), 'Defesa apresentada.');
            $chefe = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');
            $service->julgar($processo, ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação', $chefe);
        });
    }

    public function test_julgar_decisao_invalida_lanca_exception(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () use ($tenant) {
            $processo = $this->montarProcesso();
            $chefe = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');
            app(ProcessoSancionatorioService::class)->julgar($processo, 'decisao_inexistente', 'Fundamentação', $chefe);
        });
    }

    public function test_fluxo_completo_de_recurso_ate_conclusao(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () use ($tenant) {
            $chefe = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');
            $service = app(ProcessoSancionatorioService::class);

            $processo = $service->apresentarDefesa($this->montarProcesso(), 'Defesa apresentada.');
            $processo = $service->julgar($processo, ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Procedente', $chefe, 50_000);
            $processo = $service->apresentarRecurso($processo, 'Recorro da decisão.');

            return $service->julgarRecurso($processo, ProcessoSancionatorio::RECURSO_IMPROVIDO, 'Mantida a penalidade.', $chefe);
        });

        self::assertSame(ProcessoSancionatorio::STATUS_CONCLUIDO, $processo->status);
        self::assertSame(ProcessoSancionatorio::RECURSO_IMPROVIDO, $processo->recurso_decisao);
        self::assertNotNull($processo->concluido_em);
    }

    public function test_apresentar_recurso_lanca_exception_fora_de_penalidade_aplicada(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () {
            $processo = $this->montarProcesso();
            app(ProcessoSancionatorioService::class)->apresentarRecurso($processo, 'Recurso');
        });
    }

    public function test_registrar_revelia_da_defesa_move_aberto_para_em_julgamento(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () {
            $processo = $this->montarProcesso();

            return app(ProcessoSancionatorioService::class)->registrarRevelia($processo);
        });

        self::assertSame(ProcessoSancionatorio::STATUS_EM_JULGAMENTO, $processo->status);
    }

    public function test_registrar_revelia_do_recurso_conclui_processo(): void
    {
        $tenant = $this->criarTenant();

        $processo = $this->noTenant($tenant, function () use ($tenant) {
            $chefe = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');
            $service = app(ProcessoSancionatorioService::class);

            // Revelia da defesa: aberto -> em_julgamento (outro caminho até o julgamento).
            $processo = $service->registrarRevelia($this->montarProcesso());
            $processo = $service->julgar($processo, ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Procedente', $chefe, 20_000);

            return $service->registrarRevelia($processo);
        });

        self::assertSame(ProcessoSancionatorio::STATUS_CONCLUIDO, $processo->status);
        self::assertNull($processo->recurso_decisao);
        self::assertNotNull($processo->concluido_em);
    }

    private function montarProcesso(): ProcessoSancionatorio
    {
        [$execucao] = $this->montarExecucao();
        $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, []);

        return $documento->processoSancionatorio;
    }

    /**
     * @return array{0: ExecucaoVistoria, 1: User}
     */
    private function montarExecucao(): array
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

        return [$execucao, $fiscal];
    }
}
