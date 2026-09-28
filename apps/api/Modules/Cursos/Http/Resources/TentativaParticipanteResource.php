<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Cursos\Enums\StatusTentativa;
use Modules\Cursos\Enums\TipoQuestao;
use Modules\Cursos\Models\Tentativa;

/**
 * Tentativa como o participante a vê (design D6). A saída é montada campo a
 * campo a partir do snapshot: nunca se remove chave de um array completo, para
 * que um campo novo no snapshot não vaze o gabarito por acidente.
 *
 * Fora daqui `correta` e `orientacao_correcao` não chegam ao participante em
 * nenhum estado. Corrigida, ele vê pontos, comentário e se acertou cada
 * objetiva, mas não qual era a alternativa correta.
 *
 * @mixin Tentativa
 */
final class TentativaParticipanteResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Tentativa $tentativa */
        $tentativa = $this->resource;
        $corrigida = $tentativa->statusEnum()->is(StatusTentativa::Corrigida);
        $respostas = $tentativa->respostas->keyBy('questao_id');
        $avaliacao = $tentativa->avaliacao;

        return [
            'id' => $tentativa->id,
            'avaliacao' => [
                'id' => $avaliacao->id,
                'titulo' => $avaliacao->titulo,
                'instrucoes' => $avaliacao->instrucoes,
                'tempo_limite_minutos' => $avaliacao->tempo_limite_minutos,
                'tentativas_max' => $avaliacao->tentativas_max,
            ],
            'inscricao_id' => $tentativa->inscricao_id,
            'numero' => $tentativa->numero,
            'status' => $tentativa->status,
            'iniciada_em' => $tentativa->iniciada_em->toIso8601String(),
            'prazo_em' => $tentativa->prazo_em?->toIso8601String(),
            'enviada_em' => $tentativa->enviada_em?->toIso8601String(),
            'corrigida_em' => $tentativa->corrigida_em?->toIso8601String(),
            // O cronômetro do navegador usa a hora do servidor, não o relógio local.
            'servidor_agora' => now()->toIso8601String(),
            'nota' => $corrigida ? $tentativa->nota : null,
            'questoes' => array_map(function (array $questao) use ($respostas, $corrigida): array {
                $resposta = $respostas->get($questao['questao_id']);
                $objetiva = TipoQuestao::from($questao['tipo'])->is(TipoQuestao::Objetiva);

                $saida = [
                    'questao_id' => $questao['questao_id'],
                    'ordem' => $questao['ordem'],
                    'tipo' => $questao['tipo'],
                    'enunciado' => $questao['enunciado'],
                    'pontuacao' => $questao['pontuacao'],
                    'alternativas' => array_map(static fn (array $a): array => ['id' => $a['id'], 'texto' => $a['texto'], 'ordem' => $a['ordem']], $questao['alternativas']),
                    'resposta' => [
                        'alternativa_id' => $resposta?->alternativa_id,
                        'texto' => $resposta?->texto,
                    ],
                ];

                if ($corrigida) {
                    $saida['resultado'] = [
                        'pontos' => $resposta?->pontos !== null ? (float) $resposta->pontos : null,
                        'comentario' => $resposta?->comentario,
                    ];
                    if ($objetiva) {
                        $saida['resultado']['acertou'] = $resposta?->pontos !== null && (float) $resposta->pontos > 0;
                    }
                }

                return $saida;
            }, $tentativa->questoes),
        ];
    }
}
