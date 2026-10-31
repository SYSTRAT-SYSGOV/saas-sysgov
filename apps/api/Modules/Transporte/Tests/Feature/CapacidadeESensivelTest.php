<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Services\OcupacaoService;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class CapacidadeESensivelTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_limite_atingido_recusa_com_a_capacidade_e_a_ocupacao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_operador']);
        $r = $this->rotaPronta($t, $g, 2);
        foreach (['Ana', 'Beto'] as $nome) {
            $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], $nome))->assertCreated();
        }

        $resposta = $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Caio'))->assertStatus(409);

        $this->assertStringContainsString('2 lugares e 2 alunos', (string) $resposta->json('error'));
        $this->como($g, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos")->assertJsonCount(2, 'data')->assertJsonPath('ocupacao.faixa', 'amarelo');
    }

    public function test_ultima_vaga_so_vai_para_uma_das_duas_solicitacoes(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_operador']);
        $r = $this->rotaPronta($t, $g, 1);
        $a = $this->criarAluno($t, $r['escola'], 'Ana');
        $b = $this->criarAluno($t, $r['escola'], 'Beto');

        $status = [$this->alocar($t, $g, $r['rota'], $r['parada'], $a)->status(), $this->alocar($t, $g, $r['rota'], $r['parada'], $b)->status()];

        $this->assertSame([201, 409], $status);
        $this->assertSame(1, Alocacao::query()->where('rota_id', $r['rota'])->count());
    }

    public function test_excecao_autorizada_grava_justificativa_audita_e_deixa_a_rota_vermelha(): void
    {
        $t = $this->criarTenant();
        $coord = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $coord, 1);
        $this->alocar($t, $coord, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Ana'))->assertCreated();

        $this->alocar($t, $coord, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Beto'), ['justificativa_excesso' => 'Único transporte durante a reforma da van'])
            ->assertCreated()->assertJsonPath('data.justificativa_excesso', 'Único transporte durante a reforma da van');

        $this->como($coord, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos")->assertJsonPath('ocupacao.faixa', 'vermelho')->assertJsonPath('ocupacao.alocados', 2);
        $evento = AuditLog::query()->where('module', 'transporte')->where('action', 'alocacao.excesso_autorizado')->firstOrFail();
        $this->assertSame('Único transporte durante a reforma da van', $evento->after['justificativa'] ?? null);
    }

    public function test_excecao_sem_justificativa_ou_sem_permissao_e_recusada(): void
    {
        $t = $this->criarTenant();
        $coord = $this->usuario($t, ['transporte_coordenacao']);
        $operador = $this->usuario($t, ['transporte_operador']);
        $r = $this->rotaPronta($t, $coord, 1);
        $this->alocar($t, $coord, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Ana'))->assertCreated();

        $this->alocar($t, $coord, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Beto'))->assertStatus(409);
        $this->alocar($t, $coord, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Caio'), ['justificativa_excesso' => '   '])->assertStatus(409);
        $this->alocar($t, $operador, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Dani'), ['justificativa_excesso' => 'Preciso'])->assertStatus(409);
        $this->assertSame(1, Alocacao::query()->count());
    }

    public function test_faixas_de_ocupacao(): void
    {
        $this->assertSame('verde', OcupacaoService::calcular(32, 40)['faixa']);
        $this->assertSame('amarelo', OcupacaoService::calcular(33, 40)['faixa']);
        $this->assertSame('amarelo', OcupacaoService::calcular(40, 40)['faixa']);
        $this->assertSame('vermelho', OcupacaoService::calcular(41, 40)['faixa']);
        $this->assertSame(50.0, OcupacaoService::calcular(20, 40)['percentual']);
        $this->assertFalse(OcupacaoService::calcular(3, null)['calculavel']);
    }

    public function test_ocupacao_aparece_na_listagem_de_rotas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g, 2);
        $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Ana'))->assertCreated();

        $this->como($g, $t)->getJson('/api/transporte/rotas')->assertJsonPath('data.0.ocupacao.alocados', 1)->assertJsonPath('data.0.ocupacao.capacidade', 2)
            ->assertJsonPath('data.0.ocupacao.percentual', 50)->assertJsonPath('data.0.ocupacao.faixa', 'verde');
    }

    public function test_aluno_com_necessidade_especial_exige_veiculo_acessivel(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $comum = $this->rotaPronta($t, $g, 5);
        $adaptada = $this->rotaPronta($t, $g, 5, ['acessivel' => true], escola: $comum['escola']);
        $aluno = $this->criarAluno($t, $comum['escola'], 'Ana');

        $this->alocar($t, $g, $comum['rota'], $comum['parada'], $aluno, ['necessidade_especial' => true])->assertStatus(409);
        $this->alocar($t, $g, $adaptada['rota'], $adaptada['parada'], $aluno, ['necessidade_especial' => true, 'necessidade_observacao' => 'Cadeirante, precisa de rampa'])->assertCreated();
    }

    public function test_observacao_sensivel_nao_vai_em_listagens_nem_ao_consulta_e_a_leitura_da_ficha_e_auditada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $consulta = $this->usuario($t, ['transporte_consulta']);
        $r = $this->rotaPronta($t, $g, 5, ['acessivel' => true]);
        $id = $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Ana'), [
            'necessidade_especial' => true, 'necessidade_observacao' => 'Cadeirante, precisa de rampa',
        ])->assertCreated()->assertJsonMissingPath('data.necessidade_observacao')->json('data.id');

        $lista = $this->como($g, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos")->assertOk();
        $this->assertStringNotContainsString('Cadeirante', (string) $lista->getContent());
        $lista->assertJsonPath('data.0.necessidade_especial', true);

        $this->como($consulta, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}")->assertOk()->assertJsonMissingPath('data.necessidade_observacao');
        $this->assertSame(0, AuditLog::query()->where('action', 'alocacao.observacao_lida')->count());

        $this->como($g, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}")->assertOk()->assertJsonPath('data.necessidade_observacao', 'Cadeirante, precisa de rampa');
        $this->assertSame(1, AuditLog::query()->where('action', 'alocacao.observacao_lida')->count());

        $logs = AuditLog::query()->where('module', 'transporte')->get()->map(fn (AuditLog $l): string => (string) json_encode([$l->before, $l->after]))->implode('');
        $this->assertStringNotContainsString('Cadeirante', $logs);
    }

    public function test_encerramento_libera_a_vaga_e_mantem_o_historico(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g, 1);
        $id = $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Ana'))->json('data.id');

        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}/encerrar", ['data_fim' => today()->toDateString(), 'motivo' => 'Mudou de endereço'])
            ->assertOk()->assertJsonPath('data.ativa', false)->assertJsonPath('data.motivo_fim', 'Mudou de endereço');

        $this->como($g, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos")->assertJsonCount(0, 'data')->assertJsonPath('ocupacao.alocados', 0);
        $this->como($g, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos?encerradas=1")->assertJsonCount(1, 'data');
        $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Beto'))->assertCreated();
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}/encerrar", ['data_fim' => today()->toDateString(), 'motivo' => 'x'])->assertStatus(409);
    }

    public function test_data_de_termino_anterior_ao_inicio_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $id = $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Ana'), ['data_inicio' => today()->toDateString()])->json('data.id');

        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}/encerrar", ['data_fim' => today()->subDay()->toDateString(), 'motivo' => 'Erro'])->assertUnprocessable();
    }

    public function test_aluno_transferido_ou_excluido_tem_a_alocacao_encerrada_automaticamente(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g, 3);
        $transferido = $this->criarAluno($t, $r['escola'], 'Ana');
        $excluido = $this->criarAluno($t, $r['escola'], 'Beto');
        $remanejado = $this->criarAluno($t, $r['escola'], 'Caio');
        $fica = $this->criarAluno($t, $r['escola'], 'Dani');
        foreach ([$transferido, $excluido, $remanejado, $fica] as $i => $aluno) {
            // 4 alunos em 3 lugares: o último entra por exceção autorizada.
            $this->alocar($t, $g, $r['rota'], $r['parada'], $aluno, $i === 3 ? ['justificativa_excesso' => 'Reforço'] : [])->assertCreated();
        }

        $this->noTenant($t, function () use ($transferido, $excluido, $remanejado): void {
            Aluno::query()->withoutGlobalScope('escola')->findOrFail($transferido->id)->update(['situacao' => 'transferido']);
            Aluno::query()->withoutGlobalScope('escola')->findOrFail($remanejado->id)->update(['situacao' => 'remanejado']);
            Aluno::query()->withoutGlobalScope('escola')->findOrFail($excluido->id)->delete();
        });

        $motivos = Alocacao::query()->whereNotNull('data_fim')->orderBy('aluno_id')->pluck('motivo_fim', 'aluno_id')->all();
        $this->assertSame([$transferido->id => 'aluno_transferido', $excluido->id => 'aluno_excluido', $remanejado->id => 'aluno_remanejado'], $motivos);
        $this->assertNull(Alocacao::query()->where('aluno_id', $fica->id)->value('data_fim'));
        $this->assertTrue(AuditLog::query()->where('action', 'alocacao.encerrada_automaticamente')->exists());
    }

    public function test_mudanca_de_outro_campo_do_aluno_nao_encerra(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $aluno = $this->criarAluno($t, $r['escola'], 'Ana');
        $this->alocar($t, $g, $r['rota'], $r['parada'], $aluno)->assertCreated();

        $this->noTenant($t, fn () => Aluno::query()->withoutGlobalScope('escola')->findOrFail($aluno->id)->update(['cgm' => '999']));

        $this->assertNull(Alocacao::query()->value('data_fim'));
    }

    public function test_isolamento_entre_tenants(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gA = $this->usuario($a, ['transporte_coordenacao']);
        $gB = $this->usuario($b, ['transporte_coordenacao']);
        $rA = $this->rotaPronta($a, $gA);
        $rB = $this->rotaPronta($b, $gB);
        $alunoB = $this->criarAluno($b, $rB['escola'], 'Do B');
        $id = $this->alocar($a, $gA, $rA['rota'], $rA['parada'], $this->criarAluno($a, $rA['escola'], 'Do A'))->json('data.id');

        $this->alocar($a, $gA, $rA['rota'], $rA['parada'], $alunoB)->assertNotFound();
        $this->como($gB, $b)->getJson("/api/transporte/rotas/{$rA['rota']}/alunos")->assertNotFound();
        $this->como($gB, $b)->getJson("/api/transporte/rotas/{$rB['rota']}/alunos/{$id}")->assertNotFound();
        $this->como($gB, $b)->postJson("/api/transporte/rotas/{$rB['rota']}/alunos/{$id}/encerrar", ['data_fim' => today()->toDateString(), 'motivo' => 'x'])->assertNotFound();
    }

    public function test_permissoes_da_alocacao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $consulta = $this->usuario($t, ['transporte_consulta']);
        $r = $this->rotaPronta($t, $g);
        $aluno = $this->criarAluno($t, $r['escola'], 'Ana');
        $id = $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Beto'))->json('data.id');

        $this->alocar($t, $consulta, $r['rota'], $r['parada'], $aluno)->assertForbidden();
        $this->como($consulta, $t)->putJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}", ['poder_publico' => 2])->assertForbidden();
        $this->como($consulta, $t)->postJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}/encerrar", ['data_fim' => today()->toDateString(), 'motivo' => 'x'])->assertForbidden();
        $this->como($consulta, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos/busca?q=Ana")->assertForbidden();
        $this->como($consulta, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos")->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_toda_mutacao_da_alocacao_e_auditada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $id = $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Ana'))->json('data.id');
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}", ['poder_publico' => 2])->assertOk();
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}/encerrar", ['data_fim' => today()->toDateString(), 'motivo' => 'Fim'])->assertOk();

        $acoes = AuditLog::query()->where('tenant_id', $t->id)->where('module', 'transporte')->pluck('action')->all();
        foreach (['alocacao.criada', 'alocacao.alterada', 'alocacao.encerrada'] as $esperada) {
            $this->assertContains($esperada, $acoes);
        }
    }
}
