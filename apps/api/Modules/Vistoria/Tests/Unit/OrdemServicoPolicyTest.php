<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Policies\OrdemServicoPolicy;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

/**
 * `User::hasPermission()`/`currentTenantId()` leem o `TenantContext` ambiente (resolvido por
 * requisição, não uma propriedade fixa do usuário) — por isso toda chamada à Policy aqui
 * roda dentro de `noTenant()`, com o tenant certo ativo no momento da chamada.
 */
final class OrdemServicoPolicyTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    public function test_viewany_exige_vistoria_view(): void
    {
        $tenant = $this->criarTenant();
        $policy = new OrdemServicoPolicy();

        $this->noTenant($tenant, function () use ($tenant, $policy): void {
            $comPermissao = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Com Permissão');
            $semPermissao = $this->usuarioComPermissao($tenant, [], 'Sem Permissão');

            self::assertTrue($policy->viewAny($comPermissao));
            self::assertFalse($policy->viewAny($semPermissao));
        });
    }

    public function test_view_permite_fiscal_dono_da_ordem_mas_nao_outro_fiscal(): void
    {
        $tenant = $this->criarTenant();
        $policy = new OrdemServicoPolicy();

        $this->noTenant($tenant, function () use ($tenant, $policy): void {
            [$local, $orgUnit] = $this->montarLocalEUnidade($tenant);
            $dono = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Dono');
            $outroFiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Outro');
            $ordem = OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $dono->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => '2026-11-01',
            ]);

            self::assertTrue($policy->view($dono, $ordem));
            self::assertFalse($policy->view($outroFiscal, $ordem));
        });
    }

    public function test_view_permite_chefia_ver_ordem_de_qualquer_fiscal(): void
    {
        $tenant = $this->criarTenant();
        $policy = new OrdemServicoPolicy();

        $this->noTenant($tenant, function () use ($tenant, $policy): void {
            [$local, $orgUnit] = $this->montarLocalEUnidade($tenant);
            $dono = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Dono');
            $chefiaOrdensManage = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.ordens.manage'], 'Chefia Ordens');
            $chefiaPlena = $this->usuarioComPermissao($tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia Plena');
            $ordem = OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $dono->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => '2026-11-01',
            ]);

            self::assertTrue($policy->view($chefiaOrdensManage, $ordem));
            self::assertTrue($policy->view($chefiaPlena, $ordem));
        });
    }

    public function test_create_exige_vistoria_ordens_manage(): void
    {
        $tenant = $this->criarTenant();
        $policy = new OrdemServicoPolicy();

        $this->noTenant($tenant, function () use ($tenant, $policy): void {
            $chefia = $this->usuarioComPermissao($tenant, ['vistoria.ordens.manage'], 'Chefia');
            $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');

            self::assertTrue($policy->create($chefia));
            self::assertFalse($policy->create($fiscal));
        });
    }

    public function test_update_e_reatribuir_exigem_vistoria_ordens_manage_no_mesmo_tenant(): void
    {
        $tenant = $this->criarTenant();
        $outroTenant = $this->criarTenant('prefeitura-b');
        $policy = new OrdemServicoPolicy();

        [$ordem, $chefia] = $this->noTenant($tenant, function () use ($tenant) {
            [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidadeComFiscal($tenant);
            $chefia = $this->usuarioComPermissao($tenant, ['vistoria.ordens.manage'], 'Chefia');
            $ordem = OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => '2026-11-01',
            ]);

            return [$ordem, $chefia];
        });

        // A mesma chefia é autorizada quando o contexto ambiente é o tenant da ordem, e
        // recusada quando não é (simula acessar a ordem do tenant A com a requisição
        // escopada pro tenant B, ex. header X-Tenant-ID errado).
        $this->noTenant($tenant, function () use ($policy, $chefia, $ordem): void {
            self::assertTrue($policy->update($chefia, $ordem));
            self::assertTrue($policy->reatribuir($chefia, $ordem));
        });

        $this->noTenant($outroTenant, function () use ($policy, $chefia, $ordem): void {
            self::assertFalse($policy->update($chefia, $ordem));
            self::assertFalse($policy->reatribuir($chefia, $ordem));
        });
    }

    /**
     * @return array{0: LocalFiscalizavel, 1: OrgUnit}
     */
    private function montarLocalEUnidade(Tenant $tenant): array
    {
        $proprietario = Pessoa::factory()->create();
        $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
        $local = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Teste',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        return [$local, $orgUnit];
    }

    /**
     * @return array{0: LocalFiscalizavel, 1: OrgUnit, 2: \App\Models\User}
     */
    private function montarLocalEUnidadeComFiscal(Tenant $tenant): array
    {
        [$local, $orgUnit] = $this->montarLocalEUnidade($tenant);
        $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');

        return [$local, $orgUnit, $fiscal];
    }
}
