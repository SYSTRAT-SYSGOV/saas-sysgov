<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\RespostaInscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 4.3 — respostas do formulário na inscrição (design D9): validação por tipo,
 * obrigatórios, snapshot de rótulo/tipo, gravadas na mesma transação da inscrição.
 */
final class RespostaInscricaoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private Curso $curso;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->curso = $this->cursoPublicado($this->tenant);
        $this->turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
    }

    /** @param array<string, mixed> $sobrescrever */
    private function criarCampo(array $sobrescrever = []): CampoInscricao
    {
        $id = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/campos-inscricao", [
            'rotulo' => 'Tamanho da camiseta',
            'tipo' => 'texto',
            ...$sobrescrever,
        ])->assertCreated()->json('id');

        return $this->noTenant($this->tenant, fn () => CampoInscricao::findOrFail($id));
    }

    private function participante(string $nome = 'Participante'): User
    {
        return $this->usuario($this->tenant, ['participante_cursos'], $nome);
    }

    /**
     * @param array<int, array{campo_id: int, valor: mixed}> $respostas
     * @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function inscrever(User $user, array $respostas = [])
    {
        return $this->como($user, $this->tenant)->postJson("/api/cursos/turmas/{$this->turma->id}/inscricoes", ['respostas' => $respostas]);
    }

    public function test_cenario_campo_obrigatorio(): void
    {
        $campo = $this->criarCampo(['obrigatorio' => true]);
        $user = $this->participante();

        $resposta = $this->inscrever($user, []);
        $this->assertErroDeNegocio($resposta, 'é obrigatório');
        $this->assertStringContainsString($campo->rotulo, (string) $resposta->json('error'));
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Inscricao::count()));
    }

    public function test_campo_opcional_sem_resposta_nao_bloqueia_a_inscricao(): void
    {
        $this->criarCampo(['obrigatorio' => false]);
        $user = $this->participante();

        $this->inscrever($user, [])->assertCreated();
    }

    public function test_cenario_selecao_com_opcao_inexistente(): void
    {
        $campo = $this->criarCampo(['tipo' => 'selecao', 'opcoes' => ['Manhã', 'Tarde']]);
        $user = $this->participante();

        $resposta = $this->inscrever($user, [['campo_id' => $campo->id, 'valor' => 'Madrugada']]);
        $this->assertErroDeNegocio($resposta, 'não aceita o valor informado');
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Inscricao::count()));
    }

    public function test_numero_invalido_e_recusado(): void
    {
        $campo = $this->criarCampo(['tipo' => 'numero']);
        $user = $this->participante();

        $this->assertErroDeNegocio($this->inscrever($user, [['campo_id' => $campo->id, 'valor' => 'abc']]), 'precisa de um número');
    }

    public function test_data_invalida_e_recusada(): void
    {
        $campo = $this->criarCampo(['tipo' => 'data']);
        $user = $this->participante();

        $this->assertErroDeNegocio($this->inscrever($user, [['campo_id' => $campo->id, 'valor' => '31/12/2026']]), 'data válida');
    }

    public function test_caixa_marcacao_so_aceita_sim_ou_nao(): void
    {
        $campo = $this->criarCampo(['tipo' => 'caixa_marcacao']);
        $user = $this->participante();

        $this->assertErroDeNegocio($this->inscrever($user, [['campo_id' => $campo->id, 'valor' => 'talvez']]), 'só aceita');
    }

    public function test_cenario_inscricao_com_formulario_configurado(): void
    {
        $texto = $this->criarCampo(['rotulo' => 'Alergia', 'tipo' => 'texto']);
        $numero = $this->criarCampo(['rotulo' => 'Idade', 'tipo' => 'numero']);
        $data = $this->criarCampo(['rotulo' => 'Nascimento', 'tipo' => 'data']);
        $selecao = $this->criarCampo(['rotulo' => 'Turno', 'tipo' => 'selecao', 'opcoes' => ['Manhã', 'Tarde']]);
        $caixa = $this->criarCampo(['rotulo' => 'Aceita fotos?', 'tipo' => 'caixa_marcacao']);
        $user = $this->participante();

        $resposta = $this->inscrever($user, [
            ['campo_id' => $texto->id, 'valor' => '<b>Nenhuma</b>'],
            ['campo_id' => $numero->id, 'valor' => 42],
            ['campo_id' => $data->id, 'valor' => '1990-05-20'],
            ['campo_id' => $selecao->id, 'valor' => 'Tarde'],
            ['campo_id' => $caixa->id, 'valor' => 'sim'],
        ])->assertCreated();

        $inscricaoId = $resposta->json('id');
        $respostas = $this->noTenant($this->tenant, fn () => RespostaInscricao::where('inscricao_id', $inscricaoId)->get()->keyBy('campo_id'));

        $this->assertSame(5, $respostas->count());
        $this->assertSame('Nenhuma', $respostas[$texto->id]->valor); // texto puro: <b> removido
        $this->assertSame('42', $respostas[$numero->id]->valor);
        $this->assertSame('1990-05-20', $respostas[$data->id]->valor);
        $this->assertSame('Tarde', $respostas[$selecao->id]->valor);
        $this->assertSame('sim', $respostas[$caixa->id]->valor);
        $this->assertSame('Turno', $respostas[$selecao->id]->rotulo);
        $this->assertSame('selecao', $respostas[$selecao->id]->tipo);
    }

    public function test_cenario_campo_editado_depois_da_resposta(): void
    {
        $campo = $this->criarCampo(['rotulo' => 'Rótulo Original', 'tipo' => 'texto']);
        $user = $this->participante();

        $inscricaoId = $this->inscrever($user, [['campo_id' => $campo->id, 'valor' => 'Minha resposta']])
            ->assertCreated()->json('id');

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/campos-inscricao/{$campo->id}", ['rotulo' => 'Rótulo Novo'])->assertOk();

        $respostaGravada = $this->noTenant($this->tenant, fn () => RespostaInscricao::where('inscricao_id', $inscricaoId)->where('campo_id', $campo->id)->sole());
        $this->assertSame('Rótulo Original', $respostaGravada->rotulo);
        $this->assertSame('Rótulo Novo', $campo->fresh()->rotulo);
    }

    public function test_campo_desativado_nao_e_pedido_nem_grava_resposta_enviada(): void
    {
        $campo = $this->criarCampo(['obrigatorio' => true]);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/campos-inscricao/{$campo->id}/desativar")->assertOk();
        $user = $this->participante();

        // Sem resposta: não bloqueia mais (desativado não é obrigatório pra inscrições novas).
        $inscricaoId = $this->inscrever($user, [])->assertCreated()->json('id');
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => RespostaInscricao::where('inscricao_id', $inscricaoId)->count()));
    }

    public function test_inscricao_direta_pelo_administrador_tambem_grava_respostas(): void
    {
        $campo = $this->criarCampo(['obrigatorio' => true]);
        $alvo = $this->participante('Alvo');

        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$this->turma->id}/inscricoes/direta", [
            'user_id' => $alvo->id,
            'respostas' => [['campo_id' => $campo->id, 'valor' => 'M']],
        ])->assertCreated();

        $this->assertSame(1, $this->noTenant($this->tenant, fn () => RespostaInscricao::where('inscricao_id', $resposta->json('id'))->count()));
    }
}
