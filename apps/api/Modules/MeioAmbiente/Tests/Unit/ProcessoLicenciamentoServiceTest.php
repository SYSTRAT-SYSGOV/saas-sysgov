<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\MeioAmbiente\Models\AlertaLicenciamento;
use Modules\MeioAmbiente\Models\Condicionante;
use Modules\MeioAmbiente\Models\DocumentoLicenciamento;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Models\VistoriaTecnicaLicenciamento;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\ProcessoLicenciamentoService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Tests\TestCase;

final class ProcessoLicenciamentoServiceTest extends TestCase
{
    use RefreshDatabase;

    private ProcessoLicenciamentoService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(ProcessoLicenciamentoService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
    }

    private function criarEmpreendimentoComResponsavel(string $porte = Empreendimento::PORTE_MEDIO): Empreendimento
    {
        $empreendimento = app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => $porte,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        app(EmpreendimentoService::class)->vincularResponsavelTecnico($empreendimento, [
            'nome' => 'Engenheira Responsável',
            'registro_profissional' => 'CREA-PR 123456',
            'tipo_registro' => ResponsavelTecnico::TIPO_CREA,
        ]);

        return $empreendimento->refresh();
    }

    public function test_abre_processo_de_licenca_previa_com_numeracao_sequencial(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();

        $processo = $this->service->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);

        self::assertSame(ProcessoLicenciamento::STATUS_EM_ANALISE, $processo->status);
        self::assertSame(1, $processo->numero_sequencial);
        self::assertStringStartsWith('LP/' . now()->year . '/', $processo->numero);
    }

    public function test_renovacao_sem_licenca_de_operacao_e_rejeitada(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();

        $this->expectException(RegraNegocioException::class);

        $this->service->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_RENOVACAO);
    }

    public function test_renovacao_com_prazo_expirado_e_rejeitada(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();

        $lo = ProcessoLicenciamento::create([
            'empreendimento_id' => $empreendimento->id,
            'fase' => ProcessoLicenciamento::FASE_LO,
            'numero' => 'LO/2024/0001',
            'numero_sequencial' => 1,
            'exercicio' => 2024,
            'status' => ProcessoLicenciamento::STATUS_DEFERIDO,
            'data_deferimento' => Carbon::now()->subDays(400),
            'validade_em' => Carbon::now()->subDays(200),
        ]);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Prazo de renovação expirado — novo licenciamento completo é necessário.');

        $this->service->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_RENOVACAO);
    }

    public function test_condicionante_vencida_bloqueia_fase_subsequente(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();

        $li = ProcessoLicenciamento::create([
            'empreendimento_id' => $empreendimento->id,
            'fase' => ProcessoLicenciamento::FASE_LI,
            'numero' => 'LI/2026/0001',
            'numero_sequencial' => 1,
            'exercicio' => 2026,
            'status' => ProcessoLicenciamento::STATUS_DEFERIDO,
            'data_deferimento' => Carbon::now()->subDays(30),
            'validade_em' => Carbon::now()->addDays(300),
        ]);
        Condicionante::create([
            'processo_licenciamento_id' => $li->id,
            'descricao' => 'Apresentar plano de monitoramento',
            'prazo' => Carbon::now()->subDays(5),
            'situacao' => Condicionante::SITUACAO_PENDENTE,
        ]);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Condicionante pendente impede avanço de fase.');

        $this->service->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LO);
    }

    public function test_deferimento_bloqueado_por_documento_obrigatorio_pendente(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel(Empreendimento::PORTE_GRANDE);
        $processo = $this->service->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Documento obrigatório pendente: EIA/RIMA');

        $this->service->deferir($processo);
    }

    public function test_anexacao_de_eia_rima_libera_deferimento(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel(Empreendimento::PORTE_GRANDE);
        $processo = $this->service->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);

        $this->service->anexarDocumento($processo, DocumentoLicenciamento::TIPO_EIA_RIMA);

        $deferido = $this->service->deferir($processo);

        self::assertSame(ProcessoLicenciamento::STATUS_DEFERIDO, $deferido->status);
        self::assertNotNull($deferido->validade_em);
    }

    public function test_vistoria_desfavoravel_impede_deferimento_automatico(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();
        $processo = $this->service->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);

        $this->service->registrarVistoriaTecnica($processo, ['resultado' => VistoriaTecnicaLicenciamento::RESULTADO_DESFAVORAVEL]);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Parecer técnico desfavorável — deferimento requer justificativa expressa.');

        $this->service->deferir($processo);
    }

    public function test_deferimento_com_justificativa_supera_parecer_desfavoravel(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();
        $processo = $this->service->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);
        $this->service->registrarVistoriaTecnica($processo, ['resultado' => VistoriaTecnicaLicenciamento::RESULTADO_DESFAVORAVEL]);

        $deferido = $this->service->deferir($processo, 'Divergência sanada em complementação técnica.');

        self::assertSame(ProcessoLicenciamento::STATUS_DEFERIDO, $deferido->status);
    }

    public function test_alerta_gerado_30_dias_antes_do_vencimento(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();
        $processo = ProcessoLicenciamento::create([
            'empreendimento_id' => $empreendimento->id,
            'fase' => ProcessoLicenciamento::FASE_LO,
            'numero' => 'LO/2026/0001',
            'numero_sequencial' => 1,
            'exercicio' => 2026,
            'status' => ProcessoLicenciamento::STATUS_DEFERIDO,
            'data_deferimento' => Carbon::now()->subDays(700),
            'validade_em' => Carbon::now()->addDays(30),
        ]);

        $gerados = $this->service->verificarPrazos();

        self::assertSame(1, $gerados);
        self::assertSame(1, AlertaLicenciamento::where('processo_licenciamento_id', $processo->id)->where('dias_para_vencimento', 30)->count());
    }

    public function test_licenca_vencida_sem_renovacao_e_irregular(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();
        ProcessoLicenciamento::create([
            'empreendimento_id' => $empreendimento->id,
            'fase' => ProcessoLicenciamento::FASE_LO,
            'numero' => 'LO/2024/0001',
            'numero_sequencial' => 1,
            'exercicio' => 2024,
            'status' => ProcessoLicenciamento::STATUS_DEFERIDO,
            'data_deferimento' => Carbon::now()->subDays(400),
            'validade_em' => Carbon::now()->subDays(10),
        ]);

        self::assertTrue($this->service->empreendimentoEstaIrregular($empreendimento));
    }

    public function test_licenca_vigente_nao_e_irregular(): void
    {
        $empreendimento = $this->criarEmpreendimentoComResponsavel();
        ProcessoLicenciamento::create([
            'empreendimento_id' => $empreendimento->id,
            'fase' => ProcessoLicenciamento::FASE_LO,
            'numero' => 'LO/2026/0001',
            'numero_sequencial' => 1,
            'exercicio' => 2026,
            'status' => ProcessoLicenciamento::STATUS_DEFERIDO,
            'data_deferimento' => Carbon::now()->subDays(10),
            'validade_em' => Carbon::now()->addDays(300),
        ]);

        self::assertFalse($this->service->empreendimentoEstaIrregular($empreendimento));
    }
}
