<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
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
}
