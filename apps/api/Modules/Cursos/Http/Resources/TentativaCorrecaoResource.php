<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Cursos\Enums\TipoQuestao;
use Modules\Cursos\Models\Tentativa;

/**
 * Tentativa como o Administrador e o instrutor da turma a veem para corrigir:
 * inclui o gabarito e a orientação de correção. Nunca usar na saída do participante.
 *
 * @mixin Tentativa
 */
final class TentativaCorrecaoResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Tentativa $tentativa */
        $tentativa = $this->resource;
        $respostas = $tentativa->respostas->keyBy('questao_id');

        return [
            'id' => $tentativa->id,
            'avaliacao' => ['id' => $tentativa->avaliacao->id, 'titulo' => $tentativa->avaliacao->titulo],
            'inscricao_id' => $tentativa->inscricao_id,
            'turma_id' => $tentativa->inscricao->turma_id,
            'participante' => [
                'id' => $tentativa->inscricao->participante->id,
                'nome' => $tentativa->inscricao->participante->nome,
                'email' => $tentativa->inscricao->participante->email,
            ],
            'numero' => $tentativa->numero,
            'status' => $tentativa->status,
            'iniciada_em' => $tentativa->iniciada_em->toIso8601String(),
            'enviada_em' => $tentativa->enviada_em?->toIso8601String(),
            'corrigida_em' => $tentativa->corrigida_em?->toIso8601String(),
            'nota' => $tentativa->nota,
            'questoes' => array_map(function (array $questao) use ($respostas): array {
                $resposta = $respostas->get($questao['questao_id']);
                $dissertativa = TipoQuestao::from($questao['tipo'])->is(TipoQuestao::Dissertativa);

                return [
                    'questao_id' => $questao['questao_id'],
                    'ordem' => $questao['ordem'],
                    'tipo' => $questao['tipo'],
                    'enunciado' => $questao['enunciado'],
                    'pontuacao' => $questao['pontuacao'],
                    'orientacao_correcao' => $questao['orientacao_correcao'],
                    'alternativas' => $questao['alternativas'],
                    'resposta' => [
                        'alternativa_id' => $resposta?->alternativa_id,
                        'texto' => $resposta?->texto,
                    ],
                    'correcao' => [
                        'pontos' => $resposta?->pontos !== null ? (float) $resposta->pontos : null,
                        'comentario' => $resposta?->comentario,
                        'corrigida_por' => $resposta?->corrigida_por,
                        'corrigida_em' => $resposta?->corrigida_em?->toIso8601String(),
                        'pendente' => $dissertativa && $resposta?->pontos === null,
                    ],
                ];
            }, $tentativa->questoes),
        ];
    }
}
