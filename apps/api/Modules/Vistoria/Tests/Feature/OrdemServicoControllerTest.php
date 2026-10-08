<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class OrdemServicoControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $chefia;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->chefia = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.ordens.manage'], 'Chefia');
    }

    public function test_chefia_cria_ordem_de_servico_com_fiscal_designado(): void
    {
        [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidade();

        $response = $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/ordens-servico', [
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'fiscal_id' => $fiscal->id,
            'tipo_acao' => 'vistoria_rotina',
            'criticidade' => 'alta',
            'data_prevista' => '2026-11-01',
        ]);

        $response->assertStatus(201)->assertJsonPath('fiscal_id', $fiscal->id);
    }

    public function test_usuario_sem_permissao_e_recusado_ao_criar_ordem(): void
    {
        $semPermissao = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Sem Permissão');
        [$local, $orgUnit] = $this->montarLocalEUnidade(comFiscal: false);

        $response = $this->como($semPermissao, $this->tenant)->postJson('/api/vistoria/ordens-servico', [
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'tipo_acao' => 'vistoria_rotina',
            'data_prevista' => '2026-11-01',
        ]);

        $response->assertStatus(403);
    }

    public function test_minha_agenda_ordena_por_criticidade_decrescente(): void
    {
        [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidade();

        $this->noTenant($this->tenant, function () use ($local, $orgUnit, $fiscal) {
            foreach (['baixa', 'urgente', 'alta'] as $i => $criticidade) {
                OrdemServico::create([
                    'local_id' => $local->id,
                    'org_unit_id' => $orgUnit->id,
                    'fiscal_id' => $fiscal->id,
                    'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                    'criticidade' => $criticidade,
                    'data_prevista' => now()->addDays($i + 1)->toDateString(),
                ]);
            }
        });

        $response = $this->como($fiscal, $this->tenant)->getJson('/api/vistoria/ordens-servico/minha-agenda');

        $response->assertStatus(200);
        $criticidades = array_column($response->json(), 'criticidade');
        self::assertSame(['urgente', 'alta', 'baixa'], $criticidades);
    }

    public function test_minha_agenda_nao_mostra_ordens_de_outro_fiscal(): void
    {
        [$local, $orgUnit, $fiscalA] = $this->montarLocalEUnidade();
        $fiscalB = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Fiscal B');

        $this->noTenant($this->tenant, function () use ($local, $orgUnit, $fiscalA) {
            OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'fiscal_id' => $fiscalA->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'data_prevista' => now()->addDay()->toDateString(),
            ]);
        });

        $response = $this->como($fiscalB, $this->tenant)->getJson('/api/vistoria/ordens-servico/minha-agenda');

        $response->assertStatus(200)->assertJsonCount(0);
    }

    public function test_chefia_lista_todas_as_ordens_do_tenant(): void
    {
        [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidade();
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');

        $this->noTenant($this->tenant, function () use ($local, $orgUnit, $fiscal, $outroFiscal) {
            OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDay()->toDateString(),
            ]);
            OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $outroFiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDays(2)->toDateString(),
            ]);
        });

        $response = $this->como($this->chefia, $this->tenant)->getJson('/api/vistoria/ordens-servico');

        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_fiscal_so_lista_as_proprias_ordens(): void
    {
        [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidade();
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');

        $this->noTenant($this->tenant, function () use ($local, $orgUnit, $fiscal, $outroFiscal) {
            OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDay()->toDateString(),
            ]);
            OrdemServico::create([
                'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $outroFiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDays(2)->toDateString(),
            ]);
        });

        $response = $this->como($fiscal, $this->tenant)->getJson('/api/vistoria/ordens-servico');

        $response->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.fiscal_id', $fiscal->id);
    }

    public function test_exibe_uma_ordem_de_servico(): void
    {
        [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidade();
        $ordem = $this->noTenant($this->tenant, fn () => OrdemServico::create([
            'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDay()->toDateString(),
        ]));

        $this->como($this->chefia, $this->tenant)
            ->getJson("/api/vistoria/ordens-servico/{$ordem->id}")
            ->assertStatus(200)
            ->assertJsonPath('id', $ordem->id);

        // Outro fiscal (sem vistoria.ordens.manage) não pode ver a ordem de um fiscal diferente.
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');
        $this->como($outroFiscal, $this->tenant)
            ->getJson("/api/vistoria/ordens-servico/{$ordem->id}")
            ->assertStatus(403);
    }

    public function test_chefia_reatribui_ordem_para_fiscal_vinculado_a_unidade(): void
    {
        [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidade();
        $novoFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Novo Fiscal');
        $this->noTenant($this->tenant, fn () => OrgUnitUser::create(['org_unit_id' => $orgUnit->id, 'user_id' => $novoFiscal->id, 'role' => 'membro']));
        $ordem = $this->noTenant($this->tenant, fn () => OrdemServico::create([
            'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDay()->toDateString(),
        ]));

        $response = $this->como($this->chefia, $this->tenant)->patchJson("/api/vistoria/ordens-servico/{$ordem->id}/reatribuir", [
            'fiscal_id' => $novoFiscal->id,
        ]);

        $response->assertStatus(200)->assertJsonPath('fiscal_id', $novoFiscal->id);
    }

    public function test_fiscal_sem_permissao_e_recusado_ao_reatribuir(): void
    {
        [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidade();
        $ordem = $this->noTenant($this->tenant, fn () => OrdemServico::create([
            'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDay()->toDateString(),
        ]));

        $response = $this->como($fiscal, $this->tenant)->patchJson("/api/vistoria/ordens-servico/{$ordem->id}/reatribuir", [
            'fiscal_id' => $fiscal->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_recusa_reatribuicao_para_fiscal_de_outra_unidade_com_422(): void
    {
        [$local, $orgUnit, $fiscal] = $this->montarLocalEUnidade();
        $fiscalDeOutraUnidade = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Fiscal de Outra Unidade');
        $ordem = $this->noTenant($this->tenant, fn () => OrdemServico::create([
            'local_id' => $local->id, 'org_unit_id' => $orgUnit->id, 'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA, 'data_prevista' => now()->addDay()->toDateString(),
        ]));

        $response = $this->como($this->chefia, $this->tenant)->patchJson("/api/vistoria/ordens-servico/{$ordem->id}/reatribuir", [
            'fiscal_id' => $fiscalDeOutraUnidade->id,
        ]);

        $response->assertStatus(422);
    }

    /**
     * @return array{0: LocalFiscalizavel, 1: OrgUnit, 2: User|null}
     */
    private function montarLocalEUnidade(bool $comFiscal = true): array
    {
        return $this->noTenant($this->tenant, function () use ($comFiscal) {
            $proprietario = Pessoa::factory()->create();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda Teste',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);

            $fiscal = $comFiscal
                ? $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Fiscal')
                : null;

            return [$local, $orgUnit, $fiscal];
        });
    }
}
