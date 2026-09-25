<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;

/**
 * Inscrições, vagas e lista de espera (design D5).
 *
 * Toda decisão sobre vaga acontece dentro de uma transação com a linha da
 * turma travada (lockForUpdate): inscrição, cancelamento, recusa e promoção
 * da fila se serializam por turma, então o número de inscrições que ocupam
 * vaga nunca passa de `vagas`. Em SQLite o lock é ignorado — o teste de
 * concorrência roda contra o MySQL (grupo "mysql").
 */
final class InscricaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * Participante do usuário logado, criado na primeira inscrição (design D2).
     * Se já existir um participante sem login com o mesmo e-mail (externo da
     * Fase 3), ele é vinculado ao usuário em vez de duplicado.
     */
    public function participanteDoUsuario(User $user): Participante
    {
        $participante = Participante::query()->where('user_id', $user->id)->first()
            ?? Participante::query()->whereNull('user_id')->where('email', $user->email)->first();

        if ($participante === null) {
            return Participante::create(['user_id' => $user->id, 'nome' => $user->name, 'email' => $user->email]);
        }

        if ($participante->user_id === null) {
            $participante->update(['user_id' => $user->id]);
        }

        return $participante;
    }

    /**
     * @param bool $peloAdministrador inscrição direta pelo Administrador: dispensa o período de
     *                                inscrição e a aprovação manual
     */
    public function inscrever(Turma $turma, Participante $participante, User $autor, bool $peloAdministrador = false): Inscricao
    {
        return DB::transaction(function () use ($turma, $participante, $autor, $peloAdministrador): Inscricao {
            $turma = $this->travar($turma);

            if (!$turma->statusEnum()->is(StatusTurma::Aberta)) {
                throw new DomainException('Esta turma não está aberta para inscrições.');
            }
            if (!$turma->curso->statusEnum()->is(StatusCurso::Publicado)) {
                throw new DomainException('Só é possível se inscrever em cursos publicados.');
            }
            if (!$peloAdministrador && !now()->betweenIncluded($turma->inscricoes_inicio, $turma->inscricoes_fim)) {
                throw new DomainException('Fora do período de inscrição desta turma ('
                    . $turma->inscricoes_inicio->format('d/m/Y H:i') . ' a ' . $turma->inscricoes_fim->format('d/m/Y H:i') . ').');
            }

            $jaInscrito = $turma->inscricoes()
                ->where('participante_id', $participante->id)
                ->whereIn('status', StatusInscricao::valoresAtivos())
                ->exists();
            if ($jaInscrito) {
                throw new DomainException('Este participante já tem uma inscrição ativa nesta turma.');
            }

            $status = $this->haVaga($turma)
                ? ($turma->aprovacao_manual && !$peloAdministrador ? StatusInscricao::Pendente : StatusInscricao::Confirmada)
                : StatusInscricao::ListaEspera;

            $inscricao = $turma->inscricoes()->create([
                'participante_id' => $participante->id,
                'status' => $status->value,
                'inscrito_por' => $autor->id,
                ...($status === StatusInscricao::Confirmada && $peloAdministrador ? ['aprovada_por' => $autor->id, 'aprovada_em' => now()] : []),
            ]);

            $this->audit->record('cursos', 'inscricao.criada', "Inscricao #{$inscricao->id}", null, $inscricao->toArray());
            $this->outbox->publish('cursos.InscricaoCriada', [
                'id' => $inscricao->id, 'turma_id' => $turma->id, 'participante_id' => $participante->id, 'status' => $status->value,
            ]);

            return $inscricao;
        });
    }

    public function aprovar(Inscricao $inscricao, User $autor): Inscricao
    {
        return DB::transaction(function () use ($inscricao, $autor): Inscricao {
            $this->travar($inscricao->turma);
            $inscricao->refresh();
            $this->transicionar($inscricao, StatusInscricao::Confirmada);

            $inscricao->update(['status' => StatusInscricao::Confirmada->value, 'aprovada_por' => $autor->id, 'aprovada_em' => now()]);

            $this->audit->record('cursos', 'inscricao.aprovada', "Inscricao #{$inscricao->id}", ['status' => StatusInscricao::Pendente->value], ['status' => $inscricao->status]);
            $this->outbox->publish('cursos.InscricaoAprovada', ['id' => $inscricao->id]);

            return $inscricao;
        });
    }

    public function recusar(Inscricao $inscricao, User $autor, string $motivo): Inscricao
    {
        if (!$inscricao->statusEnum()->is(StatusInscricao::Pendente)) {
            throw new DomainException('Só inscrições pendentes podem ser recusadas.');
        }

        return $this->encerrarInscricao($inscricao, $autor, 'Recusada: ' . $motivo, 'inscricao.recusada', 'cursos.InscricaoRecusada');
    }

    /**
     * @param bool $peloAdministrador o participante só cancela até o início da primeira aula;
     *                                o Administrador cancela até o encerramento da turma
     */
    public function cancelar(Inscricao $inscricao, User $autor, bool $peloAdministrador, ?string $motivo = null): Inscricao
    {
        if (!$peloAdministrador) {
            $primeiraAula = $inscricao->turma->agendamentos()->min('inicio');
            if ($primeiraAula !== null && now()->greaterThanOrEqualTo($primeiraAula)) {
                throw new DomainException('A turma já começou: para cancelar a inscrição, procure o Administrador do curso.');
            }
        }

        return $this->encerrarInscricao($inscricao, $autor, $motivo, 'inscricao.cancelada', 'cursos.InscricaoCancelada');
    }

    /**
     * Promove a lista de espera enquanto houver vaga (ex.: vagas aumentadas).
     */
    public function preencherVagas(Turma $turma): void
    {
        DB::transaction(fn () => $this->promoverFila($this->travar($turma)));
    }

    /** Posição (1, 2, ...) de uma inscrição na lista de espera; null se não estiver na fila. */
    public function posicaoNaFila(Inscricao $inscricao): ?int
    {
        if (!$inscricao->statusEnum()->is(StatusInscricao::ListaEspera)) {
            return null;
        }

        return Inscricao::query()
            ->where('turma_id', $inscricao->turma_id)
            ->where('status', StatusInscricao::ListaEspera->value)
            ->where('id', '<', $inscricao->id)
            ->count() + 1;
    }

    public function vagasOcupadas(Turma $turma): int
    {
        return $turma->inscricoes()->whereIn('status', StatusInscricao::valoresQueOcupamVaga())->count();
    }

    private function encerrarInscricao(Inscricao $inscricao, User $autor, ?string $motivo, string $acaoAudit, string $evento): Inscricao
    {
        return DB::transaction(function () use ($inscricao, $autor, $motivo, $acaoAudit, $evento): Inscricao {
            $turma = $this->travar($inscricao->turma);
            $inscricao->refresh();

            if (!$turma->statusEnum()->is(StatusTurma::Aberta)) {
                throw new DomainException('A turma não está mais aberta: a inscrição não pode ser alterada.');
            }
            $this->transicionar($inscricao, StatusInscricao::Cancelada);

            $antes = $inscricao->status;
            $inscricao->update([
                'status' => StatusInscricao::Cancelada->value,
                'cancelada_por' => $autor->id,
                'cancelada_em' => now(),
                'motivo_cancelamento' => $motivo,
            ]);

            $this->audit->record('cursos', $acaoAudit, "Inscricao #{$inscricao->id}", ['status' => $antes], ['status' => $inscricao->status, 'motivo' => $motivo]);
            $this->outbox->publish($evento, ['id' => $inscricao->id, 'turma_id' => $turma->id]);

            if (StatusInscricao::from($antes)->ocupaVaga()) {
                $this->promoverFila($turma);
            }

            return $inscricao;
        });
    }

    /**
     * Deve ser chamado dentro de transação, com a turma já travada.
     * Ordem de chegada = id crescente.
     */
    private function promoverFila(Turma $turma): void
    {
        if (!$turma->statusEnum()->is(StatusTurma::Aberta)) {
            return;
        }

        while ($this->haVaga($turma)) {
            $proxima = $turma->inscricoes()
                ->where('status', StatusInscricao::ListaEspera->value)
                ->orderBy('id')
                ->first();
            if ($proxima === null) {
                return;
            }

            $novo = $turma->aprovacao_manual ? StatusInscricao::Pendente : StatusInscricao::Confirmada;
            $proxima->update(['status' => $novo->value]);

            $this->audit->record('cursos', 'inscricao.promovida', "Inscricao #{$proxima->id}", ['status' => StatusInscricao::ListaEspera->value], ['status' => $novo->value]);
            $this->outbox->publish('cursos.InscricaoPromovida', ['id' => $proxima->id, 'turma_id' => $turma->id, 'status' => $novo->value]);
        }
    }

    private function haVaga(Turma $turma): bool
    {
        return $this->vagasOcupadas($turma) < $turma->vagas;
    }

    private function travar(Turma $turma): Turma
    {
        return Turma::query()->whereKey($turma->id)->lockForUpdate()->firstOrFail();
    }

    private function transicionar(Inscricao $inscricao, StatusInscricao $novo): void
    {
        if (!$inscricao->statusEnum()->podeTransicionarPara($novo)) {
            throw new DomainException(sprintf('Transição inválida da inscrição de "%s" para "%s".', $inscricao->statusEnum()->label(), $novo->label()));
        }
    }
}
