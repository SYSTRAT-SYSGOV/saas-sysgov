<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class AlocacoesTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_alocacao_valida_nasce_ativa_com_os_padroes_e_conta_na_ocupacao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $aluno = $this->criarAluno($t, $r['escola'], 'Ana Clara');

        $this->alocar($t, $g, $r['rota'], $r['parada'], $aluno)->assertCreated()
            ->assertJsonPath('data.ativa', true)->assertJsonPath('data.turno', 'manha')->assertJsonPath('data.usa_transporte_rural', true)
            ->assertJsonPath('data.atendimento_curricular', true)->assertJsonPath('data.mediacao_didatica', 'presencial')->assertJsonPath('data.pais_residencia', 'BR')
            ->assertJsonPath('data.poder_publico', null)->assertJsonPath('data.data_inicio', today()->toDateString());

        $this->como($g, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos")->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('ocupacao.alocados', 1)->assertJsonPath('ocupacao.faixa', 'verde')->assertJsonPath('data.0.aluno.nome', 'ANA CLARA');
    }

    public function test_poder_publico_e_dados_do_registro_60_sao_gravados(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);

        $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Bia'), [
            'poder_publico' => 3, 'usa_transporte_rural' => false, 'mediacao_didatica' => 'semipresencial', 'atendimento_curricular' => false, 'pais_residencia' => 'pt',
        ])->assertCreated()->assertJsonPath('data.poder_publico', 3)->assertJsonPath('data.mediacao_didatica', 'semipresencial')
            ->assertJsonPath('data.atendimento_curricular', false)->assertJsonPath('data.pais_residencia', 'PT')->assertJsonPath('data.usa_transporte_rural', false);
    }

    public function test_poder_publico_invalido_e_recusado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);

        $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Caio'), ['poder_publico' => 4])
            ->assertUnprocessable()->assertJsonValidationErrors(['poder_publico']);
    }

    public function test_parada_fora_do_itinerario_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $fora = $this->criarParada($t, $g);

        $this->alocar($t, $g, $r['rota'], $fora, $this->criarAluno($t, $r['escola'], 'Caio'))->assertUnprocessable();
    }

    public function test_aluno_transferido_sem_turma_ou_de_outro_ano_e_recusado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);

        $transferido = $this->criarAluno($t, $r['escola'], 'Transferido', extra: ['situacao' => 'transferido']);
        $semTurma = $this->criarAluno($t, $r['escola'], 'Sem turma', turma: false);
        $antigo = $this->criarAluno($t, $r['escola'], 'De 2025', 2025);

        $this->alocar($t, $g, $r['rota'], $r['parada'], $transferido)->assertUnprocessable();
        $this->alocar($t, $g, $r['rota'], $r['parada'], $semTurma)->assertUnprocessable();
        $this->alocar($t, $g, $r['rota'], $r['parada'], $antigo)->assertUnprocessable();
    }

    public function test_aluno_ja_alocado_na_rota_e_recusado_mas_pode_estar_em_outra(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $outra = $this->rotaPronta($t, $g, 2, escola: $r['escola']);
        $aluno = $this->criarAluno($t, $r['escola'], 'Dani');

        $this->alocar($t, $g, $r['rota'], $r['parada'], $aluno)->assertCreated();
        $this->alocar($t, $g, $r['rota'], $r['parada'], $aluno)->assertStatus(409);
        $this->alocar($t, $g, $outra['rota'], $outra['parada'], $aluno)->assertCreated();
    }

    public function test_escola_do_aluno_diferente_da_escola_da_rota_nao_bloqueia(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $outraEscola = $this->criarEscola($t, 'Escola Distrito');
        $aluno = $this->criarAluno($t, $outraEscola, 'Edu');

        $this->alocar($t, $g, $r['rota'], $r['parada'], $aluno)->assertCreated()->assertJsonPath('data.aluno.escola', 'Escola Distrito');
    }

    public function test_rota_sem_veiculo_ou_inativa_nao_recebe_aluno(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $semVeiculo = $this->criarRota($t, $g, $escola);
        $parada = $this->criarParada($t, $g);
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$semVeiculo}/itinerario", ['parada_id' => $parada])->assertCreated();
        $aluno = $this->criarAluno($t, $escola, 'Fábio');

        $this->alocar($t, $g, $semVeiculo, $parada, $aluno)->assertStatus(409);
        $this->como($g, $t)->getJson('/api/transporte/rotas')->assertJsonPath('data.0.ocupacao.calculavel', false);

        $r = $this->rotaPronta($t, $g, 2, rota: ['ativa' => false], escola: $escola);
        $this->alocar($t, $g, $r['rota'], $r['parada'], $aluno)->assertStatus(409);
    }

    public function test_revalidacao_vistoria_vencida_contrato_vencido_e_motorista_inelegivel(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);

        $r1 = $this->rotaPronta($t, $g, escola: $escola);
        DB::table('transporte_vistorias')->where('veiculo_id', $r1['veiculo'])->update(['validade' => now()->subDay()->toDateString()]);
        $resposta = $this->alocar($t, $g, $r1['rota'], $r1['parada'], $this->criarAluno($t, $escola, 'Gil'))->assertStatus(409);
        $this->assertStringContainsString('vistoria vencida', (string) $resposta->json('error'));

        $empresa = $this->criarEmpresa($t, $g);
        $r2 = $this->rotaPronta($t, $g, rota: ['empresa_id' => $empresa], escola: $escola);
        DB::table('transporte_empresas')->where('id', $empresa)->update(['vigencia_fim' => now()->subDay()->toDateString()]);
        $this->alocar($t, $g, $r2['rota'], $r2['parada'], $this->criarAluno($t, $escola, 'Hugo'))->assertStatus(409);

        $r3 = $this->rotaPronta($t, $g, escola: $escola);
        DB::table('transporte_motoristas')->update(['toxicologico_validade' => now()->subDay()->toDateString()]);
        $this->alocar($t, $g, $r3['rota'], $r3['parada'], $this->criarAluno($t, $escola, 'Iara'))->assertStatus(409);
    }

    public function test_turno_divergente_cria_com_aviso_e_turno_desconhecido_nao_avisa(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g, 5);

        $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Jaque', turno: 'Vespertino'))->assertCreated()->assertJsonPath('data.avisos', []);
        $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Kleber', turno: 'Tarde'))->assertCreated()->assertJsonPath('data.avisos', ['turno_divergente']);
        $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Lia', turno: 'Manhã'))->assertCreated()->assertJsonPath('data.avisos', []);
    }

    public function test_busca_de_alunos_traz_so_ativos_do_ano_da_rota_que_ainda_nao_estao_nela(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g, 5);
        $this->criarAluno($t, $r['escola'], 'Marina Alves');
        $this->criarAluno($t, $r['escola'], 'Marcos Antigo', 2025);
        $this->criarAluno($t, $r['escola'], 'Marta Saiu', extra: ['situacao' => 'transferido']);
        $jaNaRota = $this->criarAluno($t, $r['escola'], 'Mauro Na Rota');
        $this->alocar($t, $g, $r['rota'], $r['parada'], $jaNaRota)->assertCreated();

        $nomes = $this->como($g, $t)->getJson("/api/transporte/rotas/{$r['rota']}/alunos/busca?q=Mar")->assertOk()->json('data.*.nome');

        $this->assertSame(['MARINA ALVES'], $nomes);
    }

    public function test_alteracao_troca_a_parada_e_os_dados_do_censo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $segunda = $this->criarParada($t, $g);
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r['rota']}/itinerario", ['parada_id' => $segunda])->assertCreated();
        $id = $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Nina'))->json('data.id');

        $this->como($g, $t)->putJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}", ['parada_id' => $segunda, 'poder_publico' => 2])
            ->assertOk()->assertJsonPath('data.parada.id', $segunda)->assertJsonPath('data.poder_publico', 2);
        $fora = $this->criarParada($t, $g);
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}", ['parada_id' => $fora])->assertUnprocessable();
    }

    public function test_parada_com_aluno_ativo_nao_sai_do_itinerario_e_rota_com_historico_nao_e_excluida(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g);
        $id = $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Otto'))->json('data.id');

        $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$r['rota']}/itinerario/{$r['parada']}")->assertStatus(409);
        $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$r['rota']}")->assertStatus(409);

        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r['rota']}/alunos/{$id}/encerrar", ['data_fim' => today()->toDateString(), 'motivo' => 'Mudou de endereço'])->assertOk();
        $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$r['rota']}/itinerario/{$r['parada']}")->assertOk();
        $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$r['rota']}")->assertStatus(409);
    }
}
