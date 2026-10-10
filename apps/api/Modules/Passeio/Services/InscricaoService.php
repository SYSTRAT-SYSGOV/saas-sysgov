<?php

declare(strict_types=1);

namespace Modules\Passeio\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Enums\SituacaoAluno;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Passeio\Models\Assento;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Services\Concerns\RegistraMutacao;

final class InscricaoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * No máximo uma inscrição por aluno e passeio; reinscrever restaura a inscrição excluída. Aluno
     * transferido (saiu da escola) não participa (D18).
     */
    public function inscrever(Passeio $passeio, Aluno $aluno): Inscricao
    {
        $this->garantirAceitaInscricoes($passeio);
        if ($aluno->situacao === SituacaoAluno::Transferido->value) {
            throw new DomainException('Aluno transferido não participa do passeio.');
        }

        return DB::transaction(fn (): Inscricao => $this->inscreverUm($passeio, $aluno->id));
    }

    /**
     * Inscreve todos os alunos da turma sem duplicar os já inscritos; transferidos ficam de fora (D18).
     * O remanejado entra pela turma de destino (turma_id).
     *
     * @return array{criadas: int, ja_inscritos: int}
     */
    public function inscreverTurma(Passeio $passeio, Turma $turma): array
    {
        $this->garantirAceitaInscricoes($passeio);

        return DB::transaction(function () use ($passeio, $turma): array {
            $resultado = ['criadas' => 0, 'ja_inscritos' => 0];
            $jaInscritos = Inscricao::query()->where('passeio_id', $passeio->id)->pluck('aluno_id')->all();
            foreach ($this->alunosParticipantes($turma) as $alunoId) {
                if (in_array($alunoId, $jaInscritos, true)) {
                    $resultado['ja_inscritos']++;
                    continue;
                }
                $this->inscreverUm($passeio, $alunoId);
                $resultado['criadas']++;
            }

            return $resultado;
        });
    }

    /**
     * Marca ou desmarca "vai" para a turma inteira numa transação (D18). Marcar inscreve quem falta
     * (sem transferidos) e marca os demais; desmarcar tira o "vai" de todos da turma e libera os
     * assentos deles. As outras turmas não mudam.
     *
     * @return array{afetadas: int, criadas: int}
     */
    public function emLote(Passeio $passeio, Turma $turma, bool $vai): array
    {
        if ($vai) {
            $this->garantirAceitaInscricoes($passeio);
        }

        return DB::transaction(function () use ($passeio, $turma, $vai): array {
            $alunosDaTurma = Aluno::query()->where('turma_id', $turma->id)->pluck('id')->all();
            $criadas = 0;
            if ($vai) {
                $jaInscritos = Inscricao::query()->where('passeio_id', $passeio->id)->pluck('aluno_id')->all();
                foreach ($this->alunosParticipantes($turma) as $alunoId) {
                    if (!in_array($alunoId, $jaInscritos, true)) {
                        $this->inscreverUm($passeio, $alunoId);
                        $criadas++;
                    }
                }
            }

            $inscricoes = Inscricao::query()->where('passeio_id', $passeio->id)->whereIn('aluno_id', $alunosDaTurma)->where('vai', !$vai);
            if ($vai) {
                // Transferido inscrito antes da regra continua de fora ao marcar a turma.
                $inscricoes->whereIn('aluno_id', $this->alunosParticipantes($turma));
            }
            $afetadas = $inscricoes->update(['vai' => $vai]);
            if (!$vai) {
                Assento::query()->where('passeio_id', $passeio->id)->whereIn('aluno_id', $alunosDaTurma)->delete();
            }

            $this->auditar('inscricao', $vai ? 'lote_marcado' : 'lote_desmarcado', $passeio->id, null, ['turma_id' => $turma->id, 'vai' => $vai, 'afetadas' => $afetadas + $criadas], ['passeio_id' => $passeio->id, 'turma_id' => $turma->id]);

            return ['afetadas' => $afetadas + $criadas, 'criadas' => $criadas];
        });
    }

    /** @param array{vai?: bool, autorizacao_entregue?: bool, pago?: bool, observacao?: string|null} $dados */
    public function atualizar(Inscricao $inscricao, array $dados): Inscricao
    {
        if (($dados['vai'] ?? false) === true && !$inscricao->vai && $inscricao->aluno?->situacao === SituacaoAluno::Transferido->value) {
            throw new DomainException('Aluno transferido não participa do passeio.');
        }
        // Termo e pagamento só para quem vai; desmarcar continua livre.
        $marcaTermoOuPago = ($dados['autorizacao_entregue'] ?? false) === true || ($dados['pago'] ?? false) === true;
        if ($marcaTermoOuPago && !($dados['vai'] ?? $inscricao->vai)) {
            throw new DomainException('Marque que o aluno vai ao passeio antes de registrar o termo ou o pagamento.');
        }

        return DB::transaction(function () use ($inscricao, $dados): Inscricao {
            $antes = $inscricao->toArray();
            $inscricao->update($dados);
            // Quem deixa de ir perde o assento.
            if (($dados['vai'] ?? true) === false) {
                Assento::query()->where('passeio_id', $inscricao->passeio_id)->where('aluno_id', $inscricao->aluno_id)->delete();
            }
            $this->auditar('inscricao', 'atualizada', $inscricao->id, $antes, $inscricao->toArray());

            return $inscricao;
        });
    }

    public function excluir(Inscricao $inscricao): void
    {
        DB::transaction(function () use ($inscricao): void {
            $antes = $inscricao->toArray();
            Assento::query()->where('passeio_id', $inscricao->passeio_id)->where('aluno_id', $inscricao->aluno_id)->delete();
            $inscricao->delete();
            $this->auditar('inscricao', 'excluida', $inscricao->id, $antes, null);
        });
    }

    private function inscreverUm(Passeio $passeio, int $alunoId): Inscricao
    {
        $inscricao = Inscricao::withTrashed()->where('passeio_id', $passeio->id)->where('aluno_id', $alunoId)->lockForUpdate()->first();
        if ($inscricao !== null && !$inscricao->trashed()) {
            return $inscricao;
        }
        if ($inscricao !== null) {
            $inscricao->restore();
            $inscricao->update(['vai' => true, 'autorizacao_entregue' => false, 'pago' => false]);
        } else {
            $inscricao = Inscricao::create(['passeio_id' => $passeio->id, 'aluno_id' => $alunoId, 'vai' => true]);
        }
        $this->auditar('inscricao', 'criada', $inscricao->id, null, $inscricao->toArray(), ['passeio_id' => $passeio->id, 'aluno_id' => $alunoId]);

        return $inscricao;
    }

    /** @return list<int> alunos da turma que podem participar (sem transferidos) */
    private function alunosParticipantes(Turma $turma): array
    {
        return Aluno::query()->where('turma_id', $turma->id)->where('situacao', '!=', SituacaoAluno::Transferido->value)->pluck('id')->all();
    }

    private function garantirAceitaInscricoes(Passeio $passeio): void
    {
        if (!$passeio->statusEnum()->aceitaInscricoes()) {
            throw new DomainException("O passeio está {$passeio->status} e não aceita novas inscrições.");
        }
    }
}
