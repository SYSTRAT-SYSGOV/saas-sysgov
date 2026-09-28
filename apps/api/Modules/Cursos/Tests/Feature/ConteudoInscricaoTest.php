<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Services\MaterialService;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Área do participante: materiais, avaliações e nota de uma inscrição.
 */
final class ConteudoInscricaoTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->prepararCenarioAvaliacao();
    }

    protected function tearDown(): void
    {
        $this->liberarRelogio();
        parent::tearDown();
    }

    /**
     * @param array<string, mixed> $dados
     */
    private function material(array $dados = []): Material
    {
        return $this->noTenant($this->tenant, fn (): Material => app(MaterialService::class)->criar($this->curso, [
            'tipo' => 'texto', 'titulo' => 'Apostila', 'conteudo' => '<p>Conteúdo</p>', 'publicado' => true, ...$dados,
        ]));
    }

    /** @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response> */
    private function conteudo(?\App\Models\User $como = null, ?Inscricao $inscricao = null)
    {
        return $this->como($como ?? $this->aluno, $this->tenant)->getJson('/api/cursos/inscricoes/' . ($inscricao ?? $this->inscricao)->id . '/conteudo');
    }

    public function test_participante_ve_os_materiais_liberados_com_conteudo_e_os_bloqueados_so_com_titulo_e_data(): void
    {
        $this->travarRelogio(CarbonImmutable::parse(now('America/Sao_Paulo')->toDateString() . ' 12:00:00', 'America/Sao_Paulo'));
        $this->material(['titulo' => 'Liberado agora', 'descricao' => 'Leia primeiro']);
        $this->material(['tipo' => 'link', 'titulo' => 'Bloqueado', 'descricao' => 'Segredo da descrição', 'url' => 'https://exemplo.gov.br/x', 'liberacao_regra' => 'dias_apos_inicio', 'liberacao_dias' => 5]);
        $this->material(['tipo' => 'video', 'titulo' => 'Vídeo', 'url' => 'https://youtu.be/dQw4w9WgXcQ']);

        $resposta = $this->conteudo()->assertOk()->assertJsonPath('acesso', true)->assertJsonCount(3, 'materiais');

        $resposta->assertJsonPath('materiais.0.titulo', 'Liberado agora')->assertJsonPath('materiais.0.liberado', true)
            ->assertJsonPath('materiais.0.conteudo', '<p>Conteúdo</p>')->assertJsonPath('materiais.0.descricao', 'Leia primeiro')
            ->assertJsonPath('materiais.2.embed_url', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');

        // A turma começou ontem: "5 dias após o início" libera à meia-noite, daqui a 4 dias.
        $bloqueado = $resposta->json('materiais.1');
        $this->assertFalse($bloqueado['liberado']);
        $this->assertFalse($bloqueado['aguardando_agendamento']);
        $this->assertSame(now('America/Sao_Paulo')->addDays(4)->startOfDay()->toIso8601String(), CarbonImmutable::parse($bloqueado['prevista_em'])->setTimezone('America/Sao_Paulo')->toIso8601String());
        $this->assertSame(['id', 'tipo', 'titulo', 'ordem', 'aula_id', 'liberado', 'prevista_em', 'aguardando_agendamento'], array_keys($bloqueado));
        $this->assertStringNotContainsString('Segredo da descrição', (string) $resposta->getContent());
        $this->assertStringNotContainsString('exemplo.gov.br', (string) $resposta->getContent());
    }

    public function test_material_de_aula_sem_agendamento_aparece_aguardando_agendamento(): void
    {
        $aula = $this->aula($this->tenant, $this->curso);
        $this->material(['titulo' => 'Da aula', 'aula_id' => $aula->id, 'liberacao_regra' => 'inicio_aula']);

        $this->conteudo()->assertOk()->assertJsonPath('materiais.0.liberado', false)->assertJsonPath('materiais.0.aguardando_agendamento', true)->assertJsonPath('materiais.0.prevista_em', null);
    }

    public function test_materiais_despublicados_nao_aparecem(): void
    {
        $this->material(['titulo' => 'Publicado']);
        $this->material(['titulo' => 'Rascunho', 'publicado' => false]);

        $this->conteudo()->assertOk()->assertJsonCount(1, 'materiais')->assertJsonPath('materiais.0.titulo', 'Publicado');
    }

    public function test_pdf_traz_nome_e_tamanho_mas_nunca_o_caminho_interno(): void
    {
        $material = $this->material(['tipo' => 'arquivo', 'titulo' => 'PDF', 'conteudo' => null, 'publicado' => false]);
        $this->noTenant($this->tenant, function () use ($material): void {
            app(MaterialService::class)->definirArquivo($material, UploadedFile::fake()->createWithContent('apostila.pdf', "%PDF-1.4\n%%EOF\n"));
            $material->update(['publicado' => true]);
        });

        $resposta = $this->conteudo()->assertOk()->assertJsonPath('materiais.0.arquivo_nome', 'apostila.pdf');
        $this->assertStringNotContainsString('arquivo_path', (string) $resposta->getContent());
        $this->assertStringNotContainsString('.pdf"', str_replace('apostila.pdf', '', (string) $resposta->getContent()), 'o caminho gravado no disco não pode sair');
    }

    public function test_avaliacoes_com_tentativas_restantes_e_nota_obtida(): void
    {
        $q = $this->criarObjetiva();
        $avaliacao = $this->criarAvaliacaoPublicada([$q], ['tentativas_max' => 3, 'tempo_limite_minutos' => 30, 'instrucoes' => '<p>Leia</p>']);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responder($id, $q, ['alternativa_id' => $this->alternativaId($q, 0)])->assertOk();
        $this->enviarTentativa($id)->assertOk();

        $resposta = $this->conteudo()->assertOk();

        $resposta->assertJsonCount(1, 'avaliacoes')->assertJsonPath('avaliacoes.0.titulo', 'Prova final')
            ->assertJsonPath('avaliacoes.0.tentativas_usadas', 1)->assertJsonPath('avaliacoes.0.tentativas_restantes', 2)
            ->assertJsonPath('avaliacoes.0.melhor_nota', 10)->assertJsonPath('avaliacoes.0.pode_iniciar', true)
            ->assertJsonPath('avaliacoes.0.tentativa_em_andamento_id', null)->assertJsonPath('avaliacoes.0.questoes_total', 1)
            ->assertJsonPath('avaliacoes.0.instrucoes', '<p>Leia</p>')
            ->assertJsonPath('avaliacoes.0.tentativas.0.status', 'corrigida')->assertJsonPath('avaliacoes.0.tentativas.0.nota', '10.00')
            ->assertJsonPath('nota', 10)->assertJsonPath('nota_tipo', 'parcial');
    }

    public function test_limite_de_tentativas_e_tentativa_em_andamento_desligam_o_pode_iniciar(): void
    {
        $q = $this->criarObjetiva();
        $avaliacao = $this->criarAvaliacaoPublicada([$q], ['tentativas_max' => 1]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');

        $this->conteudo()->assertOk()->assertJsonPath('avaliacoes.0.pode_iniciar', false)->assertJsonPath('avaliacoes.0.tentativa_em_andamento_id', $id)->assertJsonPath('avaliacoes.0.tentativas_restantes', 0);

        $this->enviarTentativa($id)->assertOk();
        $this->conteudo()->assertOk()->assertJsonPath('avaliacoes.0.pode_iniciar', false)->assertJsonPath('avaliacoes.0.tentativa_em_andamento_id', null);
    }

    public function test_avaliacao_nao_liberada_sai_sem_instrucoes_e_sem_poder_iniciar(): void
    {
        $q = $this->criarObjetiva();
        $this->criarAvaliacaoPublicada([$q], ['instrucoes' => '<p>Instruções sigilosas</p>', 'liberacao_regra' => 'dias_apos_inicio', 'liberacao_dias' => 10]);

        $resposta = $this->conteudo()->assertOk()->assertJsonPath('avaliacoes.0.liberado', false)->assertJsonPath('avaliacoes.0.pode_iniciar', false);

        $this->assertNotNull($resposta->json('avaliacoes.0.prevista_em'));
        $this->assertStringNotContainsString('Instruções sigilosas', (string) $resposta->getContent());
    }

    public function test_avaliacao_nao_publicada_nao_aparece(): void
    {
        $q = $this->criarObjetiva();
        $avaliacao = $this->criarAvaliacaoPublicada([$q]);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$avaliacao->id}/despublicar")->assertOk();

        $this->conteudo()->assertOk()->assertJsonCount(0, 'avaliacoes')->assertJsonPath('nota', null);
    }

    public function test_tentativa_vencida_e_fechada_na_consulta(): void
    {
        $inicio = CarbonImmutable::now()->startOfMinute();
        $this->travarRelogio($inicio);
        $q = $this->criarObjetiva();
        $avaliacao = $this->criarAvaliacaoPublicada([$q], ['tempo_limite_minutos' => 10, 'tentativas_max' => 2]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responder($id, $q, ['alternativa_id' => $this->alternativaId($q, 0)])->assertOk();

        $this->travarRelogio($inicio->addMinutes(20));

        $this->conteudo()->assertOk()->assertJsonPath('avaliacoes.0.tentativa_em_andamento_id', null)->assertJsonPath('avaliacoes.0.tentativas.0.status', 'corrigida')
            ->assertJsonPath('avaliacoes.0.tentativas.0.nota', '10.00')->assertJsonPath('avaliacoes.0.pode_iniciar', true);
    }

    public function test_nota_da_tentativa_so_aparece_depois_da_correcao(): void
    {
        $dissertativa = $this->criarDissertativa();
        $avaliacao = $this->criarAvaliacaoPublicada([$dissertativa]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responder($id, $dissertativa, ['texto' => 'Resposta'])->assertOk();
        $this->enviarTentativa($id)->assertOk();

        $this->conteudo()->assertOk()->assertJsonPath('avaliacoes.0.tentativas.0.status', 'aguardando_correcao')->assertJsonPath('avaliacoes.0.tentativas.0.nota', null)->assertJsonPath('avaliacoes.0.melhor_nota', null);

        $this->como($this->instrutor, $this->tenant)->putJson("/api/cursos/tentativas/{$id}/respostas/{$dissertativa->id}/correcao", ['pontos' => 1])->assertOk();
        $this->conteudo()->assertOk()->assertJsonPath('avaliacoes.0.tentativas.0.nota', '5.00')->assertJsonPath('avaliacoes.0.melhor_nota', 5);
    }

    public function test_nota_final_depois_do_encerramento(): void
    {
        $this->registrarPresencas($this->inscricao, $this->agendarAulasRealizadas(4), 4);
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 8.0);
        $this->encerrarTurma()->assertOk();

        $this->conteudo()->assertOk()->assertJsonPath('nota', 8)->assertJsonPath('nota_tipo', 'final')->assertJsonPath('status', 'concluida');
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/inscricoes/{$this->inscricao->id}")->assertOk()->assertJsonPath('nota', 8);
    }

    public function test_inscricao_sem_acesso_nao_recebe_materiais_nem_avaliacoes(): void
    {
        $this->material();
        $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);

        foreach (['pendente', 'lista_espera', 'cancelada'] as $status) {
            $this->noTenant($this->tenant, fn () => Inscricao::query()->whereKey($this->inscricao->id)->update(['status' => $status]));

            $this->conteudo()->assertOk()->assertJsonPath('acesso', false)->assertJsonPath('materiais', [])->assertJsonPath('avaliacoes', [])->assertJsonPath('nota', null);
        }
    }

    public function test_nao_pode_iniciar_com_a_turma_encerrada_mas_o_conteudo_continua_visivel(): void
    {
        $this->material();
        $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);
        $this->registrarPresencas($this->inscricao, $this->agendarAulasRealizadas(4), 4);
        $this->encerrarTurma()->assertOk();

        $this->conteudo()->assertOk()->assertJsonCount(1, 'materiais')->assertJsonPath('materiais.0.liberado', true)->assertJsonPath('avaliacoes.0.pode_iniciar', false);
    }

    public function test_so_o_dono_o_instrutor_da_turma_e_o_administrador_consultam(): void
    {
        $this->material();
        $outro = $this->usuario($this->tenant, ['participante_cursos'], 'Outro aluno');
        $outroInstrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Outro instrutor');

        $this->conteudo($outro)->assertForbidden();
        $this->conteudo($outroInstrutor)->assertForbidden();
        $this->conteudo($this->instrutor)->assertOk();
        $this->conteudo($this->admin)->assertOk();
    }

    public function test_inscricao_de_outro_tenant_responde_404(): void
    {
        $tenantB = $this->criarTenant('prefeitura-b');
        $adminB = $this->usuario($tenantB, ['admin_cursos'], 'Admin B');

        $this->como($adminB, $tenantB)->getJson("/api/cursos/inscricoes/{$this->inscricao->id}/conteudo")->assertNotFound();
    }

    public function test_nota_parcial_na_lista_de_inscritos_e_nas_minhas_inscricoes(): void
    {
        $outro = $this->usuario($this->tenant, ['participante_cursos'], 'Outro aluno');
        $outraInscricao = $this->inscrever($this->tenant, $this->turma, $outro);
        $avaliacao = $this->avaliacaoDireta();
        $this->tentativaDireta($avaliacao, $this->inscricao, 'corrigida', 7.5);

        $lista = $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/inscricoes")->assertOk()->json();
        $porId = array_column($lista, null, 'id');
        $this->assertSame(7.5, $porId[$this->inscricao->id]['nota']);
        $this->assertSame(0, $porId[$outraInscricao->id]['nota']);

        $this->como($this->aluno, $this->tenant)->getJson('/api/cursos/minhas-inscricoes')->assertOk()->assertJsonPath('0.nota', 7.5);
    }

    public function test_curso_sem_avaliacao_nao_tem_nota_na_lista(): void
    {
        $lista = $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/inscricoes")->assertOk()->json();

        $this->assertNull($lista[0]['nota']);
    }
}
