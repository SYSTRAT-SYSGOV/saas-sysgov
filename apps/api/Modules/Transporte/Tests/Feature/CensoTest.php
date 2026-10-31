<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class CensoTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    /** @return array{0: list<string>, 1: list<array<string, string>>} cabeçalho e linhas indexadas pelo cabeçalho */
    private function csv(string $conteudo): array
    {
        $this->assertStringStartsWith("\xEF\xBB\xBF", $conteudo);
        $linhas = array_values(array_filter(explode("\r\n", substr($conteudo, 3)), fn (string $l): bool => $l !== ''));
        $cabecalho = str_getcsv((string) array_shift($linhas), ';', '"', '');
        $dados = array_map(fn (string $l): array => array_combine($cabecalho, str_getcsv($l, ';', '"', '')), $linhas);

        return [$cabecalho, $dados];
    }

    /**
     * @param array<string, mixed> $corpo
     * @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function pedir(\App\Models\Tenant $t, \App\Models\User $u, string $rota, array $corpo = []): \Illuminate\Testing\TestResponse
    {
        return $this->como($u, $t)->postJson("/api/transporte/censo/{$rota}", ['ano_letivo' => 2026, ...$corpo]);
    }

    /**
     * Rota com um aluno alocado; devolve também o aluno.
     *
     * @param array<string, mixed> $veiculo
     * @param array<string, mixed> $alocacao
     * @return array{rota: int, parada: int, veiculo: int, escola: Escola, aluno: Aluno, alocacao: int}
     */
    private function transportado(\App\Models\Tenant $t, \App\Models\User $g, string $nome = 'Ana Clara', array $veiculo = [], array $alocacao = []): array
    {
        $r = $this->rotaPronta($t, $g, 5, $veiculo);
        $aluno = $this->criarAluno($t, $r['escola'], $nome);
        $id = $this->alocar($t, $g, $r['rota'], $r['parada'], $aluno, $alocacao)->assertCreated()->json('data.id');

        return [...$r, 'aluno' => $aluno, 'alocacao' => $id];
    }

    public function test_pre_validacao_rota_sem_veiculo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $x = $this->transportado($t, $g);
        DB::table('transporte_rotas')->where('id', $x['rota'])->update(['veiculo_id' => null]);

        $r = $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome']])->assertOk();

        $r->assertJsonPath('data.approved', false)->assertJsonPath('data.resumo.rota_sem_veiculo', 1)->assertJsonPath('data.pendencias.0.tipo', 'rota_sem_veiculo')
            ->assertJsonPath('data.pendencias.0.aluno', 'ANA CLARA');
    }

    public function test_pre_validacao_necessidade_especial_em_veiculo_nao_adaptado_e_rural_sem_declaracao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $a = $this->transportado($t, $g, 'Ana', ['acessivel' => true], ['necessidade_especial' => true]);
        DB::table('transporte_veiculos')->where('id', $a['veiculo'])->update(['acessivel' => false]);
        $this->transportado($t, $g, 'Beto', [], ['usa_transporte_rural' => false]);

        $r = $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome']])->assertOk();

        $r->assertJsonPath('data.resumo.veiculo_nao_adaptado', 1)->assertJsonPath('data.resumo.rural_sem_declaracao', 1)->assertJsonPath('data.approved', false);
    }

    public function test_aluno_que_teve_alocacao_e_nao_tem_ativa_e_pendencia(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $x = $this->transportado($t, $g);
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$x['rota']}/alunos/{$x['alocacao']}/encerrar", ['data_fim' => today()->toDateString(), 'motivo' => 'Mudou'])->assertOk();

        $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome']])->assertJsonPath('data.resumo.sem_alocacao_ativa', 1)
            ->assertJsonPath('data.pendencias.0.aluno', 'ANA CLARA')->assertJsonPath('data.total_linhas', 0);
    }

    public function test_codigo_inep_faltando_so_cobra_quando_o_campo_esta_selecionado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g);

        $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome']])->assertJsonPath('data.resumo.sem_codigo_inep', 0)->assertJsonPath('data.approved', true);
        $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome', 'aluno_inep', 'turma_inep']])->assertJsonPath('data.resumo.sem_codigo_inep', 2)->assertJsonPath('data.approved', false);
    }

    public function test_com_o_codigo_inep_cadastrado_nao_ha_pendencia(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $x = $this->transportado($t, $g);
        $this->noTenant($t, function () use ($x): void {
            Aluno::query()->withoutGlobalScope('escola')->findOrFail($x['aluno']->id)->update(['inep_id' => '123456789012']);
            \Modules\Escola\Models\Turma::query()->withoutGlobalScope('escola')->findOrFail($x['aluno']->turma_id)->update(['inep' => '55555']);
        });

        $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome', 'aluno_inep', 'turma_inep']])->assertJsonPath('data.resumo.sem_codigo_inep', 0)->assertJsonPath('data.approved', true);
    }

    public function test_campo_selecionado_sem_dado_em_nenhum_aluno_e_pendencia(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g);

        $r = $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome', 'escola_inep', 'poder_publico']])->assertOk();

        $r->assertJsonPath('data.resumo.campo_sem_dado', 2);
        $chaves = array_column($r->json('data.campos_sem_dado'), 'chave');
        sort($chaves);
        $this->assertSame(['escola_inep', 'poder_publico'], $chaves);
    }

    public function test_aviso_de_turno_nao_impede_a_aprovacao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $r = $this->rotaPronta($t, $g, 5);
        $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $r['escola'], 'Ana', turno: 'Tarde'))->assertCreated();

        $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome']])->assertJsonPath('data.approved', true)->assertJsonPath('data.avisos.0.tipo', 'turno_divergente')->assertJsonPath('data.pendencias', []);
    }

    public function test_permissoes_do_censo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $consulta = $this->usuario($t, ['transporte_consulta']);

        foreach (['pre-validacao', 'arquivo', 'conferencia'] as $rota) {
            $this->pedir($t, $consulta, $rota)->assertForbidden();
        }
        $this->como($consulta, $t)->getJson('/api/transporte/censo/leiautes')->assertForbidden();
        $this->como($consulta, $t)->getJson('/api/transporte/censo/modelos')->assertForbidden();
        $this->pedir($t, $g, 'pre-validacao')->assertOk();
    }

    public function test_arquivo_de_onibus_municipal_marca_a_tipologia_e_zera_as_demais(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g, 'Ana', ['tipologia_inep' => 3], ['poder_publico' => 2]);

        $conteudo = $this->pedir($t, $g, 'arquivo')->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8')->getContent();
        [, $linhas] = $this->csv((string) $conteudo);

        $this->assertCount(1, $linhas);
        $l = $linhas[0];
        $this->assertSame('1', $l['transporte_publico']);
        $this->assertSame('2', $l['poder_publico']);
        $this->assertSame('1', $l['tipologia_3']);
        foreach (array_diff(range(1, 11), [3]) as $n) {
            $this->assertSame('0', $l["tipologia_{$n}"]);
        }
        $this->assertSame('2026', $l['ano_letivo']);
        $this->assertSame('ANA', $l['aluno_nome']);
    }

    public function test_tipologia_ferroviaria(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g, 'Ana', ['tipologia_inep' => 11]);

        [, $linhas] = $this->csv((string) $this->pedir($t, $g, 'arquivo')->getContent());

        $this->assertSame('1', $linhas[0]['tipologia_11']);
        $this->assertSame('0', $linhas[0]['tipologia_3']);
    }

    public function test_alocacao_encerrada_e_de_outro_ano_nao_geram_linha(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $x = $this->transportado($t, $g, 'Encerrada');
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$x['rota']}/alunos/{$x['alocacao']}/encerrar", ['data_fim' => today()->toDateString(), 'motivo' => 'Mudou'])->assertOk();
        $this->transportado($t, $g, 'Ativa');

        [, $linhas] = $this->csv((string) $this->pedir($t, $g, 'arquivo')->getContent());
        $this->assertSame(['ATIVA'], array_column($linhas, 'aluno_nome'));
        [, $outroAno] = $this->csv((string) $this->pedir($t, $g, 'arquivo', ['ano_letivo' => 2025])->getContent());
        $this->assertSame([], $outroAno);
    }

    public function test_leiaute_inexistente_responde_422_com_os_disponiveis(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $r = $this->pedir($t, $g, 'arquivo', ['leiaute' => 'educacenso-2099'])->assertUnprocessable();

        $this->assertStringContainsString('basico-1', (string) $r->json('error'));
    }

    public function test_declaracao_e_anulada_sem_atendimento_curricular_a_distancia_ou_fora_do_pais(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g, 'Sem curricular', [], ['atendimento_curricular' => false, 'poder_publico' => 2]);
        $this->transportado($t, $g, 'A distancia', [], ['mediacao_didatica' => 'distancia', 'poder_publico' => 2]);
        $this->transportado($t, $g, 'No Paraguai', [], ['pais_residencia' => 'PY', 'poder_publico' => 2]);
        $this->transportado($t, $g, 'Caso comum', [], ['poder_publico' => 2]);

        [, $linhas] = $this->csv((string) $this->pedir($t, $g, 'arquivo')->getContent());
        $porNome = array_column($linhas, null, 'aluno_nome');

        foreach (['SEM CURRICULAR', 'A DISTANCIA', 'NO PARAGUAI'] as $nome) {
            $this->assertSame('', $porNome[$nome]['transporte_publico'], $nome);
            $this->assertSame('', $porNome[$nome]['poder_publico'], $nome);
            $this->assertSame('0', $porNome[$nome]['tipologia_3'], $nome);
        }
        $this->assertSame('1', $porNome['CASO COMUM']['transporte_publico']);
        $this->assertSame('2', $porNome['CASO COMUM']['poder_publico']);
        $this->assertSame('1', $porNome['CASO COMUM']['tipologia_3']);
    }

    public function test_campo_opcional_desmarcado_sai_vazio_na_posicao_e_e_omitido_na_conferencia(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g, 'Ana');

        $completo = $this->csv((string) $this->pedir($t, $g, 'arquivo')->getContent());
        $semRota = $this->csv((string) $this->pedir($t, $g, 'arquivo', ['campos' => array_values(array_diff(array_keys($completo[1][0]), ['rota', 'aluno_cpf', 'necessidade_especial']))])->getContent());
        $this->assertSame($completo[0], $semRota[0]);
        $this->assertNotSame('', $completo[1][0]['rota']);
        $this->assertSame('', $semRota[1][0]['rota']);
        $this->assertSame($completo[1][0]['placa'], $semRota[1][0]['placa']);

        $conferencia = $this->csv((string) $this->pedir($t, $g, 'conferencia', ['campos' => ['aluno_nome', 'placa']])->getContent());
        $this->assertNotContains('Rota', $conferencia[0]);
        $this->assertContains('Placa do veículo', $conferencia[0]);
    }

    public function test_campos_obrigatorios_entram_mesmo_desmarcados(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $campos = $this->pedir($t, $g, 'pre-validacao', ['campos' => ['placa']])->json('data.campos');

        foreach (['ano_letivo', 'aluno_id', 'aluno_nome', 'transporte_publico', 'placa'] as $c) {
            $this->assertContains($c, $campos);
        }
    }

    public function test_campo_sensivel_exige_confirmacao_e_vai_para_a_auditoria_mas_cpf_nunca_sai_na_conferencia(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $x = $this->transportado($t, $g, 'Ana', [], ['necessidade_especial' => false]);

        $this->pedir($t, $g, 'arquivo', ['campos' => ['aluno_nome', 'aluno_cpf']])->assertUnprocessable();
        $this->pedir($t, $g, 'arquivo', ['campos' => ['aluno_nome', 'aluno_cpf'], 'confirmar_sensiveis' => ['aluno_cpf']])->assertOk();
        $this->pedir($t, $g, 'conferencia', ['campos' => ['aluno_nome', 'aluno_cpf'], 'confirmar_sensiveis' => ['aluno_cpf']])->assertOk();

        $evento = AuditLog::query()->where('action', 'censo.arquivo_gerado')->firstOrFail();
        $this->assertSame(['aluno_cpf'], $evento->after['campos_sensiveis']);
        $conferencia = $this->csv((string) $this->pedir($t, $g, 'conferencia', ['campos' => ['aluno_nome', 'aluno_cpf'], 'confirmar_sensiveis' => ['aluno_cpf']])->getContent());
        $this->assertNotContains('CPF do aluno', $conferencia[0]);
        $this->assertSame($x['aluno']->id, $x['aluno']->id);
    }

    public function test_observacao_da_necessidade_especial_nao_esta_no_catalogo_nem_nos_arquivos(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g, 'Ana', ['acessivel' => true], ['necessidade_especial' => true, 'necessidade_observacao' => 'Cadeirante, usa rampa']);

        $catalogo = $this->como($g, $t)->getJson('/api/transporte/censo/leiautes')->assertOk();
        $this->assertStringNotContainsString('observa', mb_strtolower((string) $catalogo->getContent()));
        $todos = array_column($catalogo->json('data.0.campos'), 'chave');
        foreach ([$this->pedir($t, $g, 'arquivo', ['campos' => $todos, 'confirmar_sensiveis' => $todos]), $this->pedir($t, $g, 'conferencia', ['campos' => $todos, 'confirmar_sensiveis' => $todos])] as $resposta) {
            $this->assertStringNotContainsString('Cadeirante', (string) $resposta->getContent());
        }
    }

    public function test_celula_iniciada_por_sinal_recebe_apostrofo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g, '=cmd|calc');

        [, $conf] = $this->csv((string) $this->pedir($t, $g, 'conferencia', ['campos' => ['aluno_nome']])->getContent());
        [, $arq] = $this->csv((string) $this->pedir($t, $g, 'arquivo', ['campos' => ['aluno_nome']])->getContent());

        $this->assertSame("'=CMD|CALC", $conf[0]['Nome do aluno']);
        $this->assertSame("'=CMD|CALC", $arq[0]['aluno_nome']);
    }

    public function test_geracao_e_auditada_com_campos_e_nada_fica_no_armazenamento(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->transportado($t, $g, 'Ana');

        $this->pedir($t, $g, 'arquivo', ['campos' => ['aluno_nome', 'placa']])->assertOk();
        $this->pedir($t, $g, 'conferencia', ['campos' => ['aluno_nome']])->assertOk();
        $this->pedir($t, $g, 'pre-validacao', ['campos' => ['aluno_nome']])->assertOk();

        $a = AuditLog::query()->where('action', 'censo.arquivo_gerado')->firstOrFail();
        $this->assertSame(2026, $a->after['ano_letivo']);
        $this->assertSame(1, $a->after['linhas']);
        $this->assertSame('basico-1', $a->after['leiaute']);
        $this->assertContains('placa', $a->after['campos']);
        $this->assertTrue(AuditLog::query()->where('action', 'censo.conferencia_gerada')->exists());
        $this->assertTrue(AuditLog::query()->where('action', 'censo.pre_validado')->exists());
        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_isolamento_do_censo_entre_tenants(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gA = $this->usuario($a, ['transporte_coordenacao']);
        $gB = $this->usuario($b, ['transporte_coordenacao']);
        $this->transportado($a, $gA);

        [, $linhas] = $this->csv((string) $this->pedir($b, $gB, 'arquivo')->getContent());
        $this->assertSame([], $linhas);
        $this->pedir($b, $gB, 'pre-validacao')->assertJsonPath('data.total_linhas', 0);
    }
}
