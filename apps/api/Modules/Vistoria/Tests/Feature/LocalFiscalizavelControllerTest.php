<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class LocalFiscalizavelControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $chefia;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->chefia = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.locais.manage'], 'Chefia');
    }

    public function test_cria_local_fiscalizavel_com_dados_validos(): void
    {
        $proprietario = $this->noTenant($this->tenant, fn () => Pessoa::factory()->create());

        $response = $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/locais', [
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Boa Vista',
            'tipo' => 'propriedade_rural',
            'classificacao_atividade' => 'producao_animal',
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('nome', 'Fazenda Boa Vista');
    }

    public function test_rejeita_criacao_com_proprietario_inexistente(): void
    {
        $response = $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/locais', [
            'proprietario_pessoa_id' => 999999,
            'nome' => 'Fazenda Inexistente',
            'tipo' => 'propriedade_rural',
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $response->assertStatus(422);
    }

    public function test_rejeita_criacao_com_dados_invalidos(): void
    {
        $response = $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/locais', [
            'nome' => 'Fazenda Sem Localização',
            'tipo' => 'propriedade_rural',
        ]);

        $response->assertStatus(422);
    }

    public function test_usuario_sem_permissao_e_recusado(): void
    {
        // Tem acesso ao módulo (vistoria.view) mas não à permissão específica de gestão de locais —
        // garante que é a Policy::create(), não o gate de módulo, quem está recusando aqui.
        $semPermissao = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Sem Permissão');

        $response = $this->como($semPermissao, $this->tenant)->postJson('/api/vistoria/locais', [
            'proprietario_pessoa_id' => 1,
            'nome' => 'Fazenda Qualquer',
            'tipo' => 'propriedade_rural',
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $response->assertStatus(403);
    }

    public function test_lista_locais_paginados(): void
    {
        $proprietario = $this->noTenant($this->tenant, fn () => Pessoa::factory()->create());
        $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/locais', [
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Boa Vista',
            'tipo' => 'propriedade_rural',
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ])->assertStatus(201);

        $response = $this->como($this->chefia, $this->tenant)->getJson('/api/vistoria/locais');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.nome', 'Fazenda Boa Vista');
    }

    public function test_exibe_um_local(): void
    {
        $proprietario = $this->noTenant($this->tenant, fn () => Pessoa::factory()->create());
        $criado = $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/locais', [
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Boa Vista',
            'tipo' => 'propriedade_rural',
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ])->json();

        $response = $this->como($this->chefia, $this->tenant)->getJson("/api/vistoria/locais/{$criado['id']}");

        $response->assertStatus(200)->assertJsonPath('nome', 'Fazenda Boa Vista');
    }

    public function test_atualiza_um_local(): void
    {
        $proprietario = $this->noTenant($this->tenant, fn () => Pessoa::factory()->create());
        $criado = $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/locais', [
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Boa Vista',
            'tipo' => 'propriedade_rural',
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ])->json();

        $response = $this->como($this->chefia, $this->tenant)->patchJson("/api/vistoria/locais/{$criado['id']}", [
            'nome' => 'Fazenda Boa Vista II',
        ]);

        $response->assertStatus(200)->assertJsonPath('nome', 'Fazenda Boa Vista II');
    }

    public function test_exclui_um_local(): void
    {
        $proprietario = $this->noTenant($this->tenant, fn () => Pessoa::factory()->create());
        $criado = $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/locais', [
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Boa Vista',
            'tipo' => 'propriedade_rural',
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ])->json();

        $response = $this->como($this->chefia, $this->tenant)->deleteJson("/api/vistoria/locais/{$criado['id']}");

        $response->assertStatus(204);
        $this->como($this->chefia, $this->tenant)
            ->getJson("/api/vistoria/locais/{$criado['id']}")
            ->assertStatus(404);
    }

    public function test_usuario_sem_permissao_e_recusado_ao_atualizar_e_excluir(): void
    {
        $proprietario = $this->noTenant($this->tenant, fn () => Pessoa::factory()->create());
        $criado = $this->como($this->chefia, $this->tenant)->postJson('/api/vistoria/locais', [
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Boa Vista',
            'tipo' => 'propriedade_rural',
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ])->json();

        $semPermissao = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Sem Permissão');

        $this->como($semPermissao, $this->tenant)
            ->patchJson("/api/vistoria/locais/{$criado['id']}", ['nome' => 'Outro Nome'])
            ->assertStatus(403);

        $this->como($semPermissao, $this->tenant)
            ->deleteJson("/api/vistoria/locais/{$criado['id']}")
            ->assertStatus(403);
    }

    public function test_exibe_o_historico_de_vistorias_concluidas_do_local(): void
    {
        [$local, $ordemConcluida] = $this->noTenant($this->tenant, function () {
            $proprietario = Pessoa::factory()->create();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria', 'code' => 'SEC-' . uniqid()]);
            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda com Histórico',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
            $ordemConcluida = OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_CONCLUIDA,
                'data_prevista' => now()->subDays(10)->toDateString(),
            ]);
            // Ordem agendada (não concluída) não deve aparecer no histórico.
            OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_AGENDADA,
                'data_prevista' => now()->addDay()->toDateString(),
            ]);

            return [$local, $ordemConcluida];
        });

        $response = $this->como($this->chefia, $this->tenant)->getJson("/api/vistoria/locais/{$local->id}/historico");

        $response->assertStatus(200)->assertJsonCount(1)->assertJsonPath('0.id', $ordemConcluida->id);
    }

    public function test_usuario_sem_vistoria_view_e_recusado_no_historico(): void
    {
        $local = $this->noTenant($this->tenant, function () {
            $proprietario = Pessoa::factory()->create();

            return LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda Teste',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
        });
        $semPermissao = $this->usuarioComPermissao($this->tenant, [], 'Sem Permissão Nenhuma');

        $this->como($semPermissao, $this->tenant)
            ->getJson("/api/vistoria/locais/{$local->id}/historico")
            ->assertStatus(403);
    }
}
