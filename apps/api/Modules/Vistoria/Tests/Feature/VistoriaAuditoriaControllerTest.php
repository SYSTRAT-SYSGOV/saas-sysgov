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
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\ExecucaoVistoriaService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class VistoriaAuditoriaControllerTest extends TestCase
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

    public function test_fiscal_dono_da_execucao_e_recusado(): void
    {
        [$execucao, $fiscal] = $this->montarExecucaoComDocumento();

        $this->como($fiscal, $this->tenant)
            ->getJson("/api/vistoria/vistorias/{$execucao->id}/auditoria")
            ->assertStatus(403);
    }

    public function test_auditor_consulta_a_trilha(): void
    {
        [$execucao] = $this->montarExecucaoComDocumento();
        $auditor = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.auditoria.view'], 'Auditor');

        $response = $this->como($auditor, $this->tenant)->getJson("/api/vistoria/vistorias/{$execucao->id}/auditoria");

        $response->assertStatus(200)
            ->assertJsonPath('vistoria.id', $execucao->id)
            ->assertJsonCount(2, 'auditoria'); // ExecucaoVistoria sincronizada + Documento emitido
    }

    public function test_chefia_tambem_consulta_a_trilha(): void
    {
        [$execucao] = $this->montarExecucaoComDocumento();
        $chefia = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

        $this->como($chefia, $this->tenant)
            ->getJson("/api/vistoria/vistorias/{$execucao->id}/auditoria")
            ->assertStatus(200);
    }

    public function test_nao_vaza_trilha_de_outro_tenant(): void
    {
        [$execucao] = $this->montarExecucaoComDocumento();
        $outroTenant = $this->criarTenant('prefeitura-b');
        $auditorDeOutroTenant = $this->usuarioComPermissao($outroTenant, ['vistoria.view', 'vistoria.auditoria.view'], 'Auditor Outro Tenant');

        // A ExecucaoVistoria do tenant A nem aparece pro escopo global TenantAware da
        // requisição do tenant B — 404, não 403 (mesmo comportamento de qualquer outro
        // model TenantAware acessado por fora do próprio tenant).
        $this->como($auditorDeOutroTenant, $outroTenant)
            ->getJson("/api/vistoria/vistorias/{$execucao->id}/auditoria")
            ->assertStatus(404);
    }

    /**
     * @return array{0: ExecucaoVistoria, 1: User}
     */
    private function montarExecucaoComDocumento(): array
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
            $resultado = app(ExecucaoVistoriaService::class)->sincronizar($fiscal, $ordem, (string) Str::uuid(), ['dados' => []]);
            $execucao = $resultado['execucao'];
            app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_NOTIFICACAO, []);

            return [$execucao, $fiscal];
        });
    }
}
