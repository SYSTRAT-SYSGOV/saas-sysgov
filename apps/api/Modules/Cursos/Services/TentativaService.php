<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTentativa;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Enums\TipoQuestao;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Resposta;
use Modules\Cursos\Models\Tentativa;

/**
 * Ciclo da tentativa de avaliação (Fase 2, design D6 a D9): início com
 * snapshot das questões, respostas salvas uma a uma, fechamento por tempo
 * sem job agendado e envio com correção automática das objetivas.
 */
final class TentativaService
{
    /** Folga para a latência entre o navegador e o servidor no prazo da tentativa (design D7). */
    public const TOLERANCIA_SEGUNDOS = 30;

    public const TEXTO_MAX = 20000;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly LiberacaoService $liberacao,
    ) {}

    public function iniciar(Avaliacao $avaliacao, Inscricao $inscricao): Tentativa
    {
        $this->garantirInscricaoAtiva($inscricao);

        if (!$avaliacao->publicada || $avaliacao->curso_id !== $inscricao->turma->curso_id) {
            throw new DomainException('Esta avaliação não está disponível para a sua turma.');
        }

        $situacao = $this->liberacao->situacao($avaliacao, $inscricao->turma);
        if ($situacao->aguardandoAgendamento) {
            throw new DomainException('Esta avaliação ainda não foi agendada para a sua turma.');
        }
        if (!$situacao->liberado) {
            $quando = $situacao->preverEm?->setTimezone('America/Sao_Paulo')->format('d/m/Y \à\s H:i');

            throw new DomainException("Esta avaliação será liberada em {$quando}.");
        }

        return DB::transaction(function () use ($avaliacao, $inscricao): Tentativa {
            // Serializa inícios simultâneos da mesma pessoa: sem isso, dois cliques passariam da checagem de limite.
            Inscricao::query()->lockForUpdate()->findOrFail($inscricao->id);

            $anteriores = Tentativa::query()->where('avaliacao_id', $avaliacao->id)->where('inscricao_id', $inscricao->id)->get();
            foreach ($anteriores->filter(fn (Tentativa $t): bool => $this->vencida($t)) as $vencida) {
                $this->finalizar($vencida, CarbonImmutable::instance($vencida->prazo_em), 'tempo');
            }
            $anteriores = $anteriores->fresh();

            if ($anteriores->contains(fn (Tentativa $t): bool => $t->statusEnum()->is(StatusTentativa::EmAndamento))) {
                throw new DomainException('Você já tem uma tentativa em andamento nesta avaliação.');
            }
            if ($anteriores->count() >= $avaliacao->tentativas_max) {
                throw new DomainException('O limite de tentativas desta avaliação foi atingido.');
            }

            $agora = CarbonImmutable::now();
            $tentativa = Tentativa::create([
                'avaliacao_id' => $avaliacao->id,
                'inscricao_id' => $inscricao->id,
                'numero' => $anteriores->count() + 1,
                'status' => StatusTentativa::EmAndamento->value,
                'iniciada_em' => $agora,
                'prazo_em' => $avaliacao->tempo_limite_minutos !== null ? $agora->addMinutes($avaliacao->tempo_limite_minutos) : null,
                'questoes' => $this->snapshot($avaliacao),
            ]);
            $this->audit->record('cursos', 'tentativa.iniciada', "Tentativa #{$tentativa->id}", null, [
                'avaliacao_id' => $avaliacao->id, 'inscricao_id' => $inscricao->id, 'numero' => $tentativa->numero,
            ]);

            return $tentativa;
        });
    }

    /** Toda leitura passa por aqui: uma tentativa vencida é enviada com as respostas salvas até o prazo (D7). */
    public function fecharSeVencida(Tentativa $tentativa): Tentativa
    {
        if (!$this->vencida($tentativa)) {
            return $tentativa;
        }

        return DB::transaction(function () use ($tentativa): Tentativa {
            $atual = Tentativa::query()->lockForUpdate()->findOrFail($tentativa->id);

            return $this->vencida($atual) ? $this->finalizar($atual, CarbonImmutable::instance($atual->prazo_em), 'tempo') : $atual;
        });
    }

    /**
     * Salva (ou troca) a resposta de uma questão. Sem auditoria por resposta: o
     * conjunto é auditado no envio (design D8).
     *
     * @param array<string, mixed> $dados alternativa_id (objetiva) ou texto (dissertativa)
     */
    public function salvarResposta(Tentativa $tentativa, int $questaoId, array $dados): Resposta
    {
        $resposta = null;
        $expirou = false;

        DB::transaction(function () use ($tentativa, $questaoId, $dados, &$resposta, &$expirou): void {
            $atual = Tentativa::query()->lockForUpdate()->findOrFail($tentativa->id);

            if ($this->vencida($atual)) {
                $this->finalizar($atual, CarbonImmutable::instance($atual->prazo_em), 'tempo');
                $expirou = true;

                return;
            }

            $this->garantirEmAndamento($atual);
            $this->garantirInscricaoAtiva($atual->inscricao);

            $questao = $this->questaoDoSnapshot($atual, $questaoId);
            $valores = TipoQuestao::from($questao['tipo'])->is(TipoQuestao::Objetiva)
                ? ['alternativa_id' => $this->alternativaValida($questao, $dados['alternativa_id'] ?? null), 'texto' => null]
                : ['alternativa_id' => null, 'texto' => $this->textoValido($dados['texto'] ?? null)];

            $resposta = Resposta::query()->updateOrCreate(['tentativa_id' => $atual->id, 'questao_id' => $questaoId], $valores);
        });

        // Fora da transação: a recusa não pode desfazer o fechamento da tentativa.
        if ($expirou) {
            throw new DomainException('O tempo desta avaliação terminou. A tentativa foi enviada com as respostas salvas até o prazo.');
        }

        return $resposta;
    }

    public function enviar(Tentativa $tentativa): Tentativa
    {
        return DB::transaction(function () use ($tentativa): Tentativa {
            $atual = Tentativa::query()->lockForUpdate()->findOrFail($tentativa->id);
            $this->garantirEmAndamento($atual);

            // Enviar depois do prazo vale o mesmo que o prazo ter fechado a tentativa.
            return $this->vencida($atual)
                ? $this->finalizar($atual, CarbonImmutable::instance($atual->prazo_em), 'tempo')
                : $this->finalizar($atual, CarbonImmutable::now(), 'envio');
        });
    }

    /** Usado pelo encerramento da turma: tentativas em andamento seguem como enviadas com o que foi salvo. */
    public function finalizarPorEncerramento(Tentativa $tentativa): Tentativa
    {
        return $this->finalizar($tentativa, CarbonImmutable::now(), 'encerramento');
    }

    /**
     * Nota da tentativa: pontos obtidos ÷ soma das pontuações × 10, com duas casas (design D9).
     * Questão sem pontos lançados vale zero.
     *
     * @param array<int, array<string, mixed>> $questoes snapshot da tentativa
     * @param Collection<int, Resposta> $respostas respostas da tentativa, por questao_id
     */
    public function calcularNota(array $questoes, Collection $respostas): float
    {
        $centavos = static fn (mixed $valor): int => (int) round(((float) $valor) * 100);
        $maximo = array_sum(array_map(static fn (array $q): int => $centavos($q['pontuacao']), $questoes));
        if ($maximo === 0) {
            return 0.0;
        }

        $obtido = array_sum(array_map(static fn (array $q): int => $centavos($respostas->get($q['questao_id'])->pontos ?? 0), $questoes));

        return round($obtido / $maximo * 10, 2);
    }

    /** Recalcula e grava a nota quando todas as questões já têm pontos; devolve se a tentativa ficou corrigida. */
    public function fecharCorrecaoSePronta(Tentativa $tentativa): bool
    {
        $respostas = $tentativa->respostas()->get()->keyBy('questao_id');
        $pendente = collect($tentativa->questoes)->contains(fn (array $q): bool => $respostas->get($q['questao_id'])?->pontos === null);
        if ($pendente) {
            return false;
        }

        $tentativa->update([
            'status' => StatusTentativa::Corrigida->value,
            'nota' => $this->calcularNota($tentativa->questoes, $respostas),
            'corrigida_em' => now(),
        ]);

        return true;
    }

    /**
     * @param 'envio'|'tempo'|'encerramento' $origem
     */
    private function finalizar(Tentativa $tentativa, CarbonInterface $enviadaEm, string $origem): Tentativa
    {
        $respostas = $tentativa->respostas()->get()->keyBy('questao_id');

        foreach ($tentativa->questoes as $questao) {
            $resposta = $respostas->get($questao['questao_id']) ?? Resposta::create(['tentativa_id' => $tentativa->id, 'questao_id' => $questao['questao_id']]);

            if (TipoQuestao::from($questao['tipo'])->is(TipoQuestao::Objetiva)) {
                $correta = $this->alternativaCorreta($questao);
                $acertou = $resposta->alternativa_id !== null && $resposta->alternativa_id === $correta;
                $resposta->update(['pontos' => $acertou ? $questao['pontuacao'] : 0, 'corrigida_em' => now()]);
            } elseif (trim((string) $resposta->texto) === '') {
                // Dissertativa em branco não tem o que corrigir.
                $resposta->update(['pontos' => 0, 'corrigida_em' => now()]);
            }

            $respostas->put($questao['questao_id'], $resposta->refresh());
        }

        $conjunto = $respostas->map(fn (Resposta $r): array => ['questao_id' => $r->questao_id, 'alternativa_id' => $r->alternativa_id, 'texto' => $r->texto])->values()->all();
        $tentativa->update(['status' => StatusTentativa::AguardandoCorrecao->value, 'enviada_em' => $enviadaEm]);
        $corrigida = $this->fecharCorrecaoSePronta($tentativa);
        $tentativa->refresh();

        $this->audit->record('cursos', 'tentativa.enviada', "Tentativa #{$tentativa->id}", ['status' => StatusTentativa::EmAndamento->value], [
            'status' => $tentativa->status, 'origem' => $origem, 'nota' => $tentativa->nota, 'respostas' => $conjunto,
        ]);
        $payload = ['id' => $tentativa->id, 'avaliacao_id' => $tentativa->avaliacao_id, 'inscricao_id' => $tentativa->inscricao_id, 'numero' => $tentativa->numero];
        $this->outbox->publish('cursos.TentativaEnviada', [...$payload, 'status' => $tentativa->status]);
        if ($corrigida) {
            $this->outbox->publish('cursos.TentativaCorrigida', [...$payload, 'nota' => $tentativa->nota]);
        }

        return $tentativa;
    }

    private function vencida(Tentativa $tentativa): bool
    {
        return $tentativa->statusEnum()->is(StatusTentativa::EmAndamento)
            && $tentativa->prazo_em !== null
            && now()->greaterThan($tentativa->prazo_em->copy()->addSeconds(self::TOLERANCIA_SEGUNDOS));
    }

    private function garantirEmAndamento(Tentativa $tentativa): void
    {
        if (!$tentativa->statusEnum()->is(StatusTentativa::EmAndamento)) {
            throw new DomainException('Esta tentativa já foi enviada e não pode mais ser alterada.');
        }
    }

    private function garantirInscricaoAtiva(Inscricao $inscricao): void
    {
        if (!$inscricao->statusEnum()->is(StatusInscricao::Confirmada)) {
            throw new DomainException('Só inscrições confirmadas podem responder avaliações.');
        }
        if (!$inscricao->turma->statusEnum()->is(StatusTurma::Aberta)) {
            throw new DomainException('A turma não está aberta: não é possível responder avaliações.');
        }
    }

    /**
     * Guarda enunciado, pontuação, alternativas (com o gabarito) e a orientação de
     * correção como estavam no início: alterar a questão depois não muda a tentativa.
     *
     * @return list<array<string, mixed>>
     */
    private function snapshot(Avaliacao $avaliacao): array
    {
        $snapshot = [];

        foreach ($avaliacao->questoes()->with('questao.alternativas')->get() as $item) {
            $alternativas = [];
            foreach ($item->questao->alternativas as $alternativa) {
                $alternativas[] = ['id' => $alternativa->id, 'texto' => $alternativa->texto, 'ordem' => $alternativa->ordem, 'correta' => $alternativa->correta];
            }

            $snapshot[] = [
                'questao_id' => $item->questao_id,
                'ordem' => $item->ordem,
                'tipo' => $item->questao->tipo,
                'enunciado' => $item->questao->enunciado,
                'pontuacao' => (float) $item->questao->pontuacao,
                'orientacao_correcao' => $item->questao->orientacao_correcao,
                'alternativas' => $alternativas,
            ];
        }

        return $snapshot;
    }

    /**
     * @param array<string, mixed> $questao
     */
    private function alternativaCorreta(array $questao): ?int
    {
        foreach ($questao['alternativas'] as $alternativa) {
            if ($alternativa['correta'] === true) {
                return (int) $alternativa['id'];
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function questaoDoSnapshot(Tentativa $tentativa, int $questaoId): array
    {
        foreach ($tentativa->questoes as $questao) {
            if ($questao['questao_id'] === $questaoId) {
                return $questao;
            }
        }

        throw new DomainException('Esta questão não faz parte da tentativa.');
    }

    /**
     * @param array<string, mixed> $questao
     */
    private function alternativaValida(array $questao, mixed $informada): ?int
    {
        if ($informada === null || $informada === '') {
            return null;
        }

        $id = (int) $informada;
        if (!in_array($id, array_column($questao['alternativas'], 'id'), true)) {
            throw new DomainException('A alternativa escolhida não pertence a esta questão.');
        }

        return $id;
    }

    private function textoValido(mixed $informado): ?string
    {
        $texto = $informado === null ? null : (string) $informado;
        if ($texto !== null && mb_strlen($texto) > self::TEXTO_MAX) {
            throw new DomainException('A resposta é longa demais (máximo de ' . self::TEXTO_MAX . ' caracteres).');
        }

        return $texto;
    }
}
