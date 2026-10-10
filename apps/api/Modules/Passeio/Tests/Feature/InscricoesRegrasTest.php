<?php

declare(strict_types=1);

namespace Modules\Passeio\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\AlunoContato;
use Modules\Escola\Models\Turma;
use Modules\Passeio\Models\Assento;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Veiculo;
use Modules\Passeio\Tests\Concerns\CenarioPasseio;
use Modules\Passeio\Tests\TestCase;

/** Situação do aluno na inscrição e inscrição em lote por turma (D18). */
final class InscricoesRegrasTest extends TestCase
{
    use CenarioPasseio;
    use RefreshDatabase;

    public function test_transferido_nao_se_inscreve_nem_volta_a_ir(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->alunoNaTurma($tenant, 'Bruno Transferido');
        $id = $this->passeio($tenant);
        $coordenacao = $this->como($this->usuario($tenant), $tenant);

        // Inscrito antes de sair da escola: não pode voltar a "ir".
        $inscricao = $coordenacao->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $aluno->id])->assertCreated()->json('id');
        $coordenacao->putJson("/api/passeio/inscricoes/{$inscricao}", ['vai' => false])->assertOk();
        $this->noTenant($tenant, fn () => $aluno->update(['situacao' => 'transferido']));

        $coordenacao->putJson("/api/passeio/inscricoes/{$inscricao}", ['vai' => true])
            ->assertStatus(422)->assertJsonPath('error', 'Aluno transferido não participa do passeio.');
        $coordenacao->deleteJson("/api/passeio/inscricoes/{$inscricao}")->assertOk();
        $coordenacao->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $aluno->id])
            ->assertStatus(422)->assertJsonPath('error', 'Aluno transferido não participa do passeio.');
    }

    public function test_turma_ignora_transferido_e_remanejado_entra_pela_turma_de_destino(): void
    {
        $tenant = $this->criarTenant();
        $ana = $this->alunoNaTurma($tenant, 'Ana', '5º A');
        $saiu = $this->alunoNaTurma($tenant, 'Saiu', '5º A');
        $veio = $this->alunoNaTurma($tenant, 'Veio de outra turma', '5º B');
        $turmaA = $this->noTenant($tenant, function () use ($saiu, $veio, $ana): Turma {
            $saiu->update(['situacao' => 'transferido']);
            $veio->update(['situacao' => 'remanejado', 'turma_origem_id' => $veio->turma_id, 'turma_id' => $ana->turma_id]);

            return Turma::query()->findOrFail($ana->turma_id);
        });
        $id = $this->passeio($tenant);

        $this->como($this->usuario($tenant), $tenant)->postJson("/api/passeio/passeios/{$id}/inscricoes", ['turma_id' => $turmaA->id])
            ->assertCreated()->assertJsonPath('criadas', 2);

        $this->noTenant($tenant, fn () => $this->assertEqualsCanonicalizing([$ana->id, $veio->id], Inscricao::query()->pluck('aluno_id')->all()));
    }

    public function test_lista_traz_situacao_e_telefone_do_cadastro_escolar(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->alunoNaTurma($tenant, 'Carla');
        $this->noTenant($tenant, function () use ($aluno): void {
            AlunoContato::create(['aluno_id' => $aluno->id, 'telefone' => '(41) 99999-0001', 'descricao' => 'Mãe', 'ordem' => 0]);
            AlunoContato::create(['aluno_id' => $aluno->id, 'telefone' => '(41) 98888-0002', 'descricao' => 'Pai', 'ordem' => 1]);
        });
        $id = $this->passeio($tenant);
        $coordenacao = $this->como($this->usuario($tenant), $tenant);
        $coordenacao->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $aluno->id])->assertCreated();

        $coordenacao->getJson("/api/passeio/passeios/{$id}/inscricoes")->assertOk()
            ->assertJsonPath('0.aluno.situacao', 'ativo')
            ->assertJsonPath('0.aluno.telefone', '(41) 99999-0001')
            ->assertJsonMissingPath('0.aluno.contatos');
    }

    public function test_quem_nao_vai_nao_recebe_termo_nem_pagamento(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->alunoNaTurma($tenant, 'Davi');
        $id = $this->passeio($tenant);
        $coordenacao = $this->como($this->usuario($tenant), $tenant);
        $inscricao = $coordenacao->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $aluno->id])->assertCreated()->json('id');
        $coordenacao->putJson("/api/passeio/inscricoes/{$inscricao}", ['vai' => false])->assertOk();

        $mensagem = 'Marque que o aluno vai ao passeio antes de registrar o termo ou o pagamento.';
        $coordenacao->putJson("/api/passeio/inscricoes/{$inscricao}", ['autorizacao_entregue' => true])->assertStatus(422)->assertJsonPath('error', $mensagem);
        $coordenacao->putJson("/api/passeio/inscricoes/{$inscricao}", ['pago' => true])->assertStatus(422)->assertJsonPath('error', $mensagem);

        // Voltando a ir (na mesma requisição ou antes), termo e pagamento são aceitos.
        $coordenacao->putJson("/api/passeio/inscricoes/{$inscricao}", ['vai' => true, 'pago' => true])->assertOk()->assertJsonPath('pago', true);
        $coordenacao->putJson("/api/passeio/inscricoes/{$inscricao}", ['autorizacao_entregue' => true])->assertOk()->assertJsonPath('autorizacao_entregue', true);
    }

    public function test_lote_marca_e_desmarca_a_turma_liberando_assentos_sem_mexer_nas_outras(): void
    {
        $tenant = $this->criarTenant();
        $ana = $this->alunoNaTurma($tenant, 'Ana', '5º A');
        $bia = $this->alunoNaTurma($tenant, 'Bia', '5º A');
        $saiu = $this->alunoNaTurma($tenant, 'Saiu', '5º A');
        $outra = $this->alunoNaTurma($tenant, 'Outra turma', '5º B');
        $this->noTenant($tenant, fn () => $saiu->update(['situacao' => 'transferido']));
        $id = $this->passeio($tenant);
        $coordenacao = $this->como($this->usuario($tenant), $tenant);
        $coordenacao->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $outra->id])->assertCreated();
        $coordenacao->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $ana->id])->assertCreated();

        // Marcar: inscreve a Bia, mantém a Ana e deixa o transferido de fora.
        $coordenacao->putJson("/api/passeio/passeios/{$id}/inscricoes/lote", ['turma_id' => $ana->turma_id, 'vai' => true])
            ->assertOk()->assertJsonPath('criadas', 1);
        $veiculo = $coordenacao->postJson("/api/passeio/passeios/{$id}/veiculos", ['identificacao' => 'Ônibus 1', 'placa' => 'ABC1D23', 'motorista' => 'José', 'capacidade' => 44])->assertCreated()->json('id');
        $coordenacao->putJson("/api/passeio/veiculos/{$veiculo}/assentos/1", ['aluno_id' => $ana->id])->assertOk();
        $coordenacao->putJson("/api/passeio/veiculos/{$veiculo}/assentos/2", ['aluno_id' => $outra->id])->assertOk();

        // Desmarcar: todos da 5º A com "vai" falso e sem assento; a 5º B intacta.
        $coordenacao->putJson("/api/passeio/passeios/{$id}/inscricoes/lote", ['turma_id' => $ana->turma_id, 'vai' => false])
            ->assertOk()->assertJsonPath('afetadas', 2);

        $this->noTenant($tenant, function () use ($ana, $bia, $saiu, $outra): void {
            $vai = Inscricao::query()->pluck('vai', 'aluno_id');
            $this->assertFalse($vai[$ana->id]);
            $this->assertFalse($vai[$bia->id]);
            $this->assertTrue($vai[$outra->id]);
            $this->assertArrayNotHasKey($saiu->id, $vai->all());
            $this->assertSame([$outra->id], Assento::query()->pluck('aluno_id')->all());
            $this->assertSame(1, Veiculo::query()->count());
        });
        $this->assertSame(2, AuditLog::query()->where('module', 'passeio')->where('action', 'like', 'inscricao.lote_%')->count());
    }

    public function test_lote_respeita_permissao_e_turma_de_outro_orgao(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->alunoNaTurma($tenant, 'Ana', '5º A');
        $outro = $this->criarTenant('escola-b');
        $deFora = $this->alunoNaTurma($outro, 'De fora', '5º A');
        $id = $this->passeio($tenant);

        $this->como($this->usuario($tenant, ['passeio_apoio']), $tenant)
            ->putJson("/api/passeio/passeios/{$id}/inscricoes/lote", ['turma_id' => $aluno->turma_id, 'vai' => true])->assertStatus(403);
        $this->como($this->usuario($tenant), $tenant)
            ->putJson("/api/passeio/passeios/{$id}/inscricoes/lote", ['turma_id' => $deFora->turma_id, 'vai' => true])
            ->assertStatus(422)->assertJsonValidationErrors('turma_id');
    }
}
