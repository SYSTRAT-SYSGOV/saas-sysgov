<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\CompensacaoAmbiental;
use Modules\MeioAmbiente\Models\DestinacaoCompensacao;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Services\CompensacaoAmbientalService;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\ProcessoLicenciamentoService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Tests\TestCase;

final class CompensacaoAmbientalServiceTest extends TestCase
{
    use RefreshDatabase;

    private CompensacaoAmbientalService $compensacoes;

    private ProcessoLicenciamentoService $licenciamento;

    protected function setUp(): void
    {
        parent::setUp();

        $this->compensacoes = app(CompensacaoAmbientalService::class);
        $this->licenciamento = app(ProcessoLicenciamentoService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
    }

    private function criarEmpreendimento(bool $impactoSignificativo, ?int $valorEmpreendimentoCentavos = null): Empreendimento
    {
        $empreendimento = app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_MEDIO,
            'impacto_significativo' => $impactoSignificativo,
            'valor_empreendimento_centavos' => $valorEmpreendimentoCentavos,
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

    public function test_calcula_compensacao_para_empreendimento_de_impacto_significativo(): void
    {
        $empreendimento = $this->criarEmpreendimento(true, 100_000_000);
        $processo = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);

        $this->licenciamento->deferir($processo);

        $compensacao = CompensacaoAmbiental::where('processo_licenciamento_id', $processo->id)->first();
        self::assertNotNull($compensacao);
        self::assertSame(500_000, $compensacao->valor_devido_centavos);
    }

    public function test_empreendimento_sem_impacto_significativo_nao_gera_compensacao(): void
    {
        $empreendimento = $this->criarEmpreendimento(false, 100_000_000);
        $processo = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);

        $this->licenciamento->deferir($processo);

        self::assertSame(0, CompensacaoAmbiental::where('processo_licenciamento_id', $processo->id)->count());
    }

    public function test_pagamento_parcial_reduz_saldo_devedor(): void
    {
        $empreendimento = $this->criarEmpreendimento(true, 100_000_000);
        $processo = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);
        $this->licenciamento->deferir($processo);
        $compensacao = CompensacaoAmbiental::where('processo_licenciamento_id', $processo->id)->firstOrFail();

        $this->compensacoes->registrarPagamento($compensacao, ['valor_centavos' => 200_000]);

        self::assertSame(300_000, $compensacao->saldoDevedorCentavos());
    }

    public function test_licenca_de_operacao_bloqueada_por_saldo_pendente(): void
    {
        $empreendimento = $this->criarEmpreendimento(true, 100_000_000);
        $processoLp = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);
        $this->licenciamento->deferir($processoLp);

        $processoLo = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LO);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Compensação ambiental com saldo pendente impede emissão da licença.');

        $this->licenciamento->deferir($processoLo);
    }

    public function test_licenca_de_operacao_liberada_apos_pagamento_integral(): void
    {
        $empreendimento = $this->criarEmpreendimento(true, 100_000_000);
        $processoLp = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);
        $this->licenciamento->deferir($processoLp);
        $compensacao = CompensacaoAmbiental::where('processo_licenciamento_id', $processoLp->id)->firstOrFail();
        $this->compensacoes->registrarPagamento($compensacao, ['valor_centavos' => 500_000]);

        $processoLo = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LO);
        $deferido = $this->licenciamento->deferir($processoLo);

        self::assertSame(ProcessoLicenciamento::STATUS_DEFERIDO, $deferido->status);
    }

    public function test_destinacao_integral_ao_fundo_municipal(): void
    {
        $empreendimento = $this->criarEmpreendimento(true, 100_000_000);
        $processo = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);
        $this->licenciamento->deferir($processo);
        $compensacao = CompensacaoAmbiental::where('processo_licenciamento_id', $processo->id)->firstOrFail();
        $this->compensacoes->registrarPagamento($compensacao, ['valor_centavos' => 500_000]);

        $this->compensacoes->registrarDestinacao($compensacao, [
            'destino' => DestinacaoCompensacao::DESTINO_FUNDO_MUNICIPAL,
            'valor_centavos' => 500_000,
        ]);

        self::assertSame(500_000, $compensacao->valorDestinadoCentavos());
    }

    public function test_destinacao_acima_do_valor_pago_e_rejeitada(): void
    {
        $empreendimento = $this->criarEmpreendimento(true, 100_000_000);
        $processo = $this->licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);
        $this->licenciamento->deferir($processo);
        $compensacao = CompensacaoAmbiental::where('processo_licenciamento_id', $processo->id)->firstOrFail();
        $this->compensacoes->registrarPagamento($compensacao, ['valor_centavos' => 300_000]);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Destinação não pode exceder o valor pago.');

        $this->compensacoes->registrarDestinacao($compensacao, [
            'destino' => DestinacaoCompensacao::DESTINO_FUNDO_MUNICIPAL,
            'valor_centavos' => 400_000,
        ]);
    }
}
