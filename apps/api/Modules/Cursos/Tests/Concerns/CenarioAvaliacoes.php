<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Concerns;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\AvaliacaoService;
use Modules\Cursos\Services\QuestaoService;

/**
 * Cenário das avaliações: curso com turma aberta que já começou, um
 * instrutor, um participante inscrito (confirmada) e helpers para montar
 * questões, avaliações e chamar as rotas de tentativa.
 */
trait CenarioAvaliacoes
{
    use CenarioCursos;

    protected Tenant $tenant;

    protected User $admin;

    protected User $instrutor;

    protected User $aluno;

    protected Curso $curso;

    protected Turma $turma;

    protected Inscricao $inscricao;

    /**
     * @param array<string, mixed> $turma atributos da turma
     * @param array<string, mixed> $curso atributos do curso
     */
    protected function prepararCenarioAvaliacao(array $turma = [], array $curso = []): void
    {
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');
        $this->curso = $this->cursoPublicado($this->tenant, $curso);
        $this->turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['data_inicio' => now()->subDay()->toDateString(), ...$turma]);
        $this->inscricao = $this->inscrever($this->tenant, $this->turma, $this->aluno);
    }

    /** Objetiva com $alternativas alternativas ("A", "B", ...), a de índice $correta certa. */
    protected function criarObjetiva(string $enunciado = 'Pergunta', float $pontuacao = 1, int $correta = 0, int $alternativas = 3): Questao
    {
        $lista = array_map(fn (int $i): array => ['texto' => chr(65 + $i), 'correta' => $i === $correta], range(0, $alternativas - 1));

        return $this->noTenant($this->tenant, fn (): Questao => app(QuestaoService::class)->criar($this->curso, [
            'tipo' => 'objetiva', 'enunciado' => "<p>{$enunciado}</p>", 'pontuacao' => $pontuacao, 'alternativas' => $lista,
        ]));
    }

    protected function criarDissertativa(string $enunciado = 'Explique', float $pontuacao = 2, ?string $orientacao = 'Citar a lei'): Questao
    {
        return $this->noTenant($this->tenant, fn (): Questao => app(QuestaoService::class)->criar($this->curso, [
            'tipo' => 'dissertativa', 'enunciado' => "<p>{$enunciado}</p>", 'pontuacao' => $pontuacao, 'orientacao_correcao' => $orientacao !== null ? "<p>{$orientacao}</p>" : null,
        ]));
    }

    /**
     * @param list<Questao> $questoes
     * @param array<string, mixed> $dados
     */
    protected function criarAvaliacaoPublicada(array $questoes, array $dados = []): Avaliacao
    {
        return $this->noTenant($this->tenant, function () use ($questoes, $dados): Avaliacao {
            $servico = app(AvaliacaoService::class);
            $avaliacao = $servico->criar($this->curso, ['titulo' => 'Prova final', 'questoes' => array_map(fn (Questao $q): int => $q->id, $questoes), ...$dados]);

            return $servico->alterarPublicacao($avaliacao, true);
        });
    }

    protected function alternativaId(Questao $questao, int $indice): int
    {
        return $this->noTenant($this->tenant, fn (): int => (int) $questao->alternativas()->get()->values()->get($indice)->id);
    }

    /** @return TestResponse<\Symfony\Component\HttpFoundation\Response> */
    protected function iniciarTentativa(Avaliacao $avaliacao, ?User $como = null, ?Inscricao $inscricao = null)
    {
        return $this->como($como ?? $this->aluno, $this->tenant)->postJson("/api/cursos/avaliacoes/{$avaliacao->id}/tentativas", ['inscricao_id' => ($inscricao ?? $this->inscricao)->id]);
    }

    /**
     * @param array<string, mixed> $dados alternativa_id ou texto
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    protected function responder(int $tentativaId, Questao $questao, array $dados, ?User $como = null)
    {
        return $this->como($como ?? $this->aluno, $this->tenant)->putJson("/api/cursos/tentativas/{$tentativaId}/respostas/{$questao->id}", $dados);
    }

    /** @return TestResponse<\Symfony\Component\HttpFoundation\Response> */
    protected function enviarTentativa(int $tentativaId, ?User $como = null)
    {
        return $this->como($como ?? $this->aluno, $this->tenant)->postJson("/api/cursos/tentativas/{$tentativaId}/enviar");
    }

    protected function travarRelogio(\DateTimeInterface $momento): void
    {
        \Carbon\Carbon::setTestNow($momento);
        \Carbon\CarbonImmutable::setTestNow($momento);
    }

    protected function liberarRelogio(): void
    {
        \Carbon\Carbon::setTestNow();
        \Carbon\CarbonImmutable::setTestNow();
    }
}
