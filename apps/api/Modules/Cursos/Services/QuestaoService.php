<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use App\Support\HtmlSanitizer;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\TipoQuestao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Questao;

/**
 * Banco de questões do curso (Fase 2). Enunciado e orientação de correção
 * são sanitizados ao salvar (design D5). Alterar uma questão não muda as
 * tentativas já iniciadas, que corrigem pelo snapshot (D6).
 */
final class QuestaoService
{
    public const ALTERNATIVAS_MIN = 2;

    public const ALTERNATIVAS_MAX = 6;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly HtmlSanitizer $sanitizer,
    ) {}

    /**
     * @param array<string, mixed> $dados tipo, enunciado, pontuacao, orientacao_correcao, alternativas[{texto, correta}]
     */
    public function criar(Curso $curso, array $dados): Questao
    {
        $tipo = TipoQuestao::from((string) ($dados['tipo'] ?? ''));
        $atributos = $this->atributos($tipo, $dados, criacao: true);
        $alternativas = $this->alternativas($tipo, $dados['alternativas'] ?? null, obrigatorias: true);

        return DB::transaction(function () use ($curso, $tipo, $atributos, $alternativas): Questao {
            $questao = $curso->questoes()->create([...$atributos, 'tipo' => $tipo->value, 'ativa' => true]);
            $this->gravarAlternativas($questao, $alternativas);
            $this->audit->record('cursos', 'questao.criada', "Questão #{$questao->id}", null, $this->instantaneo($questao));

            return $questao->refresh()->load('alternativas');
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Questao $questao, array $dados): Questao
    {
        if (isset($dados['tipo']) && $dados['tipo'] !== $questao->tipo) {
            throw new DomainException('O tipo da questão não pode ser alterado. Crie uma nova questão.');
        }

        $tipo = $questao->tipoEnum();
        $atributos = $this->atributos($tipo, $dados, criacao: false);
        $alternativas = array_key_exists('alternativas', $dados) ? $this->alternativas($tipo, $dados['alternativas'], obrigatorias: true) : null;

        return DB::transaction(function () use ($questao, $atributos, $alternativas): Questao {
            $antes = $this->instantaneo($questao);
            $questao->update($atributos);
            if ($alternativas !== null) {
                $questao->alternativas()->delete();
                $this->gravarAlternativas($questao, $alternativas);
            }
            $this->audit->record('cursos', 'questao.atualizada', "Questão #{$questao->id}", $antes, $this->instantaneo($questao));

            return $questao->refresh()->load('alternativas');
        });
    }

    public function alterarAtivacao(Questao $questao, bool $ativa): Questao
    {
        return DB::transaction(function () use ($questao, $ativa): Questao {
            $antes = ['ativa' => $questao->ativa];
            $questao->update(['ativa' => $ativa]);
            $this->audit->record('cursos', $ativa ? 'questao.ativada' : 'questao.desativada', "Questão #{$questao->id}", $antes, ['ativa' => $ativa]);

            return $questao->load('alternativas');
        });
    }

    public function excluir(Questao $questao): void
    {
        if ($questao->respostas()->exists()) {
            throw new DomainException('Esta questão já foi respondida e não pode ser excluída. Desative-a para que ela deixe de entrar em novas avaliações.');
        }
        if ($questao->avaliacoes()->exists()) {
            throw new DomainException('Esta questão faz parte de uma avaliação. Retire-a da avaliação antes de excluí-la.');
        }

        DB::transaction(function () use ($questao): void {
            $antes = $this->instantaneo($questao);
            $questao->delete();
            $this->audit->record('cursos', 'questao.excluida', "Questão #{$antes['id']}", $antes, null);
        });
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function atributos(TipoQuestao $tipo, array $dados, bool $criacao): array
    {
        $atributos = [];

        if ($criacao || array_key_exists('enunciado', $dados)) {
            $enunciado = $this->sanitizer->sanitize((string) ($dados['enunciado'] ?? ''));
            if (trim(strip_tags($enunciado)) === '') {
                throw new DomainException('Informe o enunciado da questão.');
            }
            $atributos['enunciado'] = $enunciado;
        }

        if (array_key_exists('pontuacao', $dados) || $criacao) {
            $pontuacao = (float) ($dados['pontuacao'] ?? 1);
            if ($pontuacao <= 0) {
                throw new DomainException('A pontuação da questão deve ser maior que zero.');
            }
            $atributos['pontuacao'] = $pontuacao;
        }

        if (array_key_exists('orientacao_correcao', $dados) || $criacao) {
            $orientacao = $tipo->is(TipoQuestao::Dissertativa) ? $this->sanitizer->sanitize((string) ($dados['orientacao_correcao'] ?? '')) : '';
            $atributos['orientacao_correcao'] = $orientacao !== '' ? $orientacao : null;
        }

        return $atributos;
    }

    /**
     * @return list<array{texto: string, correta: bool}>
     */
    private function alternativas(TipoQuestao $tipo, mixed $informadas, bool $obrigatorias): array
    {
        if ($tipo->is(TipoQuestao::Dissertativa)) {
            return [];
        }

        $lista = is_array($informadas) ? array_values($informadas) : [];
        if ($obrigatorias && (count($lista) < self::ALTERNATIVAS_MIN || count($lista) > self::ALTERNATIVAS_MAX)) {
            throw new DomainException(sprintf('Uma questão objetiva precisa de %d a %d alternativas.', self::ALTERNATIVAS_MIN, self::ALTERNATIVAS_MAX));
        }

        $alternativas = array_map(static fn (array $a): array => [
            'texto' => trim((string) ($a['texto'] ?? '')),
            'correta' => (bool) ($a['correta'] ?? false),
        ], $lista);

        foreach ($alternativas as $alternativa) {
            if ($alternativa['texto'] === '') {
                throw new DomainException('Toda alternativa precisa de um texto.');
            }
        }
        if (count(array_filter($alternativas, static fn (array $a): bool => $a['correta'])) !== 1) {
            throw new DomainException('Marque exatamente uma alternativa correta.');
        }

        return $alternativas;
    }

    /**
     * @param list<array{texto: string, correta: bool}> $alternativas
     */
    private function gravarAlternativas(Questao $questao, array $alternativas): void
    {
        foreach ($alternativas as $indice => $alternativa) {
            $questao->alternativas()->create([...$alternativa, 'ordem' => $indice + 1]);
        }
    }

    /** @return array<string, mixed> */
    private function instantaneo(Questao $questao): array
    {
        return [...$questao->toArray(), 'alternativas' => $questao->alternativas()->get()->toArray()];
    }
}
