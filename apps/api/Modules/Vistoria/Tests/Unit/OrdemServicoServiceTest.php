<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Events\OrdemServicoReatribuida;
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

    public function test_reatribui_para_fiscal_vinculado_a_unidade_e_dispara_evento(): void
    {
        Event::fake([OrdemServicoReatribuida::class]);
        $tenant = $this->criarTenant();

        [$ordem, $fiscalOriginal, $novoFiscal] = $this->noTenant($tenant, function () use ($tenant) {
            [$local, $orgUnit, $fiscalOriginal] = $this->montarCenarioBase($tenant);
            $novoFiscal = $this->usuarioComPermissao($tenant, [], 'Novo Fiscal');
            OrgUnitUser::create(['org_unit_id' => $orgUnit->id, 'user_id' => $novoFiscal->id, 'role' => 'membro']);

            $ordem = OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'fiscal_id' => $fiscalOriginal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'data_prevista' => '2026-11-01',
            ]);

            $ordem = app(OrdemServicoService::class)->reatribuir($ordem, $novoFiscal);

            return [$ordem, $fiscalOriginal, $novoFiscal];
        });

        self::assertSame($novoFiscal->id, $ordem->fiscal_id);
        Event::assertDispatched(OrdemServicoReatribuida::class, function (OrdemServicoReatribuida $evento) use ($fiscalOriginal, $novoFiscal): bool {
            return $evento->fiscalAnterior?->id === $fiscalOriginal->id && $evento->fiscalNovo->id === $novoFiscal->id;
        });
    }

    public function test_reatribuir_lanca_exception_quando_fiscal_nao_vinculado_a_unidade(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('O fiscal informado não está vinculado à unidade organizacional desta ordem de serviço.');

        $this->noTenant($tenant, function () use ($tenant) {
            [$local, $orgUnit, $fiscalOriginal] = $this->montarCenarioBase($tenant);
            $fiscalDeOutraUnidade = $this->usuarioComPermissao($tenant, [], 'Fiscal de Outra Unidade');

            $ordem = OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'fiscal_id' => $fiscalOriginal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'data_prevista' => '2026-11-01',
            ]);

            app(OrdemServicoService::class)->reatribuir($ordem, $fiscalDeOutraUnidade);
        });
    }

    public function test_reatribuir_lanca_exception_quando_ordem_ja_concluida(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Não é possível reatribuir uma ordem de serviço já concluída ou cancelada.');

        $this->noTenant($tenant, function () use ($tenant) {
            [$local, $orgUnit, $fiscalOriginal] = $this->montarCenarioBase($tenant);
            $novoFiscal = $this->usuarioComPermissao($tenant, [], 'Novo Fiscal');
            OrgUnitUser::create(['org_unit_id' => $orgUnit->id, 'user_id' => $novoFiscal->id, 'role' => 'membro']);

            $ordem = OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'fiscal_id' => $fiscalOriginal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_CONCLUIDA,
                'data_prevista' => '2026-11-01',
            ]);

            app(OrdemServicoService::class)->reatribuir($ordem, $novoFiscal);
        });
    }

    public function test_listar_restringe_fiscal_as_proprias_ordens_mas_nao_a_chefia(): void
    {
        $tenant = $this->criarTenant();

        [$fiscal, $chefia, $qtdFiscal, $qtdChefia] = $this->noTenant($tenant, function () use ($tenant) {
            [$local, $orgUnit, $fiscal] = $this->montarCenarioBase($tenant);
            $outroFiscal = $this->usuarioComPermissao($tenant, [], 'Outro Fiscal');
            // Chefia só com `vistoria.chefia` (sem `vistoria.ordens.manage`) — confirma o OR entre as duas permissões.
            $chefia = $this->usuarioComPermissao($tenant, ['vistoria.chefia'], 'Chefia');

            OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => '2026-11-01',
            ]);
            OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $outroFiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => '2026-11-02',
            ]);

            $qtdFiscal = app(OrdemServicoService::class)->listar($fiscal, [])->total();
            $qtdChefia = app(OrdemServicoService::class)->listar($chefia, [])->total();

            return [$fiscal, $chefia, $qtdFiscal, $qtdChefia];
        });

        self::assertSame(1, $qtdFiscal);
        self::assertSame(2, $qtdChefia);
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
