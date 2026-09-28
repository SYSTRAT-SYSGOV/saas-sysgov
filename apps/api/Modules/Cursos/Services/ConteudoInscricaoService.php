<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTentativa;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Enums\TipoMaterial;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Support\SituacaoLiberacao;

/**
 * Área do participante (Fase 2): materiais e avaliações de uma inscrição, com a
 * situação de liberação de cada um, as tentativas restantes e a nota. O que
 * ainda não foi liberado sai só com título e data prevista, sem o conteúdo.
 */
final class ConteudoInscricaoService
{
    public function __construct(
        private readonly LiberacaoService $liberacao,
        private readonly TentativaService $tentativas,
        private readonly NotaService $notas,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function montar(Inscricao $inscricao): array
    {
        $turma = $inscricao->turma;
        $status = $inscricao->statusEnum();
        $base = [
            'inscricao_id' => $inscricao->id,
            'turma_id' => $turma->id,
            'status' => $inscricao->status,
            'acesso' => $status->is(StatusInscricao::Confirmada, StatusInscricao::Concluida, StatusInscricao::NaoConcluida),
            'nota' => null,
            'nota_tipo' => null,
            'materiais' => [],
            'avaliacoes' => [],
        ];

        // Pendente, lista de espera, recusada e cancelada não dão acesso ao conteúdo.
        if (!$base['acesso']) {
            return $base;
        }

        $nota = $this->notas->exibida($inscricao);

        return [
            ...$base,
            'nota' => $nota,
            'nota_tipo' => $nota === null ? null : ($turma->statusEnum()->is(StatusTurma::Encerrada) ? 'final' : 'parcial'),
            'materiais' => $this->materiais($inscricao),
            'avaliacoes' => $this->avaliacoes($inscricao),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function materiais(Inscricao $inscricao): array
    {
        $saida = [];

        foreach (Material::query()->where('curso_id', $inscricao->turma->curso_id)->where('publicado', true)->orderBy('ordem')->orderBy('id')->get() as $material) {
            $situacao = $this->liberacao->situacao($material, $inscricao->turma);
            $item = [
                'id' => $material->id,
                'tipo' => $material->tipo,
                'titulo' => $material->titulo,
                'ordem' => $material->ordem,
                'aula_id' => $material->aula_id,
                ...$this->situacao($situacao),
            ];

            if ($situacao->liberado) {
                $item['descricao'] = $material->descricao;
                $item = [...$item, ...match ($material->tipoEnum()) {
                    TipoMaterial::Texto => ['conteudo' => $material->conteudo],
                    TipoMaterial::Link => ['url' => $material->url],
                    TipoMaterial::Video => ['embed_url' => $material->embed_url],
                    TipoMaterial::Arquivo => ['arquivo_nome' => $material->arquivo_nome, 'arquivo_tamanho' => $material->arquivo_tamanho],
                }];
            }

            $saida[] = $item;
        }

        return $saida;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function avaliacoes(Inscricao $inscricao): array
    {
        $turma = $inscricao->turma;
        $podeResponder = $inscricao->statusEnum()->is(StatusInscricao::Confirmada) && $turma->statusEnum()->is(StatusTurma::Aberta);

        $porAvaliacao = [];
        foreach (Tentativa::query()->where('inscricao_id', $inscricao->id)->orderBy('numero')->get() as $tentativa) {
            // Uma tentativa vencida é fechada na consulta, sem depender de job (design D7).
            $porAvaliacao[$tentativa->avaliacao_id][] = $this->tentativas->fecharSeVencida($tentativa);
        }

        $saida = [];
        foreach (Avaliacao::query()->where('curso_id', $turma->curso_id)->where('publicada', true)->withCount('questoes')->orderBy('id')->get() as $avaliacao) {
            $situacao = $this->liberacao->situacao($avaliacao, $turma);
            /** @var list<Tentativa> $tentativas */
            $tentativas = $porAvaliacao[$avaliacao->id] ?? [];
            $emAndamento = null;
            $melhor = null;
            foreach ($tentativas as $t) {
                if ($t->statusEnum()->is(StatusTentativa::EmAndamento)) {
                    $emAndamento = $t->id;
                }
                if ($t->statusEnum()->is(StatusTentativa::Corrigida) && $t->nota !== null) {
                    $melhor = max($melhor ?? 0.0, (float) $t->nota);
                }
            }
            $restantes = max(0, $avaliacao->tentativas_max - count($tentativas));

            $item = [
                'id' => $avaliacao->id,
                'titulo' => $avaliacao->titulo,
                'peso' => $avaliacao->peso,
                'tentativas_max' => $avaliacao->tentativas_max,
                'tempo_limite_minutos' => $avaliacao->tempo_limite_minutos,
                'questoes_total' => $avaliacao->questoes_count,
                ...$this->situacao($situacao),
                'tentativas_usadas' => count($tentativas),
                'tentativas_restantes' => $restantes,
                'melhor_nota' => $melhor,
                'tentativa_em_andamento_id' => $emAndamento,
                'pode_iniciar' => $podeResponder && $situacao->liberado && $emAndamento === null && $restantes > 0,
                'tentativas' => array_map(fn (Tentativa $t): array => [
                    'id' => $t->id,
                    'numero' => $t->numero,
                    'status' => $t->status,
                    'iniciada_em' => $t->iniciada_em->toIso8601String(),
                    'prazo_em' => $t->prazo_em?->toIso8601String(),
                    'enviada_em' => $t->enviada_em?->toIso8601String(),
                    // A nota só aparece depois da correção.
                    'nota' => $t->statusEnum()->is(StatusTentativa::Corrigida) ? $t->nota : null,
                ], $tentativas),
            ];
            if ($situacao->liberado) {
                $item['instrucoes'] = $avaliacao->instrucoes;
            }

            $saida[] = $item;
        }

        return $saida;
    }

    /**
     * @return array{liberado: bool, prevista_em: string|null, aguardando_agendamento: bool}
     */
    private function situacao(SituacaoLiberacao $situacao): array
    {
        return [
            'liberado' => $situacao->liberado,
            'prevista_em' => $situacao->preverEm?->toIso8601String(),
            'aguardando_agendamento' => $situacao->aguardandoAgendamento,
        ];
    }
}
