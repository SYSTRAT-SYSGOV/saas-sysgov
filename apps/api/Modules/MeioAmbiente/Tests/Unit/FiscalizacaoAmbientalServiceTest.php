<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Tests\TestCase;

final class FiscalizacaoAmbientalServiceTest extends TestCase
{
    use RefreshDatabase;

    private FiscalizacaoAmbientalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(FiscalizacaoAmbientalService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $this->seedTabelaMulta();
    }

    private function seedTabelaMulta(): void
    {
        (new \Modules\MeioAmbiente\Database\Seeders\TabelaMultaAmbientalSeeder())->run();
    }

    private function criarEmpreendimento(): Empreendimento
    {
        return app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Agropecuária Exemplo Ltda',
            'atividade' => 'agroindustria',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
    }

    /** Monta uma execução de vistoria concluída (caminho real do módulo Vistoria). */
    private function criarExecucaoVistoriaConcluida(): ExecucaoVistoria
    {
        $proprietario = Pessoa::factory()->create();
        $orgUnit = OrgUnit::create(['name' => 'Secretaria de Meio Ambiente', 'code' => 'SMA-' . uniqid()]);
        $fiscal = User::create(['name' => 'Fiscal Ambiental', 'email' => 'fiscal-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $local = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Fiscalizada',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
        $ordem = OrdemServico::create([
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'data_prevista' => now()->addDay()->toDateString(),
        ]);

        return ExecucaoVistoria::create([
            'ordem_servico_id' => $ordem->id,
            'fiscal_id' => $fiscal->id,
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);
    }

    public function test_emite_auto_de_infracao_por_desmatamento(): void
    {
        $execucao = $this->criarExecucaoVistoriaConcluida();
        $empreendimento = $this->criarEmpreendimento();

        $auto = $this->service->emitirAutoInfracaoAmbiental($execucao, $empreendimento, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
            'area_afetada_ha' => 2.5,
        ]);

        self::assertSame(AutoInfracaoAmbiental::TIPO_DESMATAMENTO, $auto->tipo_infracao);
        self::assertSame('2.50', (string) $auto->area_afetada_ha);
        self::assertSame('auto_infracao', $auto->documento->tipo);
    }

    public function test_calcula_multa_proporcional_a_area(): void
    {
        $empreendimento = $this->criarEmpreendimento();
        $auto = new AutoInfracaoAmbiental([
            'empreendimento_id' => $empreendimento->id,
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
            'area_afetada_ha' => 2,
            'reincidente' => false,
        ]);

        $valorSugerido = $this->service->calcularMultaSugerida($auto);

        self::assertSame(1_000_000, $valorSugerido);
    }

    public function test_valor_sugerido_e_editavel_pelo_julgador(): void
    {
        $execucao = $this->criarExecucaoVistoriaConcluida();
        $empreendimento = $this->criarEmpreendimento();

        $auto = $this->service->emitirAutoInfracaoAmbiental($execucao, $empreendimento, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
            'area_afetada_ha' => 2,
        ]);
        self::assertSame(1_000_000, $auto->valor_multa_sugerido_centavos);

        $processo = $auto->documento->processoSancionatorio;
        self::assertNotNull($processo);

        $processos = app(ProcessoSancionatorioService::class);
        $processos->apresentarDefesa($processo, 'Defesa apresentada pelo autuado.');
        $julgador = User::create(['name' => 'Chefia', 'email' => 'chefia-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $processoJulgado = $processos->julgar($processo->refresh(), ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação do julgamento.', $julgador, 750_000);

        self::assertSame(750_000, $processoJulgado->penalidade_centavos);
        self::assertSame(1_000_000, $auto->refresh()->valor_multa_sugerido_centavos, 'Valor sugerido permanece como referência histórica.');
    }

    public function test_agravante_de_reincidencia_para_segunda_infracao_do_mesmo_tipo(): void
    {
        $empreendimento = $this->criarEmpreendimento();
        $processos = app(ProcessoSancionatorioService::class);
        $julgador = User::create(['name' => 'Chefia', 'email' => 'chefia-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);

        $primeiraExecucao = $this->criarExecucaoVistoriaConcluida();
        $primeiroAuto = $this->service->emitirAutoInfracaoAmbiental($primeiraExecucao, $empreendimento, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_POLUICAO_HIDRICA,
        ]);
        self::assertFalse($primeiroAuto->reincidente);

        $primeiroProcesso = $primeiroAuto->documento->processoSancionatorio;
        $processos->apresentarDefesa($primeiroProcesso, 'Defesa.');
        $processoJulgado = $processos->julgar($primeiroProcesso->refresh(), ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação.', $julgador, 1_000_000);
        // Simula penalidade aplicada há 10 meses (dentro da janela de reincidência de 24 meses).
        $processoJulgado->update(['julgado_em' => Carbon::now()->subMonths(10)]);

        $segundaExecucao = $this->criarExecucaoVistoriaConcluida();
        $segundoAuto = $this->service->emitirAutoInfracaoAmbiental($segundaExecucao, $empreendimento, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_POLUICAO_HIDRICA,
        ]);

        self::assertTrue($segundoAuto->reincidente);
        // Base fixa R$ 10.000,00 (1_000_000) + 50% de agravante = R$ 15.000,00.
        self::assertSame(1_500_000, $segundoAuto->valor_multa_sugerido_centavos);
    }

    public function test_parcela_multa_aplicada_em_6_vezes(): void
    {
        [, $processoJulgado] = $this->abrirEJulgarProcesso(1_000_000);

        $parcelamento = $this->service->parcelar($processoJulgado, 6);

        self::assertSame(6, $parcelamento->parcelas()->count());
        self::assertSame(1_000_000, (int) $parcelamento->parcelas()->sum('valor_centavos'));
    }

    public function test_parcelamento_acima_do_limite_e_rejeitado(): void
    {
        [, $processoJulgado] = $this->abrirEJulgarProcesso(1_000_000);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Número de parcelas excede o limite permitido.');

        $this->service->parcelar($processoJulgado, 24);
    }

    public function test_defesa_e_recurso_seguem_a_mesma_maquina_de_estados_do_vistoria(): void
    {
        [$auto, ] = $this->abrirEJulgarProcesso(1_000_000);
        $processo = $auto->documento->processoSancionatorio->refresh();

        self::assertSame(ProcessoSancionatorio::STATUS_PENALIDADE_APLICADA, $processo->status);

        $processos = app(ProcessoSancionatorioService::class);
        $processos->apresentarRecurso($processo, 'Recurso contra a penalidade aplicada.');
        self::assertSame(ProcessoSancionatorio::STATUS_EM_RECURSO, $processo->refresh()->status);

        $julgador = User::create(['name' => 'Chefia Recurso', 'email' => 'chefia-recurso-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $processos->julgarRecurso($processo, ProcessoSancionatorio::RECURSO_IMPROVIDO, 'Mantida a penalidade.', $julgador);

        self::assertSame(ProcessoSancionatorio::STATUS_CONCLUIDO, $processo->refresh()->status);
    }

    /** @return array{0: AutoInfracaoAmbiental, 1: ProcessoSancionatorio} */
    private function abrirEJulgarProcesso(int $penalidadeCentavos): array
    {
        $execucao = $this->criarExecucaoVistoriaConcluida();
        $empreendimento = $this->criarEmpreendimento();
        $auto = $this->service->emitirAutoInfracaoAmbiental($execucao, $empreendimento, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
            'area_afetada_ha' => 2,
        ]);

        $processo = $auto->documento->processoSancionatorio;
        $processos = app(ProcessoSancionatorioService::class);
        $processos->apresentarDefesa($processo, 'Defesa apresentada.');
        $julgador = User::create(['name' => 'Chefia', 'email' => 'chefia-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $processoJulgado = $processos->julgar($processo->refresh(), ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação.', $julgador, $penalidadeCentavos);

        return [$auto, $processoJulgado];
    }
}
