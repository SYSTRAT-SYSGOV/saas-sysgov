<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Models\Sorteio;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Entidades sem fins lucrativos (D6). */
final class EntidadesTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    public function test_reprovar_com_motivo_publica_evento(): void
    {
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant, StatusEntidade::EmAnalise);

        $this->como($this->usuario($tenant), $tenant)->postJson("/api/inservivel/entidades/{$entidade->id}/status", [
            'status' => 'reprovada', 'documentos_faltantes' => ['Certidões negativas'],
        ])->assertOk()->assertJsonPath('status', 'reprovada')->assertJsonPath('motivo_reprovacao', "Documentos faltantes ou inconformes:\n- Certidões negativas");
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'inservivel.EntidadeReprovada']);

        $this->como($this->usuario($tenant), $tenant)->postJson("/api/inservivel/entidades/{$entidade->id}/status", ['status' => 'habilitada'])
            ->assertOk()->assertJsonPath('motivo_reprovacao', null);
    }

    public function test_reprovar_sem_motivo_responde_422(): void
    {
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant, StatusEntidade::Pendente);

        $this->como($this->usuario($tenant), $tenant)->postJson("/api/inservivel/entidades/{$entidade->id}/status", ['status' => 'reprovada'])->assertStatus(422);
    }

    public function test_servidor_nao_ve_entidades_e_cpf_sai_mascarado(): void
    {
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant);
        $this->como($this->usuario($tenant, ['inservivel_servidor']), $tenant)->getJson('/api/inservivel/entidades')->assertForbidden();

        $ficha = $this->como($this->usuario($tenant), $tenant)->getJson("/api/inservivel/entidades/{$entidade->id}")->assertOk();
        $ficha->assertJsonPath('cpf_representante_mascarado', '***.982.247-**')->assertJsonMissingPath('cpf_representante');
        self::assertStringNotContainsString('52998224725', (string) $ficha->getContent());
    }

    public function test_filtros_da_listagem(): void
    {
        $tenant = $this->criarTenant();
        $this->entidade($tenant, StatusEntidade::Habilitada, '111111110001');
        $this->entidade($tenant, StatusEntidade::Pendente, '222222220001');
        $gestor = $this->usuario($tenant);

        $this->como($gestor, $tenant)->getJson('/api/inservivel/entidades?status=pendente')->assertJsonCount(1, 'data');
        $this->como($gestor, $tenant)->getJson('/api/inservivel/entidades?q=22.222.222')->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.razao_social', 'Associação 222222220001');
    }

    public function test_analisar_documento_e_redefinir_senha(): void
    {
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant, StatusEntidade::EmAnalise);
        $doc = $entidade->documentos()->first();
        $gestor = $this->usuario($tenant);

        $this->como($gestor, $tenant)->putJson("/api/inservivel/entidades/{$entidade->id}/documentos/{$doc?->id}", ['situacao' => 'reprovado', 'observacao' => 'Ilegível', 'validade' => '2027-01-31'])
            ->assertOk();
        $this->assertDatabaseHas('inservivel_entidade_documentos', ['id' => $doc?->id, 'situacao' => 'reprovado', 'observacao_prefeitura' => 'Ilegível']);

        $this->como($gestor, $tenant)->postJson("/api/inservivel/entidades/{$entidade->id}/senha", ['senha' => 'novaSenha123', 'senha_confirmation' => 'novaSenha123'])->assertOk();
        self::assertTrue(password_verify('novaSenha123', (string) $this->contaDa($entidade)->getAuthPassword()));
    }

    public function test_excluir_entidade(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        $vencedora = $this->entidade($tenant, base: '333333330001');
        $lote = $this->noTenant($tenant, fn () => \Modules\Inservivel\Models\Lote::query()->create(['numero' => '1/2026', 'descricao' => 'x', 'data_criacao' => '2026-10-01', 'responsavel' => 'y', 'status' => 'sorteado']));
        $this->noTenant($tenant, fn () => Sorteio::query()->create(['lote_id' => $lote->id, 'entidade_vencedora_id' => $vencedora->id, 'data_sorteio' => now(), 'regra' => 'unica_inscrita', 'participantes' => [], 'hash' => 'h']));

        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/entidades/{$vencedora->id}", ['senha' => 'secret'])->assertStatus(422);

        $outra = $this->entidade($tenant, base: '444444440001');
        $conta = $this->contaDa($outra);
        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/entidades/{$outra->id}", ['senha' => 'errada'])->assertStatus(422);
        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/entidades/{$outra->id}", ['senha' => 'secret'])->assertOk();
        $this->assertDatabaseMissing('inservivel_entidades', ['id' => $outra->id]);
        self::assertFalse((bool) $conta->refresh()->is_active);
    }

    public function test_gestor_cadastra_entidade_com_conta(): void
    {
        $tenant = $this->criarTenant();
        $resposta = $this->como($this->usuario($tenant), $tenant)->postJson('/api/inservivel/entidades', [
            'razao_social' => 'Lar dos Idosos', 'nome_fantasia' => 'Lar', 'cnpj' => $this->cnpj('555555550001'), 'endereco' => 'Rua B', 'cep' => '83700-000',
            'cidade' => 'Araucária', 'uf' => 'pr', 'celular' => '41988887777', 'email' => 'lar@exemplo.org', 'representante_legal' => 'João',
            'cpf_representante' => '529.982.247-25', 'cargo_representante' => 'Diretor', 'tempo_funcionamento_anos' => 10, 'area_atuacao' => 'Idosos',
            'finalidade' => 'Acolhimento', 'numero_beneficiarios' => 30, 'senha' => 'senhaInicial1',
        ])->assertCreated();
        $resposta->assertJsonPath('status', 'pendente')->assertJsonPath('uf', 'PR');
        $this->assertDatabaseHas('users', ['email' => 'lar@exemplo.org', 'is_active' => true]);
    }
}
