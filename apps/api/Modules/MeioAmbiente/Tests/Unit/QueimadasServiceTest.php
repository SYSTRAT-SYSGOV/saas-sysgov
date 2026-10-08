<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\QueimadasService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Tests\TestCase;

final class QueimadasServiceTest extends TestCase
{
    use RefreshDatabase;

    private QueimadasService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(QueimadasService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new \Modules\MeioAmbiente\Database\Seeders\TabelaMultaAmbientalSeeder())->run();
    }

    private function criarExecucaoVistoriaConcluida(): ExecucaoVistoria
    {
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

        return ExecucaoVistoria::create([
            'ordem_servico_id' => $ordem->id, 'fiscal_id' => $fiscal->id, 'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA, 'sincronizado_em' => now(),
        ]);
    }

    public function test_registra_ocorrencia_com_responsavel_identificado(): void
    {
        $pessoa = Pessoa::factory()->create();

        $ocorrencia = $this->service->registrarOcorrencia([
            'data_ocorrencia' => now()->toDateString(),
            'latitude' => -25.4284,
            'longitude' => -49.2733,
            'area_queimada_ha' => 4.2,
            'responsavel_pessoa_id' => $pessoa->id,
        ]);

        self::assertSame(OcorrenciaQueimada::SITUACAO_RESPONSAVEL_IDENTIFICADO, $ocorrencia->situacao);
        self::assertSame($pessoa->id, $ocorrencia->responsavel_pessoa_id);
    }

    public function test_registra_ocorrencia_sem_responsavel_identificado(): void
    {
        $ocorrencia = $this->service->registrarOcorrencia([
            'data_ocorrencia' => now()->toDateString(),
            'latitude' => -25.4284,
            'longitude' => -49.2733,
            'area_queimada_ha' => 4.2,
        ]);

        self::assertNull($ocorrencia->responsavel_pessoa_id);
        self::assertSame(OcorrenciaQueimada::SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO, $ocorrencia->situacao);
    }

    public function test_registra_ocorrencia_sem_imagem_de_satelite_disponivel(): void
    {
        $ocorrencia = $this->service->registrarOcorrencia([
            'data_ocorrencia' => now()->toDateString(),
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        self::assertNull($ocorrencia->referencia_imagem_satelite);
    }

    public function test_abre_auto_de_infracao_automaticamente_ao_identificar_responsavel(): void
    {
        $ocorrencia = $this->service->registrarOcorrencia([
            'data_ocorrencia' => now()->toDateString(),
            'latitude' => -25.4284,
            'longitude' => -49.2733,
            'area_queimada_ha' => 4.2,
        ]);
        self::assertSame(OcorrenciaQueimada::SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO, $ocorrencia->situacao);

        $empreendimento = app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Fazenda Exemplo Ltda',
            'atividade' => 'agropecuaria',
            'porte' => Empreendimento::PORTE_MEDIO,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
        $execucao = $this->criarExecucaoVistoriaConcluida();

        $atualizada = $this->service->vincularResponsavel($ocorrencia, [
            'responsavel_empreendimento_id' => $empreendimento->id,
            'execucao_vistoria_id' => $execucao->id,
        ]);

        self::assertSame(OcorrenciaQueimada::SITUACAO_RESPONSAVEL_IDENTIFICADO, $atualizada->situacao);
        self::assertNotNull($atualizada->auto_infracao_ambiental_id);

        $auto = AutoInfracaoAmbiental::findOrFail($atualizada->auto_infracao_ambiental_id);
        self::assertSame(AutoInfracaoAmbiental::TIPO_QUEIMADA, $auto->tipo_infracao);
        self::assertSame($empreendimento->id, $auto->empreendimento_id);
    }

    public function test_vincular_apenas_pessoa_fisica_nao_abre_auto_de_infracao(): void
    {
        $ocorrencia = $this->service->registrarOcorrencia([
            'data_ocorrencia' => now()->toDateString(),
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
        $pessoa = Pessoa::factory()->create();

        $atualizada = $this->service->vincularResponsavel($ocorrencia, ['responsavel_pessoa_id' => $pessoa->id]);

        self::assertSame(OcorrenciaQueimada::SITUACAO_RESPONSAVEL_IDENTIFICADO, $atualizada->situacao);
        self::assertNull($atualizada->auto_infracao_ambiental_id);
    }
}
