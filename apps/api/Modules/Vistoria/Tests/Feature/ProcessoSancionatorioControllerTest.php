<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

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
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class ProcessoSancionatorioControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->tenant = $this->criarTenant();
    }

    public function test_fiscal_da_propria_execucao_visualiza_e_apresenta_defesa(): void
    {
        [$processo, $fiscal] = $this->montarProcesso();

        $this->como($fiscal, $this->tenant)->getJson("/api/vistoria/processos-sancionatorios/{$processo->id}")
            ->assertStatus(200)->assertJsonPath('status', ProcessoSancionatorio::STATUS_ABERTO);

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/defesa", [
            'texto' => 'Defesa apresentada pelo autuado.',
        ])->assertStatus(200)->assertJsonPath('status', ProcessoSancionatorio::STATUS_EM_DEFESA);
    }

    public function test_fiscal_de_outra_execucao_e_recusado(): void
    {
        [$processo] = $this->montarProcesso();
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');

        $this->como($outroFiscal, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/defesa", [
            'texto' => 'Tentativa indevida.',
        ])->assertStatus(403);
    }

    public function test_fiscal_sem_permissao_de_chefia_nao_pode_julgar(): void
    {
        [$processo, $fiscal] = $this->montarProcesso();

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/julgamento", [
            'decisao' => 'procedente',
            'fundamentacao' => 'Fundamentação',
            'penalidade_centavos' => 10_000,
        ])->assertStatus(403);
    }

    public function test_chefia_julga_procedente_com_penalidade(): void
    {
        [$processo, $fiscal] = $this->montarProcesso();
        $chefe = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/defesa", [
            'texto' => 'Defesa apresentada.',
        ])->assertStatus(200);

        $response = $this->como($chefe, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/julgamento", [
            'decisao' => 'procedente',
            'fundamentacao' => 'Irregularidade confirmada.',
            'penalidade_centavos' => 75_000,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', ProcessoSancionatorio::STATUS_PENALIDADE_APLICADA)
            ->assertJsonPath('penalidade_centavos', 75_000);
    }

    public function test_recusa_decisao_invalida_com_422(): void
    {
        [$processo] = $this->montarProcesso();
        $chefe = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

        $this->como($chefe, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/julgamento", [
            'decisao' => 'decisao_inexistente',
            'fundamentacao' => 'Fundamentação',
        ])->assertStatus(422);
    }

    public function test_fluxo_completo_de_recurso_via_http(): void
    {
        [$processo, $fiscal] = $this->montarProcesso();
        $chefe = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/defesa", [
            'texto' => 'Defesa apresentada.',
        ])->assertStatus(200);

        $this->como($chefe, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/julgamento", [
            'decisao' => 'procedente',
            'fundamentacao' => 'Procedente',
            'penalidade_centavos' => 30_000,
        ])->assertStatus(200);

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/recurso", [
            'texto' => 'Recorro da penalidade aplicada.',
        ])->assertStatus(200)->assertJsonPath('status', ProcessoSancionatorio::STATUS_EM_RECURSO);

        $this->como($chefe, $this->tenant)->postJson("/api/vistoria/processos-sancionatorios/{$processo->id}/julgamento-recurso", [
            'decisao' => 'improvido',
            'fundamentacao' => 'Mantida a penalidade.',
        ])->assertStatus(200)->assertJsonPath('status', ProcessoSancionatorio::STATUS_CONCLUIDO);
    }

    /**
     * @return array{0: ProcessoSancionatorio, 1: User}
     */
    private function montarProcesso(): array
    {
        return $this->noTenant($this->tenant, function () {
            $proprietario = Pessoa::factory()->create(['nome' => 'Proprietário Teste']);
            $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda Teste',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
            $fiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Fiscal');
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
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, []);

            return [$documento->processoSancionatorio, $fiscal];
        });
    }
}
