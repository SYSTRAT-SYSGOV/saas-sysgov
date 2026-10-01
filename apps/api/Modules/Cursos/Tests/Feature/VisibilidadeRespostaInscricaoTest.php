<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\RespostaInscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 4.4 — visibilidade e imutabilidade das respostas do formulário de inscrição (design D9):
 * mesma regra do `InscricaoPolicy::view`, mas negada com 404 (não 403); imutáveis depois do
 * encerramento da turma.
 */
final class VisibilidadeRespostaInscricaoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private Curso $curso;

    private Turma $turma;

    private CampoInscricao $campo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->curso = $this->cursoPublicado($this->tenant);
        $this->turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
        $this->campo = $this->noTenant($this->tenant, fn () => CampoInscricao::create([
            'curso_id' => $this->curso->id, 'rotulo' => 'Alergia', 'tipo' => 'texto', 'ordem' => 1,
        ]));
    }

    /** @return array{0: User, 1: int} */
    private function inscrever(string $nome): array
    {
        $user = $this->usuario($this->tenant, ['participante_cursos'], $nome);
        $inscricaoId = $this->como($user, $this->tenant)
            ->postJson("/api/cursos/turmas/{$this->turma->id}/inscricoes", [
                'respostas' => [['campo_id' => $this->campo->id, 'valor' => "Resposta de {$nome}"]],
            ])->assertCreated()->json('id');

        return [$user, $inscricaoId];
    }

    public function test_participante_ve_a_propria_resposta(): void
    {
        [$ana, $inscricaoId] = $this->inscrever('Ana');

        $this->como($ana, $this->tenant)->getJson("/api/cursos/inscricoes/{$inscricaoId}/respostas")
            ->assertOk()
            ->assertJsonPath('0.valor', 'Resposta de Ana');
    }

    public function test_cenario_participante_ve_a_resposta_de_outra_pessoa(): void
    {
        [, $inscricaoDeAna] = $this->inscrever('Ana');
        $bruno = $this->usuario($this->tenant, ['participante_cursos'], 'Bruno');

        $this->como($bruno, $this->tenant)->getJson("/api/cursos/inscricoes/{$inscricaoDeAna}/respostas")->assertNotFound();
    }

    public function test_administrador_ve_qualquer_resposta(): void
    {
        [, $inscricaoDeAna] = $this->inscrever('Ana');

        $this->como($this->admin, $this->tenant)->getJson("/api/cursos/inscricoes/{$inscricaoDeAna}/respostas")
            ->assertOk()->assertJsonPath('0.valor', 'Resposta de Ana');
    }

    public function test_instrutor_da_turma_ve_a_resposta(): void
    {
        [, $inscricaoDeAna] = $this->inscrever('Ana');

        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/inscricoes/{$inscricaoDeAna}/respostas")->assertOk();
    }

    public function test_instrutor_de_outra_turma_nao_ve_a_resposta(): void
    {
        [, $inscricaoDeAna] = $this->inscrever('Ana');
        $outroCurso = $this->cursoPublicado($this->tenant, ['titulo' => 'Outro Curso']);
        $outroInstrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor de Outra Turma');
        $this->turmaAberta($this->tenant, $outroCurso, $outroInstrutor);

        $this->como($outroInstrutor, $this->tenant)->getJson("/api/cursos/inscricoes/{$inscricaoDeAna}/respostas")->assertNotFound();
    }

    public function test_isolamento_entre_tenants(): void
    {
        [, $inscricaoDeAna] = $this->inscrever('Ana');
        $outroTenant = $this->criarTenant('prefeitura-b');
        $adminOutroTenant = $this->usuario($outroTenant, ['admin_cursos'], 'Admin B');

        $this->como($adminOutroTenant, $outroTenant)->getJson("/api/cursos/inscricoes/{$inscricaoDeAna}/respostas")->assertNotFound();
    }

    public function test_cenario_respostas_imutaveis_depois_do_encerramento(): void
    {
        [, $inscricaoId] = $this->inscrever('Ana');

        $this->noTenant($this->tenant, function () use ($inscricaoId): void {
            $resposta = RespostaInscricao::where('inscricao_id', $inscricaoId)->sole();

            // Antes de encerrar, alterar direto no model funciona normalmente.
            $resposta->update(['valor' => 'Ajuste antes do encerramento']);
            $this->assertSame('Ajuste antes do encerramento', $resposta->fresh()->valor);

            $this->turma->update(['status' => StatusTurma::Encerrada->value]);

            $this->expectException(LogicException::class);
            $resposta->update(['valor' => 'Tentativa depois do encerramento']);
        });
    }
}
