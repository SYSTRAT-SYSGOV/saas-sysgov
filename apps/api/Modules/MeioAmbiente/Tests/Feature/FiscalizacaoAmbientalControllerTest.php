<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ParcelaMulta;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Tests\TestCase;

final class FiscalizacaoAmbientalControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    private Empreendimento $empreendimento;

    private ExecucaoVistoria $execucao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');

        [$this->empreendimento, $this->execucao] = $this->noTenant($this->tenant, function (): array {
            $empreendimento = Empreendimento::create([
                'cnpj' => '12345678000199', 'razao_social' => 'Agropecuária Exemplo Ltda', 'atividade' => 'agroindustria',
                'porte' => Empreendimento::PORTE_GRANDE, 'latitude' => -25.4284, 'longitude' => -49.2733,
            ]);

            $proprietario = Pessoa::factory()->create();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria de Meio Ambiente', 'code' => 'SMA-' . uniqid()]);
            $fiscal = User::create(['name' => 'Fiscal Ambiental', 'email' => 'fiscal-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id, 'nome' => 'Fazenda Fiscalizada',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL, 'latitude' => -25.4284, 'longitude' => -49.2733,
            ]);
            $ordem = OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDay()->toDateString(),
            ]);
            $execucao = ExecucaoVistoria::create([
                'ordem_servico_id' => $ordem->id, 'fiscal_id' => $fiscal->id, 'client_uuid' => (string) Str::uuid(),
                'status' => ExecucaoVistoria::STATUS_SINCRONIZADA, 'sincronizado_em' => now(),
            ]);

            return [$empreendimento, $execucao];
        });
    }

    public function test_fiscal_emite_auto_de_infracao_ambiental_via_api(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $resposta = $this->como($fiscal, $this->tenant)
            ->postJson("/api/meio_ambiente/execucoes-vistoria/{$this->execucao->id}/autos-infracao-ambiental", [
                'empreendimento_id' => $this->empreendimento->id,
                'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
                'area_afetada_ha' => 2.5,
            ]);

        $resposta->assertCreated()->assertJsonPath('tipo_infracao', AutoInfracaoAmbiental::TIPO_DESMATAMENTO);
        self::assertSame(1, AutoInfracaoAmbiental::count());
    }

    public function test_analista_sem_permissao_de_autuar_e_recusado(): void
    {
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');

        $this->como($analista, $this->tenant)
            ->postJson("/api/meio_ambiente/execucoes-vistoria/{$this->execucao->id}/autos-infracao-ambiental", [
                'empreendimento_id' => $this->empreendimento->id,
                'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
                'area_afetada_ha' => 2.5,
            ])
            ->assertForbidden();

        self::assertSame(0, AutoInfracaoAmbiental::count());
    }

    public function test_fiscal_de_outro_tenant_nao_emite_auto_sobre_execucao_alheia(): void
    {
        $outroTenant = $this->criarTenant('prefeitura-b');
        $fiscalB = $this->usuario($outroTenant, ['fiscal_ambiental'], 'Fiscal B');
        // Empreendimento do próprio tenant B — só a execução de vistoria é alheia.
        $empreendimentoB = $this->noTenant($outroTenant, fn () => Empreendimento::create([
            'cnpj' => '98765432000155', 'razao_social' => 'Empresa B Ltda', 'atividade' => 'agroindustria',
            'porte' => Empreendimento::PORTE_GRANDE, 'latitude' => -25.4, 'longitude' => -49.2,
        ]));

        $this->como($fiscalB, $outroTenant)
            ->postJson("/api/meio_ambiente/execucoes-vistoria/{$this->execucao->id}/autos-infracao-ambiental", [
                'empreendimento_id' => $empreendimentoB->id,
                'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
                'area_afetada_ha' => 2.5,
            ])
            ->assertForbidden();

        self::assertSame(0, AutoInfracaoAmbiental::withoutGlobalScopes()->count());
    }

    public function test_fiscal_de_outro_tenant_nao_parcela_nem_baixa_multa_alheia(): void
    {
        [$processo, $parcela] = $this->noTenant($this->tenant, function (): array {
            $auto = app(FiscalizacaoAmbientalService::class)->emitirAutoInfracaoAmbiental($this->execucao, $this->empreendimento, [
                'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO, 'area_afetada_ha' => 1,
            ]);
            $processos = app(ProcessoSancionatorioService::class);
            $processo = $auto->documento->processoSancionatorio;
            $processos->apresentarDefesa($processo, 'Defesa.');
            $julgador = User::create(['name' => 'Chefia', 'email' => 'chefia-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
            $processo = $processos->julgar($processo->refresh(), ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação.', $julgador, 100_000);
            $parcela = app(FiscalizacaoAmbientalService::class)->parcelar($processo, 2)->parcelas()->firstOrFail();

            return [$processo, $parcela];
        });
        $outroTenant = $this->criarTenant('prefeitura-b');
        $fiscalB = $this->usuario($outroTenant, ['fiscal_ambiental'], 'Fiscal B');

        $this->como($fiscalB, $outroTenant)
            ->postJson("/api/meio_ambiente/processos-sancionatorios/{$processo->id}/parcelamento", ['numero_parcelas' => 3])
            ->assertForbidden();
        $this->como($fiscalB, $outroTenant)
            ->postJson("/api/meio_ambiente/parcelas-multa/{$parcela->id}/pagamento")
            ->assertForbidden();

        self::assertFalse(ParcelaMulta::withoutGlobalScopes()->findOrFail($parcela->id)->pago);
    }

    public function test_fiscal_registra_pagamento_de_parcela_via_api(): void
    {
        $parcela = $this->noTenant($this->tenant, function (): ParcelaMulta {
            $auto = app(FiscalizacaoAmbientalService::class)->emitirAutoInfracaoAmbiental($this->execucao, $this->empreendimento, [
                'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO, 'area_afetada_ha' => 1,
            ]);
            $processos = app(ProcessoSancionatorioService::class);
            $processo = $auto->documento->processoSancionatorio;
            $processos->apresentarDefesa($processo, 'Defesa.');
            $julgador = User::create(['name' => 'Chefia', 'email' => 'chefia-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
            $processo = $processos->julgar($processo->refresh(), ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação.', $julgador, 100_000);

            return app(FiscalizacaoAmbientalService::class)->parcelar($processo, 1)->parcelas()->firstOrFail();
        });
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $this->como($fiscal, $this->tenant)
            ->postJson("/api/meio_ambiente/parcelas-multa/{$parcela->id}/pagamento")
            ->assertOk()
            ->assertJsonPath('pago', true);

        $this->como($fiscal, $this->tenant)
            ->postJson("/api/meio_ambiente/parcelas-multa/{$parcela->id}/pagamento")
            ->assertUnprocessable();
    }
}
