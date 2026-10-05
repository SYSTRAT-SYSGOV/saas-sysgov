<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Services\OrdemServicoService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class OrdemServicoServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    public function test_cria_ordem_servico_com_fiscal_designado_manualmente(): void
    {
        $tenant = $this->criarTenant();

        $ordem = $this->noTenant($tenant, function () use ($tenant) {
            [$local, $orgUnit, $fiscal] = $this->montarCenarioBase($tenant);

            return app(OrdemServicoService::class)->criarOrdemServico([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'fiscal_id' => $fiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'criticidade' => OrdemServico::CRITICIDADE_ALTA,
                'data_prevista' => '2026-11-01',
            ]);
        });

        self::assertSame(OrdemServico::STATUS_AGENDADA, $ordem->status);
        self::assertNotNull($ordem->fiscal_id);
    }

    public function test_lanca_exception_quando_local_nao_existe(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Local fiscalizável não encontrado.');

        $this->noTenant($tenant, function () {
            $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI']);

            app(OrdemServicoService::class)->criarOrdemServico([
                'local_id' => 999999,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'data_prevista' => '2026-11-01',
            ]);
        });
    }

    public function test_distribuicao_automatica_escolhe_fiscal_com_menor_carga(): void
    {
        $tenant = $this->criarTenant();

        [$ordemCriada, $fiscalOcupado, $fiscalLivre] = $this->noTenant($tenant, function () use ($tenant) {
            [$local, $orgUnit] = $this->montarCenarioBase($tenant, comFiscal: false);

            $fiscalOcupado = $this->usuarioComPermissao($tenant, [], 'Fiscal Ocupado');
            $fiscalLivre = $this->usuarioComPermissao($tenant, [], 'Fiscal Livre');
            OrgUnitUser::create(['org_unit_id' => $orgUnit->id, 'user_id' => $fiscalOcupado->id, 'role' => 'membro']);
            OrgUnitUser::create(['org_unit_id' => $orgUnit->id, 'user_id' => $fiscalLivre->id, 'role' => 'membro']);

            // Fiscal ocupado já tem uma ordem pendente.
            OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'fiscal_id' => $fiscalOcupado->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_AGENDADA,
                'data_prevista' => '2026-10-01',
            ]);

            $ordemCriada = app(OrdemServicoService::class)->criarOrdemServico([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_ATENDIMENTO_DENUNCIA,
                'data_prevista' => '2026-11-05',
            ]);

            return [$ordemCriada, $fiscalOcupado, $fiscalLivre];
        });

        self::assertSame($fiscalLivre->id, $ordemCriada->fiscal_id);
        self::assertNotSame($fiscalOcupado->id, $ordemCriada->fiscal_id);
    }

    public function test_lanca_exception_quando_nenhum_fiscal_vinculado_a_unidade(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Não há fiscal vinculado à unidade organizacional para distribuição automática.');

        $this->noTenant($tenant, function () use ($tenant) {
            [$local, $orgUnit] = $this->montarCenarioBase($tenant, comFiscal: false);

            app(OrdemServicoService::class)->criarOrdemServico([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'data_prevista' => '2026-11-01',
            ]);
        });
    }

    /**
     * @return array{0: LocalFiscalizavel, 1: OrgUnit, 2: \App\Models\User|null}
     */
    private function montarCenarioBase(Tenant $tenant, bool $comFiscal = true): array
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

        $fiscal = null;
        if ($comFiscal) {
            $fiscal = $this->usuarioComPermissao($tenant, [], 'Fiscal');
            OrgUnitUser::create(['org_unit_id' => $orgUnit->id, 'user_id' => $fiscal->id, 'role' => 'membro']);
        }

        return [$local, $orgUnit, $fiscal];
    }
}
