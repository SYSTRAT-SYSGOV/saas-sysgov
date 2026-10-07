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
use Modules\Vistoria\Models\Reinspecao;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\PainelGerencialService;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Modules\Vistoria\Services\ReinspecaoService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class PainelGerencialServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_mapa_retorna_featurecollection_com_pendentes_e_realizadas_no_periodo(): void
    {
        $tenant = $this->criarTenant();

        $features = $this->noTenant($tenant, function () {
            $local = $this->montarLocal();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria', 'code' => 'SEC-' . uniqid()]);

            OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_AGENDADA,
                'data_prevista' => now()->toDateString(),
            ]);
            OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_CONCLUIDA,
                'data_prevista' => now()->toDateString(),
            ]);
            // Cancelada: não entra no mapa.
            OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_CANCELADA,
                'data_prevista' => now()->toDateString(),
            ]);
            // Fora do período: não entra no mapa.
            OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_AGENDADA,
                'data_prevista' => now()->subDays(90)->toDateString(),
            ]);


            return app(PainelGerencialService::class)->mapa([])['features'];
        });

        self::assertCount(2, $features);
        $situacoes = array_column(array_column($features, 'properties'), 'situacao');
        sort($situacoes);
        self::assertSame(['pendente', 'realizada'], $situacoes);
        self::assertSame('Point', $features[0]['geometry']['type']);
    }

    public function test_produtividade_conta_execucoes_sincronizadas_por_fiscal_no_periodo(): void
    {
        $tenant = $this->criarTenant();

        $resultado = $this->noTenant($tenant, function () use ($tenant) {
            $local = $this->montarLocal();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria', 'code' => 'SEC-' . uniqid()]);
            $fiscalA = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal A');
            $fiscalB = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal B');

            $this->montarExecucaoConcluida($local, $orgUnit, $fiscalA, now());
            $this->montarExecucaoConcluida($local, $orgUnit, $fiscalA, now());
            $this->montarExecucaoConcluida($local, $orgUnit, $fiscalB, now());
            // Fora do período: não conta.
            $this->montarExecucaoConcluida($local, $orgUnit, $fiscalB, now()->subDays(90));

            return app(PainelGerencialService::class)->produtividade([]);
        });

        /** @var list<array{fiscal_id: int, fiscal_nome: string|null, total_concluidas: int}> $fiscais */
        $fiscais = $resultado['fiscais'];
        $porFiscal = collect($fiscais)->keyBy('fiscal_id');
        self::assertSame(2, $porFiscal->firstWhere('fiscal_nome', 'Fiscal A')['total_concluidas']);
        self::assertSame(1, $porFiscal->firstWhere('fiscal_nome', 'Fiscal B')['total_concluidas']);
    }

    public function test_indicadores_calcula_autuacoes_por_tipo_taxa_de_regularizacao_e_tempo_medio(): void
    {
        $tenant = $this->criarTenant();

        $indicadores = $this->noTenant($tenant, function () use ($tenant) {
            $local = $this->montarLocal();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria', 'code' => 'SEC-' . uniqid()]);
            $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');
            $chefe = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

            // Dois autos de infração com prazo + processo levado à conclusão (procedente, recurso improvido).
            foreach ([5, 15] as $diasAteConclusao) {
                $processos = app(ProcessoSancionatorioService::class);
                $execucao = $this->criarExecucao($local, $orgUnit, $fiscal, now()->subDays($diasAteConclusao));
                $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, ['prazo_dias' => 10]);
                $processo = $processos->apresentarDefesa($documento->processoSancionatorio, 'Defesa');
                $processo = $processos->julgar($processo, 'procedente', 'Procedente', $chefe, 10_000);
                $processo = $processos->apresentarRecurso($processo, 'Recurso');
                $processos->julgarRecurso($processo, 'improvido', 'Mantida a penalidade.', $chefe);
            }

            // Uma notificação (conta em autuacoes_por_tipo, mas não abre processo).
            $execucaoNotificacao = $this->criarExecucao($local, $orgUnit, $fiscal, now());
            app(DocumentoService::class)->emitirDocumento($execucaoNotificacao, Documento::TIPO_NOTIFICACAO, []);

            // Reinspeção regularizada e outra não regularizada, ambas constatadas no período.
            $reinspecaoService = app(ReinspecaoService::class);
            $execucaoReg1 = $this->criarExecucao($local, $orgUnit, $fiscal, now());
            $doc1 = app(DocumentoService::class)->emitirDocumento($execucaoReg1, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 5]);
            $reinspecaoService->constatarRegularizacao($doc1->reinspecao, true);

            $execucaoReg2 = $this->criarExecucao($local, $orgUnit, $fiscal, now());
            $doc2 = app(DocumentoService::class)->emitirDocumento($execucaoReg2, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 5]);
            $reinspecaoService->constatarRegularizacao($doc2->reinspecao, false);

            return app(PainelGerencialService::class)->indicadores([]);
        });

        self::assertSame(2, $indicadores['autuacoes_por_tipo'][Documento::TIPO_AUTO_INFRACAO]);
        self::assertSame(1, $indicadores['autuacoes_por_tipo'][Documento::TIPO_NOTIFICACAO]);
        self::assertSame(2, $indicadores['autuacoes_por_tipo'][Documento::TIPO_TERMO_EMBARGO]);
        self::assertSame(0.5, $indicadores['taxa_regularizacao']);
        self::assertSame(10.0, $indicadores['tempo_medio_dias_vistoria_ate_conclusao_processo']);
    }

    public function test_indicadores_usa_cache_dentro_do_ttl(): void
    {
        $tenant = $this->criarTenant();

        [$primeiro, $segundo] = $this->noTenant($tenant, function () use ($tenant) {
            $local = $this->montarLocal();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria', 'code' => 'SEC-' . uniqid()]);
            $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');
            $execucao = $this->criarExecucao($local, $orgUnit, $fiscal, now());

            $service = app(PainelGerencialService::class);
            $primeiro = $service->indicadores([]);

            // Muda o estado subjacente sem passar pelo service — se o resultado
            // mudar na segunda chamada, o cache não está sendo usado.
            Documento::create([
                'execucao_id' => $execucao->id,
                'tipo' => Documento::TIPO_NOTIFICACAO,
                'numero' => 'notificacao/' . uniqid(),
                'numero_sequencial' => 1,
                'exercicio' => (int) now()->year,
            ]);

            $segundo = $service->indicadores([]);

            return [$primeiro, $segundo];
        });

        self::assertSame($primeiro, $segundo);
    }

    private function montarLocal(): LocalFiscalizavel
    {
        $proprietario = Pessoa::factory()->create(['nome' => 'Proprietário Teste']);

        return LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Teste',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
    }

    private function montarExecucaoConcluida(LocalFiscalizavel $local, OrgUnit $orgUnit, User $fiscal, \Illuminate\Support\Carbon $sincronizadoEm): ExecucaoVistoria
    {
        $ordem = OrdemServico::create([
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'status' => OrdemServico::STATUS_CONCLUIDA,
            'data_prevista' => $sincronizadoEm->toDateString(),
        ]);

        return ExecucaoVistoria::create([
            'ordem_servico_id' => $ordem->id,
            'fiscal_id' => $fiscal->id,
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => $sincronizadoEm,
        ]);
    }

    private function criarExecucao(LocalFiscalizavel $local, OrgUnit $orgUnit, User $fiscal, \Illuminate\Support\Carbon $sincronizadoEm): ExecucaoVistoria
    {
        $ordem = OrdemServico::create([
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'data_prevista' => $sincronizadoEm->toDateString(),
        ]);

        return ExecucaoVistoria::create([
            'ordem_servico_id' => $ordem->id,
            'fiscal_id' => $fiscal->id,
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => $sincronizadoEm,
        ]);
    }
}
