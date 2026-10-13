<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Database\Seeders\TabelaMultaAmbientalSeeder;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Services\ProcessoLicenciamentoService;
use Modules\MeioAmbiente\Services\QueimadasService;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Modules\MeioAmbiente\Tests\Concerns\CriaExecucaoVistoria;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Tests\TestCase;

final class AuditoriaControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use CriaExecucaoVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $auditor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->auditor = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');
    }

    private function empreendimento(): Empreendimento
    {
        $empreendimento = app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199', 'razao_social' => 'Indústria Exemplo Ltda', 'atividade' => 'industria',
            'porte' => Empreendimento::PORTE_MEDIO, 'latitude' => -25.4, 'longitude' => -49.2,
        ]);
        app(EmpreendimentoService::class)->vincularResponsavelTecnico($empreendimento, ['nome' => 'Eng. Ana', 'registro_profissional' => 'CREA-1', 'tipo_registro' => ResponsavelTecnico::TIPO_CREA]);

        return $empreendimento;
    }

    /** Processo com 2 condicionantes e 1 documento anexado (cenário do spec). */
    private function processoComCondicionantesEDocumento(Tenant $tenant): ProcessoLicenciamento
    {
        return $this->noTenant($tenant, function (): ProcessoLicenciamento {
            $licenciamento = app(ProcessoLicenciamentoService::class);
            $processo = $licenciamento->abrirProcesso($this->empreendimento(), ProcessoLicenciamento::FASE_LP);
            $licenciamento->registrarCondicionante($processo, ['descricao' => 'Monitorar ruído', 'prazo' => now()->addMonth()->toDateString()]);
            $licenciamento->registrarCondicionante($processo, ['descricao' => 'Plantio compensatório', 'prazo' => now()->addMonths(2)->toDateString()]);
            $licenciamento->anexarDocumento($processo, 'outro');

            return $processo;
        });
    }

    public function test_consulta_da_trilha_completa_de_um_processo_de_licenciamento(): void
    {
        $processo = $this->processoComCondicionantesEDocumento($this->tenant);

        // Iscas: recursos que começam com o mesmo texto mas são de outro id ("#1" x "#10").
        $this->noTenant($this->tenant, function () use ($processo): void {
            $condicionanteId = $processo->condicionantes()->value('id');
            app(AuditLogger::class)->record('meio_ambiente', 'isca', "ProcessoLicenciamento #{$processo->id}0");
            app(AuditLogger::class)->record('meio_ambiente', 'isca', "Condicionante #{$condicionanteId}0 (ProcessoLicenciamento #{$processo->id}0)");
        });

        $resposta = $this->como($this->auditor, $this->tenant)
            ->getJson("/api/meio_ambiente/auditoria/processos-licenciamento/{$processo->id}")
            ->assertOk()
            ->assertJsonPath('referencia.numero', $processo->numero);

        self::assertSame([
            'processo_licenciamento.aberto',
            'condicionante.registrada',
            'condicionante.registrada',
            'processo_licenciamento.documento_anexado',
        ], array_column($resposta->json('auditoria'), 'acao'));
    }

    public function test_trilha_do_auto_de_infracao_inclui_vistoria_parcelamento_e_queimada(): void
    {
        $auto = $this->noTenant($this->tenant, function (): AutoInfracaoAmbiental {
            (new TabelaMultaAmbientalSeeder())->run();
            $queimadas = app(QueimadasService::class);
            $ocorrencia = $queimadas->registrarOcorrencia(['data_ocorrencia' => now()->toDateString(), 'latitude' => -25.4, 'longitude' => -49.2, 'area_queimada_ha' => 3]);
            $ocorrencia = $queimadas->vincularResponsavel($ocorrencia, [
                'responsavel_empreendimento_id' => $this->empreendimento()->id,
                'execucao_vistoria_id' => $this->criarExecucaoVistoriaConcluida()->id,
            ]);
            $auto = AutoInfracaoAmbiental::findOrFail($ocorrencia->auto_infracao_ambiental_id);

            $processos = app(ProcessoSancionatorioService::class);
            $processo = $auto->documento->processoSancionatorio;
            $processos->apresentarDefesa($processo, 'Defesa.');
            $processo = $processos->julgar($processo->refresh(), ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação.', $this->auditor, 200_000);
            $fiscalizacao = app(FiscalizacaoAmbientalService::class);
            $fiscalizacao->registrarPagamentoParcela($fiscalizacao->parcelar($processo, 1)->parcelas()->firstOrFail());

            return $auto;
        });

        $resposta = $this->como($this->auditor, $this->tenant)
            ->getJson("/api/meio_ambiente/auditoria/autos-infracao/{$auto->id}")
            ->assertOk();

        /** @var list<array<string, mixed>> $registros */
        $registros = $resposta->json('auditoria');
        $trilha = collect($registros);
        $acoes = $trilha->pluck('acao')->all();
        foreach ([
            'ocorrencia_queimada.registrada',
            'documento.emitido',
            'processo_sancionatorio.aberto',
            'auto_infracao.emitido',
            'ocorrencia_queimada.responsavel_vinculado',
            'processo_sancionatorio.defesa_apresentada',
            'processo_sancionatorio.julgado',
            'multa.parcelada',
            'parcela_multa.paga',
        ] as $acao) {
            self::assertContains($acao, $acoes);
        }
        self::assertEqualsCanonicalizing(['meio_ambiente', 'vistoria'], $trilha->pluck('modulo')->unique()->values()->all());
        // Ordem cronológica: a parcela paga é o último evento da trilha.
        self::assertSame('parcela_multa.paga', $trilha->last()['acao']);
    }

    public function test_usuario_sem_permissao_nao_acessa_a_trilha_consolidada(): void
    {
        $processo = $this->processoComCondicionantesEDocumento($this->tenant);
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');

        $this->como($analista, $this->tenant)
            ->getJson("/api/meio_ambiente/auditoria/processos-licenciamento/{$processo->id}")
            ->assertForbidden();
    }

    public function test_trilha_de_processo_de_outro_tenant_nao_e_acessivel(): void
    {
        $processoAlheio = $this->processoComCondicionantesEDocumento($this->criarTenant('prefeitura-b'));

        $this->como($this->auditor, $this->tenant)
            ->getJson("/api/meio_ambiente/auditoria/processos-licenciamento/{$processoAlheio->id}")
            ->assertForbidden();
    }
}
