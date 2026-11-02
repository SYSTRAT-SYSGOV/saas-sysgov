<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Transporte\Models\CensoExtra;
use Modules\Transporte\Models\Importacao;
use Modules\Transporte\Tests\Concerns\ArquivoEducacenso;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;
use Symfony\Component\HttpFoundation\Response;

final class ImportacaoCensoTest extends TestCase
{
    use ArquivoEducacenso;
    use CenarioTransporte;
    use RefreshDatabase;

    private const ESCOLA = '41000001';

    /** @return TestResponse<Response> */
    private function previa(Tenant $t, User $u, UploadedFile $arquivo, ?int $leiauteId = null): TestResponse
    {
        return $this->como($u, $t)->post('/api/transporte/censo/importacao/previa', ['arquivo' => $arquivo, 'leiaute_id' => $leiauteId], ['Accept' => 'application/json']);
    }

    /**
     * @param array<string, mixed> $opcoes
     * @return array<string, mixed>
     */
    private function confirmar(Tenant $t, User $u, int $id, array $opcoes = []): array
    {
        $this->como($u, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar", $opcoes)->assertStatus(202);

        return $this->como($u, $t)->getJson("/api/transporte/importacoes/{$id}")->assertOk()->json('data');
    }

    /**
     * Cenário base: escola cadastrada com Inep e dois alunos cadastrados, nenhum com Inep.
     *
     * @return array{0: Tenant, 1: User, 2: Escola, 3: Aluno, 4: Aluno}
     */
    private function cenario(): array
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t, 'Escola Municipal Rio Claro');
        $escola->update(['inep' => self::ESCOLA]);
        $maria = $this->criarAluno($t, $escola, 'MARIA DA SILVA', extra: ['cpf' => $this->cpf(11), 'nascimento' => '2015-03-10']);
        $joao = $this->criarAluno($t, $escola, 'JOÃO PEREIRA', extra: ['nascimento' => '2014-07-21']);

        return [$t, $g, $escola, $maria, $joao];
    }

    public function test_previa_concilia_por_cpf_e_por_nome_sem_gravar_e_a_confirmacao_grava_so_o_inep_e_os_extras(): void
    {
        [$t, $g, , $maria, $joao] = $this->cenario();
        $antes = Aluno::query()->withoutGlobalScope('escola')->count();
        $arquivo = $this->arquivoCenso([
            $this->registroEscola(self::ESCOLA), $this->registroTurma(self::ESCOLA, 'T1'),
            $this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11), '81111111'),
            $this->registroPessoa(self::ESCOLA, '1002', 'JOAO PEREIRA', '21/07/2014'),
            $this->registroPessoa(self::ESCOLA, '1003', 'PEDRO INEXISTENTE', '01/01/2013'),
            $this->registroMatricula(self::ESCOLA, '1001', 'T1'), $this->registroMatricula(self::ESCOLA, '1002', 'T1'),
            $this->registroMatricula(self::ESCOLA, '1003', 'T1'),
        ]);

        $r = $this->previa($t, $g, $arquivo)->assertCreated();

        $r->assertJsonPath('data.status', 'previa')->assertJsonPath('data.total', 3)->assertJsonPath('data.validas', 2)->assertJsonPath('data.ignoradas', 1);
        $r->assertJsonPath('data.resumo.casados_cpf', 1)->assertJsonPath('data.resumo.casados_nome', 1)->assertJsonPath('data.resumo.alunos_nao_cadastrados', 1);
        $r->assertJsonPath('data.resumo.sem_alocacao', 2)->assertJsonPath('data.leiaute.nome', 'Educacenso 2023');
        $this->assertNull($maria->refresh()->inep_id, 'a prévia não grava');
        $this->assertSame(0, CensoExtra::query()->count());
        $this->assertCount(1, Storage::disk('local')->allFiles());

        $final = $this->confirmar($t, $g, $r->json('data.id'));

        $this->assertSame('concluida', $final['status']);
        $this->assertSame(2, $final['criadas']);
        $this->assertSame('1001', $maria->refresh()->inep_id);
        $this->assertSame('1002', $joao->refresh()->inep_id);
        $this->assertSame($antes, Aluno::query()->withoutGlobalScope('escola')->count(), 'nenhum aluno é criado');
        $this->assertSame('MARIA DA SILVA', $maria->nome, 'o nome não é alterado');
        $extra = CensoExtra::query()->where('entidade', 'aluno')->where('entidade_id', $maria->id)->where('chave', 'pessoa_cep')->firstOrFail();
        $this->assertSame(['81111111', true], [$extra->valor, $extra->sensivel]);
        $this->assertSame('Rural', CensoExtra::query()->where('entidade_id', $maria->id)->where('chave', 'pessoa_localizacao')->value('valor'));
        $this->assertSame('Municipal', CensoExtra::query()->where('entidade', 'escola')->where('chave', 'escola_dependencia')->value('valor'));
        $this->assertSame([], Storage::disk('local')->allFiles(), 'o arquivo é apagado ao confirmar');
    }

    public function test_aluno_reconhecido_pelo_inep_ja_cadastrado_so_recebe_os_extras(): void
    {
        [$t, $g, , $maria] = $this->cenario();
        $maria->update(['inep_id' => '1001']);
        $arquivo = $this->arquivoCenso([
            $this->registroPessoa(self::ESCOLA, '1001', 'NOME DIFERENTE NO ARQUIVO', '10/03/2015', cep: '82222222'), $this->registroMatricula(self::ESCOLA, '1001', 'T1'),
        ]);

        $r = $this->previa($t, $g, $arquivo)->assertCreated()->assertJsonPath('data.resumo.casados_inep', 1);
        $final = $this->confirmar($t, $g, $r->json('data.id'));

        $this->assertSame(0, $final['criadas']);
        $this->assertSame('MARIA DA SILVA', $maria->refresh()->nome);
        $this->assertSame('82222222', CensoExtra::query()->where('entidade_id', $maria->id)->where('chave', 'pessoa_cep')->value('valor'));
    }

    public function test_matricula_sem_transporte_e_ignorada(): void
    {
        [$t, $g, , $maria] = $this->cenario();
        $arquivo = $this->arquivoCenso([
            $this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula(self::ESCOLA, '1001', 'T1', '0'),
        ]);

        $this->previa($t, $g, $arquivo)->assertCreated()->assertJsonPath('data.total', 0)->assertJsonPath('data.resumo.matriculas_lidas', 1);
        $this->assertNull($maria->refresh()->inep_id);
    }

    public function test_escola_nao_cadastrada_vira_pendencia_e_os_alunos_dela_nao_sao_processados(): void
    {
        [$t, $g] = $this->cenario();
        $arquivo = $this->arquivoCenso([
            $this->registroPessoa('99999999', '2001', 'ALUNO ESTADUAL UM', '01/01/2012'), $this->registroPessoa('99999999', '2002', 'ALUNO ESTADUAL DOIS', '01/01/2011'),
            $this->registroMatricula('99999999', '2001', 'T9'), $this->registroMatricula('99999999', '2002', 'T9'),
        ]);

        $r = $this->previa($t, $g, $arquivo)->assertCreated();

        $r->assertJsonPath('data.escolas_pendentes.0.inep', '99999999')->assertJsonPath('data.escolas_pendentes.0.alunos', 2)
            ->assertJsonPath('data.resumo.alunos_em_escola_nao_cadastrada', 2)->assertJsonPath('data.ignoradas', 2)->assertJsonPath('data.validas', 0);
        $this->assertSame(1, Escola::query()->count(), 'nenhuma escola é criada');
    }

    public function test_dois_candidatos_por_nome_e_nascimento_ficam_ambiguos_e_nada_e_alterado(): void
    {
        [$t, $g, $escola] = $this->cenario();
        $this->criarAluno($t, $escola, 'ANA SOUZA', extra: ['nascimento' => '2013-05-05']);
        $this->criarAluno($t, $escola, 'ANA SOUZA', extra: ['nascimento' => '2013-05-05']);
        $arquivo = $this->arquivoCenso([$this->registroPessoa(self::ESCOLA, '3001', 'ANA SOUZA', '05/05/2013'), $this->registroMatricula(self::ESCOLA, '3001', 'T1')]);

        $r = $this->previa($t, $g, $arquivo)->assertCreated();
        $final = $this->confirmar($t, $g, $r->json('data.id'));

        $this->assertSame('aluno_ambiguo', $final['divergencias'][0]['codigo']);
        $this->assertSame(1, $final['resumo']['alunos_ambiguos']);
        $this->assertSame(0, Aluno::query()->withoutGlobalScope('escola')->whereNotNull('inep_id')->count());
    }

    public function test_desligar_o_casamento_por_nome_na_confirmacao(): void
    {
        [$t, $g, , , $joao] = $this->cenario();
        $arquivo = $this->arquivoCenso([$this->registroPessoa(self::ESCOLA, '1002', 'JOAO PEREIRA', '21/07/2014'), $this->registroMatricula(self::ESCOLA, '1002', 'T1')]);
        $id = $this->previa($t, $g, $arquivo)->assertJsonPath('data.resumo.casados_nome', 1)->json('data.id');

        $final = $this->confirmar($t, $g, $id, ['casar_por_nome' => false]);

        $this->assertSame(0, $final['validas']);
        $this->assertSame(1, $final['resumo']['alunos_nao_cadastrados']);
        $this->assertNull($joao->refresh()->inep_id);
    }

    public function test_inep_diferente_do_cadastrado_e_divergencia_e_nao_altera(): void
    {
        [$t, $g, , $maria] = $this->cenario();
        $maria->update(['inep_id' => '5555']);
        $arquivo = $this->arquivoCenso([$this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula(self::ESCOLA, '1001', 'T1')]);

        $final = $this->confirmar($t, $g, $this->previa($t, $g, $arquivo)->json('data.id'));

        $this->assertSame('inep_divergente', $final['divergencias'][0]['codigo']);
        $this->assertSame('5555', $maria->refresh()->inep_id);
    }

    public function test_aluno_de_outra_escola_e_divergencia_e_nao_e_alterado(): void
    {
        [$t, $g, , $maria] = $this->cenario();
        $outra = $this->criarEscola($t, 'Outra Escola');
        $outra->update(['inep' => '41000002']);
        $arquivo = $this->arquivoCenso([$this->registroPessoa('41000002', '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula('41000002', '1001', 'T1')]);

        $final = $this->confirmar($t, $g, $this->previa($t, $g, $arquivo)->json('data.id'));

        $this->assertSame('escola_divergente', $final['divergencias'][0]['codigo']);
        $this->assertNull($maria->refresh()->inep_id);
        $this->assertSame(0, CensoExtra::query()->where('entidade', 'aluno')->count());
    }

    public function test_inep_de_aluno_com_outro_cpf_e_divergencia_e_nada_e_alterado(): void
    {
        [$t, $g, $escola, $maria] = $this->cenario();
        $dono = $this->criarAluno($t, $escola, 'CARLOS LIMA', extra: ['cpf' => $this->cpf(22), 'nascimento' => '2012-02-02', 'inep_id' => '1001']);
        $arquivo = $this->arquivoCenso([$this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula(self::ESCOLA, '1001', 'T1')]);

        $final = $this->confirmar($t, $g, $this->previa($t, $g, $arquivo)->json('data.id'));

        $this->assertSame('cpf_divergente', $final['divergencias'][0]['codigo']);
        $this->assertSame(0, $final['validas']);
        $this->assertSame('1001', $dono->refresh()->inep_id);
        $this->assertNull($maria->refresh()->inep_id);
        $this->assertSame(0, CensoExtra::query()->where('entidade', 'aluno')->count());
    }

    public function test_alunos_com_alocacao_ativa_nao_entram_na_contagem_de_sem_alocacao(): void
    {
        [$t, $g, $escola, $maria] = $this->cenario();
        $rota = $this->rotaPronta($t, $g, 5, escola: $escola);
        $this->alocar($t, $g, $rota['rota'], $rota['parada'], $maria)->assertCreated();
        $arquivo = $this->arquivoCenso([
            $this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula(self::ESCOLA, '1001', 'T1'),
            $this->registroPessoa(self::ESCOLA, '1002', 'JOAO PEREIRA', '21/07/2014'), $this->registroMatricula(self::ESCOLA, '1002', 'T1'),
        ]);

        $this->previa($t, $g, $arquivo)->assertCreated()->assertJsonPath('data.resumo.sem_alocacao', 1)->assertJsonPath('data.sem_alocacao', 1);
    }

    public function test_relatorio_e_auditoria_nao_levam_cpf_nome_nem_filiacao(): void
    {
        [$t, $g] = $this->cenario();
        $arquivo = $this->arquivoCenso([
            $this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula(self::ESCOLA, '1001', 'T1'),
            $this->registroPessoa(self::ESCOLA, '7777', 'FULANO SIGILOSO', '01/01/2010', $this->cpf(77)), $this->registroMatricula(self::ESCOLA, '7777', 'T1'),
        ]);
        $this->confirmar($t, $g, $this->previa($t, $g, $arquivo)->json('data.id'));

        $texto = json_encode(Importacao::query()->get()->toArray(), JSON_UNESCAPED_UNICODE) . json_encode(AuditLog::query()->where('module', 'transporte')->get()->toArray(), JSON_UNESCAPED_UNICODE);

        foreach (['FULANO', 'SIGILOSO', 'MARIA DA SILVA', $this->cpf(11), $this->cpf(77), '81000000'] as $proibido) {
            $this->assertStringNotContainsString($proibido, $texto, "vazou: {$proibido}");
        }
        $this->assertNotNull(AuditLog::query()->where('action', 'importacao.concluida')->first());
    }

    public function test_arquivo_sem_nenhum_registro_conhecido_e_recusado_e_nao_fica_guardado(): void
    {
        [$t, $g] = $this->cenario();

        $this->previa($t, $g, UploadedFile::fake()->createWithContent('lixo.txt', "nome;idade\nAna;10\n"))->assertStatus(422);

        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->assertSame(0, Importacao::query()->count());
    }

    public function test_arquivo_binario_e_recusado(): void
    {
        [$t, $g] = $this->cenario();

        $this->previa($t, $g, UploadedFile::fake()->createWithContent('x.bin', "00|a\0b|c\n"))->assertStatus(422);
    }

    public function test_leiaute_ajustado_pelo_orgao_muda_a_coluna_lida(): void
    {
        [$t, $g, , $maria] = $this->cenario();
        $lista = $this->como($g, $t)->getJson('/api/transporte/censo/importacao/leiautes')->json('data');
        $id = $lista[0]['id'];
        // No arquivo deste ano o CPF passou para a coluna 12 e o transporte para a 25.
        $this->como($g, $t)->putJson("/api/transporte/censo/importacao/leiautes/{$id}", ['campos' => [['chave' => 'pessoa_cpf', 'posicao' => 12], ['chave' => 'transporte_publico', 'posicao' => 25]]])->assertOk();
        $pessoa = $this->registro('30', [1 => self::ESCOLA, 2 => '1001', 5 => 'MARIA DA SILVA', 6 => '10/03/2015', 12 => $this->cpf(11)]);
        $mat = $this->registro('60', [1 => self::ESCOLA, 2 => '1001', 4 => 'T1', 25 => '1']);

        $r = $this->previa($t, $g, $this->arquivoCenso([$pessoa, $mat]), $id)->assertCreated();

        $r->assertJsonPath('data.resumo.casados_cpf', 1);
        $this->confirmar($t, $g, $r->json('data.id'));
        $this->assertSame('1001', $maria->refresh()->inep_id);
    }

    public function test_campo_personalizado_e_guardado_como_extra_do_aluno(): void
    {
        [$t, $g, , $maria] = $this->cenario();
        $id = $this->como($g, $t)->getJson('/api/transporte/censo/importacao/leiautes')->json('data.0.id');
        $this->como($g, $t)->putJson("/api/transporte/censo/importacao/leiautes/{$id}", ['campos' => [
            ['chave' => 'poder_publico', 'registro' => '60', 'posicao' => 21, 'rotulo' => 'Poder público responsável', 'tipo' => 'codigo', 'mapa' => ['1' => 'Estadual', '2' => 'Municipal']],
        ]])->assertOk();
        $mat = $this->registro('60', [1 => self::ESCOLA, 2 => '1001', 4 => 'T1', 20 => '1', 21 => '2']);
        $pessoa = $this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11));

        $this->confirmar($t, $g, $this->previa($t, $g, $this->arquivoCenso([$pessoa, $mat]))->json('data.id'));

        $this->assertSame('Municipal', CensoExtra::query()->where('entidade_id', $maria->id)->where('chave', 'poder_publico')->value('valor'));
    }

    public function test_teste_do_leiaute_mostra_amostras_mascara_dado_sensivel_e_alerta_valor_incoerente(): void
    {
        [$t, $g] = $this->cenario();
        $arquivo = $this->arquivoCenso([
            $this->registroEscola(self::ESCOLA),
            $this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '31/02/2015', $this->cpf(11)),
            $this->registroMatricula(self::ESCOLA, '1001', 'T1'), 'ZZ|desconhecido',
        ]);

        $r = $this->como($g, $t)->post('/api/transporte/censo/importacao/testar', ['arquivo' => $arquivo], ['Accept' => 'application/json'])->assertOk();

        $this->assertSame(1, $r->json('data.desconhecidos'));
        $registros = array_column($r->json('data.registros'), null, 'registro');
        $this->assertSame(1, $registros['30']['linhas']);
        $amostra = array_column($registros['30']['amostras'][0], null, 'chave');
        $this->assertSame('***.***.***-' . substr($this->cpf(11), -2), $amostra['pessoa_cpf']['valor']);
        $this->assertSame('M***', $amostra['pessoa_nome']['valor']);
        $this->assertStringContainsString('não é uma data', (string) $amostra['pessoa_nascimento']['alerta']);
        $this->assertContains('valor_incoerente', array_column($r->json('data.alertas'), 'codigo'));
        $this->assertStringNotContainsString('MARIA', (string) $r->getContent());
    }

    public function test_teste_do_leiaute_avisa_quando_a_coluna_configurada_nao_existe_na_linha(): void
    {
        [$t, $g] = $this->cenario();
        $arquivo = $this->arquivoCenso(['60|41000001|1001||T1|x']);

        $r = $this->como($g, $t)->post('/api/transporte/censo/importacao/testar', ['arquivo' => $arquivo], ['Accept' => 'application/json'])->assertOk();

        $this->assertContains('coluna_inexistente', array_column($r->json('data.alertas'), 'codigo'));
    }

    public function test_permissoes_e_isolamento_de_tenant(): void
    {
        [$t, $g, , $maria] = $this->cenario();
        $consulta = $this->usuario($t, ['transporte_consulta']);
        $operador = $this->usuario($t, ['transporte_operador']);
        $arquivo = fn (): UploadedFile => $this->arquivoCenso([$this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula(self::ESCOLA, '1001', 'T1')]);

        $this->previa($t, $consulta, $arquivo())->assertForbidden();
        $this->como($consulta, $t)->post('/api/transporte/censo/importacao/testar', ['arquivo' => $arquivo()], ['Accept' => 'application/json'])->assertForbidden();
        $id = $this->previa($t, $operador, $arquivo())->assertCreated()->json('data.id');
        $this->como($consulta, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertForbidden();

        // Outro órgão tem a mesma escola (mesmo Inep) e o mesmo aluno: nada dele é tocado.
        $b = $this->criarTenant('prefeitura-b');
        $gb = $this->usuario($b, ['transporte_coordenacao']);
        $escolaB = $this->criarEscola($b, 'Escola B');
        $escolaB->update(['inep' => self::ESCOLA]);
        $alunoB = $this->criarAluno($b, $escolaB, 'MARIA DA SILVA', extra: ['cpf' => $this->cpf(11), 'nascimento' => '2015-03-10']);
        $this->como($gb, $b)->getJson("/api/transporte/importacoes/{$id}")->assertNotFound();

        $this->confirmar($t, $operador, $id);

        $this->assertSame('1001', $maria->refresh()->inep_id);
        $this->assertNull($alunoB->refresh()->inep_id);
        $this->assertSame(0, CensoExtra::query()->withoutGlobalScope('tenant')->where('tenant_id', $b->id)->count());
    }

    public function test_confirmar_duas_vezes_e_recusado(): void
    {
        [$t, $g] = $this->cenario();
        $arquivo = $this->arquivoCenso([$this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula(self::ESCOLA, '1001', 'T1')]);
        $id = $this->previa($t, $g, $arquivo)->json('data.id');
        $this->confirmar($t, $g, $id);

        $this->como($g, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertStatus(409);
    }

    public function test_cancelar_a_previa_apaga_o_arquivo(): void
    {
        [$t, $g] = $this->cenario();
        $arquivo = $this->arquivoCenso([$this->registroPessoa(self::ESCOLA, '1001', 'MARIA DA SILVA', '10/03/2015', $this->cpf(11)), $this->registroMatricula(self::ESCOLA, '1001', 'T1')]);
        $id = $this->previa($t, $g, $arquivo)->json('data.id');

        $this->como($g, $t)->deleteJson("/api/transporte/importacoes/{$id}")->assertOk();

        $this->assertSame([], Storage::disk('local')->allFiles());
    }
}
