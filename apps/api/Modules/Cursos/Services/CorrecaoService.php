<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\StatusTentativa;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Enums\TipoQuestao;
use Modules\Cursos\Models\Resposta;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Models\Turma;

/**
 * Correção das questões dissertativas pelo instrutor da turma ou pelo
 * Administrador (Fase 2). A nota da tentativa é fechada quando a última
 * dissertativa recebe pontos e pode ser revista até o encerramento da turma.
 */
final class CorrecaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TentativaService $tentativas,
    ) {}

    /**
     * Tentativas da turma, por padrão as que aguardam correção (a fila do instrutor).
     *
     * @return Collection<int, Tentativa>
     */
    public function fila(Turma $turma, StatusTentativa $status = StatusTentativa::AguardandoCorrecao): Collection
    {
        return Tentativa::query()
            ->where('status', $status->value)
            ->whereHas('inscricao', fn ($q) => $q->where('turma_id', $turma->id))
            ->with(['avaliacao', 'inscricao.participante', 'respostas'])
            ->orderBy('enviada_em')
            ->orderBy('id')
            ->get();
    }

    /** Dissertativas da tentativa que ainda não receberam pontos. */
    public function pendentes(Tentativa $tentativa): int
    {
        $respostas = $tentativa->respostas->keyBy('questao_id');

        return collect($tentativa->questoes)
            ->filter(fn (array $q): bool => TipoQuestao::from($q['tipo'])->is(TipoQuestao::Dissertativa) && $respostas->get($q['questao_id'])?->pontos === null)
            ->count();
    }

    public function corrigirResposta(Tentativa $tentativa, int $questaoId, float $pontos, ?string $comentario, User $corretor): Tentativa
    {
        return DB::transaction(function () use ($tentativa, $questaoId, $pontos, $comentario, $corretor): Tentativa {
            $atual = Tentativa::query()->lockForUpdate()->with('inscricao.turma')->findOrFail($tentativa->id);

            if ($atual->statusEnum()->is(StatusTentativa::EmAndamento)) {
                throw new DomainException('A tentativa ainda está em andamento: só pode ser corrigida depois do envio.');
            }
            if (!$atual->inscricao->turma->statusEnum()->is(StatusTurma::Aberta)) {
                throw new DomainException('A turma foi encerrada: as correções não podem mais ser alteradas.');
            }

            $questao = collect($atual->questoes)->firstWhere('questao_id', $questaoId);
            if ($questao === null) {
                throw new DomainException('Esta questão não faz parte da tentativa.');
            }
            if (!TipoQuestao::from($questao['tipo'])->is(TipoQuestao::Dissertativa)) {
                throw new DomainException('Questões objetivas são corrigidas automaticamente.');
            }
            if ($pontos < 0 || $pontos > (float) $questao['pontuacao']) {
                throw new DomainException('Os pontos devem ficar entre 0 e ' . rtrim(rtrim(number_format((float) $questao['pontuacao'], 2, ',', ''), '0'), ',') . ' (a pontuação da questão).');
            }

            $resposta = Resposta::query()->where('tentativa_id', $atual->id)->where('questao_id', $questaoId)->firstOrFail();
            $antes = ['pontos' => $resposta->pontos, 'comentario' => $resposta->comentario];
            $resposta->update([
                'pontos' => $pontos,
                'comentario' => $comentario !== null && trim($comentario) !== '' ? trim($comentario) : null,
                'corrigida_por' => $corretor->id,
                'corrigida_em' => now(),
            ]);
            $this->audit->record('cursos', 'tentativa.resposta_corrigida', "Tentativa #{$atual->id} / questão #{$questaoId}", $antes, [
                'pontos' => $resposta->pontos, 'comentario' => $resposta->comentario, 'corrigida_por' => $corretor->id,
            ]);

            // Última dissertativa corrigida (ou revisão de uma tentativa já corrigida): fecha a nota e avisa.
            if ($this->tentativas->fecharCorrecaoSePronta($atual)) {
                $atual->refresh();
                $this->outbox->publish('cursos.TentativaCorrigida', [
                    'id' => $atual->id, 'avaliacao_id' => $atual->avaliacao_id, 'inscricao_id' => $atual->inscricao_id, 'numero' => $atual->numero, 'nota' => $atual->nota,
                ]);
            }

            return $atual->refresh();
        });
    }
}
