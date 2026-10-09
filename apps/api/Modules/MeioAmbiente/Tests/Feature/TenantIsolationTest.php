<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Database\Seeders\TabelaMultaAmbientalSeeder;
use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\CompensacaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Models\OutorgaAgua;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Services\AreasProtegidasService;
use Modules\MeioAmbiente\Services\CompensacaoAmbientalService;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Services\ProcessoLicenciamentoService;
use Modules\MeioAmbiente\Services\RecursosHidricosService;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Modules\MeioAmbiente\Tests\Concerns\CriaExecucaoVistoria;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

/**
 * Isolamento multi-tenant (Tenant A x Tenant B) das entidades principais do módulo:
 * nenhum dado de um órgão aparece, é alterado ou pode ser referenciado pelo outro —
 * nem por consulta, nem por ID na URL, nem por ID no corpo da requisição.
 */
final class TenantIsolationTest extends TestCase
{
    use CenarioMeioAmbiente;
    use CriaExecucaoVistoria;
    use RefreshDatabase;

    private Tenant $tenantA;

    private Tenant $tenantB;

    private User $adminB;

    /** @var array<string, int> ids dos registros do tenant A */
    private array $deA = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenantA = $this->criarTenant('prefeitura-a');
        $this->tenantB = $this->criarTenant('prefeitura-b');
        $this->adminB = $this->usuario($this->tenantB, ['admin_meio_ambiente'], 'Admin B');

        $this->deA = $this->popular($this->tenantA, '11111111000111');
        $this->popular($this->tenantB, '22222222000122');
    }

    /** @return array<string, int> */
    private function popular(Tenant $tenant, string $cnpj): array
    {
        return $this->noTenant($tenant, function () use ($cnpj): array {
            (new TabelaMultaAmbientalSeeder())->run();
            $empreendimentos = app(EmpreendimentoService::class);
            $licenciamento = app(ProcessoLicenciamentoService::class);

            $empreendimento = $empreendimentos->criarEmpreendimento([
                'cnpj' => $cnpj, 'razao_social' => "Empresa {$cnpj}", 'atividade' => 'industria',
                'porte' => Empreendimento::PORTE_MEDIO, 'latitude' => -25.4, 'longitude' => -49.2,
                'impacto_significativo' => true, 'valor_empreendimento_centavos' => 50_000_000,
            ]);
            $empreendimentos->vincularResponsavelTecnico($empreendimento, ['nome' => 'Eng.', 'registro_profissional' => 'CREA-1', 'tipo_registro' => ResponsavelTecnico::TIPO_CREA]);
            $processo = $licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);
            $licenciamento->deferir($processo);

            $auto = app(FiscalizacaoAmbientalService::class)->emitirAutoInfracaoAmbiental($this->criarExecucaoVistoriaConcluida(), $empreendimento, [
                'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO, 'area_afetada_ha' => 1,
            ]);
            $area = app(AreasProtegidasService::class)->cadastrarAreaProtegida([
                'tipo' => AreaProtegida::TIPO_APP,
                'geometria' => ['type' => 'Polygon', 'coordinates' => [[[-50, -26], [-49, -26], [-49, -25], [-50, -25], [-50, -26]]]],
            ]);
            $outorga = app(RecursosHidricosService::class)->cadastrarOutorga($empreendimento, [
                'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO, 'vazao_m3_hora' => 5, 'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL,
            ]);

            return [
                'empreendimento' => $empreendimento->id,
                'processo' => $processo->id,
                'auto' => $auto->id,
                'compensacao' => CompensacaoAmbiental::where('processo_licenciamento_id', $processo->id)->value('id'),
                'area' => $area->id,
                'outorga' => $outorga->id,
                'pessoa' => Pessoa::factory()->create()->id,
            ];
        });
    }

    public function test_consultas_de_um_tenant_nunca_retornam_dados_do_outro(): void
    {
        $this->noTenant($this->tenantB, function (): void {
            foreach ([Empreendimento::class, ProcessoLicenciamento::class, AutoInfracaoAmbiental::class, CompensacaoAmbiental::class, AreaProtegida::class, OutorgaAgua::class] as $modelo) {
                self::assertSame(1, $modelo::count(), "{$modelo} deveria ter só o registro do tenant B");
                self::assertSame([$this->tenantB->id], $modelo::pluck('tenant_id')->unique()->values()->all());
            }
        });
    }

    public function test_listagens_via_api_so_trazem_dados_do_proprio_tenant(): void
    {
        $como = fn () => $this->como($this->adminB, $this->tenantB);

        self::assertSame(['22222222000122'], array_column($como()->getJson('/api/meio_ambiente/empreendimentos')->assertOk()->json('data'), 'cnpj'));
        $como()->getJson('/api/meio_ambiente/empreendimentos/mapa')->assertOk()->assertJsonCount(1, 'features');
        $como()->getJson('/api/meio_ambiente/areas-protegidas')->assertOk()->assertJsonCount(1, 'data');
        $como()->getJson('/api/meio_ambiente/areas-protegidas/mapa')->assertOk()->assertJsonCount(1, 'features');
    }

    public function test_registro_de_outro_tenant_nao_e_lido_por_id_na_url(): void
    {
        $como = fn () => $this->como($this->adminB, $this->tenantB);

        $como()->getJson("/api/meio_ambiente/empreendimentos/{$this->deA['empreendimento']}")->assertForbidden();
        $como()->getJson("/api/meio_ambiente/processos-licenciamento/{$this->deA['processo']}")->assertForbidden();
        $como()->getJson("/api/meio_ambiente/autos-infracao-ambiental/{$this->deA['auto']}")->assertForbidden();
        $como()->getJson("/api/meio_ambiente/compensacoes-ambientais/{$this->deA['compensacao']}")->assertForbidden();
        $como()->getJson("/api/meio_ambiente/empreendimentos/{$this->deA['empreendimento']}/areas-protegidas-sobrepostas")->assertForbidden();
    }

    public function test_rotas_aninhadas_em_empreendimento_de_outro_tenant_sao_recusadas(): void
    {
        $empreendimentoA = $this->deA['empreendimento'];
        $como = fn () => $this->como($this->adminB, $this->tenantB);

        foreach (['processos-licenciamento', 'compensacoes-ambientais', 'outorgas-agua', 'licencas-efluente'] as $recurso) {
            $como()->getJson("/api/meio_ambiente/empreendimentos/{$empreendimentoA}/{$recurso}")->assertForbidden();
        }

        $como()->postJson("/api/meio_ambiente/empreendimentos/{$empreendimentoA}/processos-licenciamento", ['fase' => ProcessoLicenciamento::FASE_LI])->assertForbidden();
        $como()->postJson("/api/meio_ambiente/empreendimentos/{$empreendimentoA}/outorgas-agua", [
            'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO, 'vazao_m3_hora' => 1, 'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL,
        ])->assertForbidden();
        $como()->postJson("/api/meio_ambiente/empreendimentos/{$empreendimentoA}/licencas-efluente", ['parametros' => [['parametro' => 'DBO', 'limite_max' => 10]]])->assertForbidden();
        $como()->postJson("/api/meio_ambiente/empreendimentos/{$empreendimentoA}/responsavel-tecnico", [
            'nome' => 'Invasor', 'registro_profissional' => 'X', 'tipo_registro' => ResponsavelTecnico::TIPO_CREA,
        ])->assertForbidden();

        $this->noTenant($this->tenantA, function (): void {
            self::assertSame(1, ProcessoLicenciamento::count());
            self::assertSame(1, OutorgaAgua::count());
        });
    }

    public function test_id_de_outro_tenant_no_corpo_da_requisicao_e_rejeitado(): void
    {
        $como = fn () => $this->como($this->adminB, $this->tenantB);

        $como()->postJson('/api/meio_ambiente/geradores-residuo', [
            'tipo' => GeradorResiduo::TIPO_INDUSTRIAL, 'empreendimento_id' => $this->deA['empreendimento'],
        ])->assertUnprocessable()->assertJsonValidationErrors('empreendimento_id');

        $como()->postJson('/api/meio_ambiente/ocorrencias-queimada', [
            'data_ocorrencia' => now()->toDateString(), 'latitude' => -25.4, 'longitude' => -49.2,
            'responsavel_empreendimento_id' => $this->deA['empreendimento'], 'responsavel_pessoa_id' => $this->deA['pessoa'],
        ])->assertUnprocessable()->assertJsonValidationErrors(['responsavel_empreendimento_id', 'responsavel_pessoa_id']);

        $como()->postJson('/api/meio_ambiente/empreendimentos', [
            'titular_pessoa_id' => $this->deA['pessoa'], 'atividade' => 'comercio', 'porte' => Empreendimento::PORTE_PEQUENO,
            'latitude' => -25.4, 'longitude' => -49.2,
        ])->assertUnprocessable()->assertJsonValidationErrors('titular_pessoa_id');

        $this->noTenant($this->tenantB, fn () => self::assertSame(0, GeradorResiduo::count() + OcorrenciaQueimada::count()));
    }
}
