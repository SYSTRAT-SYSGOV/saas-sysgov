<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use App\Support\HtmlSanitizer;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\TipoCurso;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Questao;

/**
 * Avaliações do curso (Fase 2). Depois da primeira tentativa, questões,
 * ordem e publicação ficam travadas, porque a nota já depende delas.
 */
final class AvaliacaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly HtmlSanitizer $sanitizer,
        private readonly LiberacaoAtributos $liberacao,
    ) {}

    /**
     * @param array<string, mixed> $dados titulo, instrucoes, peso, tentativas_max, tempo_limite_minutos, liberação e questoes (ids em ordem)
     */
    public function criar(Curso $curso, array $dados): Avaliacao
    {
        if ($curso->tipo === TipoCurso::Evento->value) {
            throw new DomainException('Eventos não têm avaliação: use um curso do tipo "curso".');
        }

        $atributos = [
            ...$this->atributos($dados),
            ...$this->liberacao->montar($curso, $dados, null),
        ];
        $questoes = $this->questoesEscolhidas($curso, $dados['questoes'] ?? [], []);

        return DB::transaction(function () use ($curso, $atributos, $questoes): Avaliacao {
            $avaliacao = $curso->avaliacoes()->create([...$atributos, 'publicada' => false]);
            $this->gravarQuestoes($avaliacao, $questoes);
            $this->audit->record('cursos', 'avaliacao.criada', "Avaliação #{$avaliacao->id}", null, $this->instantaneo($avaliacao));

            return $avaliacao->refresh();
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Avaliacao $avaliacao, array $dados): Avaliacao
    {
        $atuais = $avaliacao->questoes()->pluck('questao_id')->map(fn ($id): int => (int) $id)->all();
        $novas = null;

        if (array_key_exists('questoes', $dados)) {
            $novas = $this->questoesEscolhidas($avaliacao->curso, $dados['questoes'], $atuais);
            if ($novas !== $atuais && $avaliacao->tentativas()->exists()) {
                throw new DomainException('Esta avaliação já tem tentativas: as questões e a ordem não podem mais ser alteradas.');
            }
            if ($novas === [] && $avaliacao->publicada) {
                throw new DomainException('Uma avaliação publicada precisa de ao menos uma questão. Despublique-a antes de esvaziá-la.');
            }
        }

        $atributos = [
            ...$this->atributos($dados),
            ...$this->liberacao->montar($avaliacao->curso, $dados, $avaliacao),
        ];

        return DB::transaction(function () use ($avaliacao, $atributos, $novas, $atuais): Avaliacao {
            $antes = $this->instantaneo($avaliacao);
            $avaliacao->update($atributos);
            if ($novas !== null && $novas !== $atuais) {
                $avaliacao->questoes()->delete();
                $this->gravarQuestoes($avaliacao, $novas);
            }
            $this->audit->record('cursos', 'avaliacao.atualizada', "Avaliação #{$avaliacao->id}", $antes, $this->instantaneo($avaliacao));

            return $avaliacao->refresh();
        });
    }

    public function alterarPublicacao(Avaliacao $avaliacao, bool $publicada): Avaliacao
    {
        if ($publicada && !$avaliacao->questoes()->exists()) {
            throw new DomainException('Adicione ao menos uma questão antes de publicar a avaliação.');
        }
        if (!$publicada && $avaliacao->tentativas()->exists()) {
            throw new DomainException('Esta avaliação já tem tentativas e não pode ser despublicada.');
        }

        return DB::transaction(function () use ($avaliacao, $publicada): Avaliacao {
            $antes = ['publicada' => $avaliacao->publicada];
            $avaliacao->update(['publicada' => $publicada]);
            $this->audit->record('cursos', $publicada ? 'avaliacao.publicada' : 'avaliacao.despublicada', "Avaliação #{$avaliacao->id}", $antes, ['publicada' => $publicada]);

            return $avaliacao;
        });
    }

    public function excluir(Avaliacao $avaliacao): void
    {
        if ($avaliacao->tentativas()->exists()) {
            throw new DomainException('Esta avaliação já tem tentativas e não pode ser excluída.');
        }

        DB::transaction(function () use ($avaliacao): void {
            $antes = $this->instantaneo($avaliacao);
            $avaliacao->delete();
            $this->audit->record('cursos', 'avaliacao.excluida', "Avaliação #{$antes['id']}", $antes, null);
        });
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function atributos(array $dados): array
    {
        $atributos = [];

        foreach (['titulo', 'peso', 'tentativas_max', 'tempo_limite_minutos'] as $campo) {
            if (array_key_exists($campo, $dados)) {
                $atributos[$campo] = $dados[$campo];
            }
        }
        if (array_key_exists('instrucoes', $dados)) {
            $instrucoes = $this->sanitizer->sanitize((string) ($dados['instrucoes'] ?? ''));
            $atributos['instrucoes'] = $instrucoes !== '' ? $instrucoes : null;
        }

        return $atributos;
    }

    /**
     * Valida as questões escolhidas: sem repetição, do próprio curso e ativas
     * (as que já estão na avaliação podem ter sido desativadas depois).
     *
     * @param list<int> $atuais questões que já fazem parte da avaliação
     * @return list<int>
     */
    private function questoesEscolhidas(Curso $curso, mixed $informadas, array $atuais): array
    {
        $ids = array_map('intval', is_array($informadas) ? array_values($informadas) : []);
        if (count($ids) !== count(array_unique($ids))) {
            throw new DomainException('A mesma questão não pode aparecer duas vezes na avaliação.');
        }

        $encontradas = Questao::query()->where('curso_id', $curso->id)->whereIn('id', $ids)->get()->keyBy('id');
        foreach ($ids as $id) {
            $questao = $encontradas->get($id);
            if ($questao === null) {
                throw new DomainException('Uma ou mais questões não pertencem ao banco deste curso.');
            }
            if (!$questao->ativa && !in_array($id, $atuais, true)) {
                throw new DomainException('Questão desativada não pode entrar em uma avaliação.');
            }
        }

        return $ids;
    }

    /**
     * @param list<int> $questoes
     */
    private function gravarQuestoes(Avaliacao $avaliacao, array $questoes): void
    {
        foreach ($questoes as $indice => $questaoId) {
            $avaliacao->questoes()->create(['questao_id' => $questaoId, 'ordem' => $indice + 1]);
        }
    }

    /** @return array<string, mixed> */
    private function instantaneo(Avaliacao $avaliacao): array
    {
        return [...$avaliacao->toArray(), 'questoes' => $avaliacao->questoes()->pluck('questao_id')->all()];
    }
}
