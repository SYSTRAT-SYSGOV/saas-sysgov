<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTentativa;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Models\Turma;

/**
 * Encerramento da turma (design D10): síncrono, em uma transação — apura a
 * conclusão de cada inscrição confirmada, cancela pendentes e fila, emite os
 * certificados e trava a turma. Depois, fora da transação, verifica as
 * formações que contêm o curso.
 */
final class EncerramentoService
{
    public function __construct(
        private readonly ApuracaoConclusaoService $apuracao,
        private readonly TentativaService $tentativas,
        private readonly CertificadoService $certificados,
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * @return array{concluidas: int, nao_concluidas: int, canceladas: int, certificados_emitidos: int, certificados_pendentes: list<array{inscricao_id: int, participante: string}>, formacoes_pendentes: list<int>}
     */
    public function encerrar(Turma $turma, User $autor): array
    {
        if (!$turma->statusEnum()->podeTransicionarPara(StatusTurma::Encerrada)) {
            throw new DomainException('Só turmas abertas podem ser encerradas.');
        }

        $ultimoFim = $turma->agendamentos()->max('fim');
        if ($ultimoFim === null) {
            throw new DomainException('A turma não tem aulas agendadas: não há frequência para apurar.');
        }
        if (now()->lessThan($ultimoFim)) {
            throw new DomainException('A turma só pode ser encerrada depois do fim da última aula agendada (' . \Illuminate\Support\Carbon::parse($ultimoFim)->format('d/m/Y H:i') . ').');
        }

        $resumo = DB::transaction(function () use ($turma, $autor): array {
            $turma = Turma::query()->whereKey($turma->id)->lockForUpdate()->firstOrFail();
            $this->garantirAvaliacoesEmDia($turma);
            $resumo = ['concluidas' => 0, 'nao_concluidas' => 0, 'canceladas' => 0, 'certificados_emitidos' => 0, 'certificados_pendentes' => [], 'concluintes' => []];

            $inscricoes = $turma->inscricoes()->whereIn('status', StatusInscricao::valoresAtivos())->with(['participante', 'turma.curso'])->get();
            foreach ($inscricoes as $inscricao) {
                if (!$inscricao->statusEnum()->is(StatusInscricao::Confirmada)) {
                    $inscricao->update([
                        'status' => StatusInscricao::Cancelada->value,
                        'cancelada_por' => $autor->id,
                        'cancelada_em' => now(),
                        'motivo_cancelamento' => 'Turma encerrada com a inscrição ' . mb_strtolower($inscricao->statusEnum()->label()) . '.',
                    ]);
                    $resumo['canceladas']++;
                    continue;
                }

                $apurado = $this->apuracao->apurar($inscricao);
                $novo = $apurado['concluiu'] ? StatusInscricao::Concluida : StatusInscricao::NaoConcluida;
                $inscricao->update([
                    'status' => $novo->value,
                    'frequencia_apurada' => $apurado['frequencia'],
                    'nota_apurada' => $apurado['nota'],
                    'concluida_em' => $apurado['concluiu'] ? now() : null,
                ]);

                if (!$apurado['concluiu']) {
                    $resumo['nao_concluidas']++;
                    continue;
                }

                $resumo['concluidas']++;
                $resumo['concluintes'][] = $inscricao;
                if ($this->certificados->emitirParaInscricao($inscricao) !== null) {
                    $resumo['certificados_emitidos']++;
                } else {
                    $resumo['certificados_pendentes'][] = ['inscricao_id' => $inscricao->id, 'participante' => $inscricao->participante->nome];
                }
            }

            $turma->update(['status' => StatusTurma::Encerrada->value, 'encerrada_em' => now(), 'encerrada_por' => $autor->id]);

            $this->audit->record('cursos', 'turma.encerrada', "Turma #{$turma->id}", null, array_diff_key($resumo, ['concluintes' => true]));
            $this->outbox->publish('cursos.TurmaEncerrada', ['id' => $turma->id, 'concluidas' => $resumo['concluidas'], 'nao_concluidas' => $resumo['nao_concluidas']]);

            return $resumo;
        });

        $formacoesPendentes = [];
        foreach ($resumo['concluintes'] as $inscricao) {
            $formacoesPendentes = [...$formacoesPendentes, ...$this->certificados->verificarFormacoes($inscricao->participante, [$turma->curso_id])['pendentes']];
        }
        unset($resumo['concluintes']);

        return [...$resumo, 'formacoes_pendentes' => array_values(array_unique($formacoesPendentes))];
    }

    /**
     * Com a turma travada: recusa se o curso exige nota mínima sem avaliação
     * publicada ou se há tentativa aguardando correção; depois, as tentativas
     * ainda em andamento seguem como enviadas com as respostas salvas (Fase 2, D9).
     */
    private function garantirAvaliacoesEmDia(Turma $turma): void
    {
        $curso = $turma->curso;
        if ($curso->nota_minima !== null && !Avaliacao::query()->where('curso_id', $curso->id)->where('publicada', true)->exists()) {
            throw new DomainException('O curso exige nota mínima, mas não tem avaliação publicada. Publique uma avaliação (ou retire a nota mínima do curso) antes de encerrar a turma.');
        }

        $daTurma = fn ($q) => $q->where('turma_id', $turma->id);
        $pendentes = Tentativa::query()
            ->where('status', StatusTentativa::AguardandoCorrecao->value)
            ->whereHas('inscricao', $daTurma)
            ->with(['avaliacao', 'inscricao.participante'])
            ->orderBy('id')
            ->get();
        if ($pendentes->isNotEmpty()) {
            $lista = $pendentes->take(10)->map(fn (Tentativa $t): string => "{$t->inscricao->participante->nome} ({$t->avaliacao->titulo}, tentativa {$t->numero})")->implode('; ');
            $restantes = $pendentes->count() - 10;

            throw new DomainException(sprintf(
                'Há %d tentativa(s) aguardando correção: %s%s. Corrija-as antes de encerrar a turma.',
                $pendentes->count(),
                $lista,
                $restantes > 0 ? " e mais {$restantes}" : '',
            ));
        }

        $emAndamento = Tentativa::query()
            ->where('status', StatusTentativa::EmAndamento->value)
            ->whereHas('inscricao', $daTurma)
            ->lockForUpdate()
            ->get();
        foreach ($emAndamento as $tentativa) {
            $this->tentativas->finalizarPorEncerramento($tentativa);
        }
    }

    /**
     * Emite os certificados que ficaram pendentes por falta de modelo (curso e formações).
     *
     * @return array{emitidos: int, pendentes: int}
     */
    public function emitirPendentes(Turma $turma): array
    {
        if (!$turma->statusEnum()->is(StatusTurma::Encerrada)) {
            throw new DomainException('Só turmas encerradas têm certificados a emitir.');
        }

        $emitidos = 0;
        $pendentes = 0;
        $semCertificado = $turma->inscricoes()
            ->where('status', StatusInscricao::Concluida->value)
            ->with('participante')
            ->get();

        foreach ($semCertificado as $inscricao) {
            /** @var Inscricao $inscricao */
            $jaTinha = $inscricao->certificado()->exists();
            $certificado = $this->certificados->emitirParaInscricao($inscricao);
            if ($certificado === null) {
                $pendentes++;
            } elseif (!$jaTinha) {
                $emitidos++;
            }

            $formacoes = $this->certificados->verificarFormacoes($inscricao->participante, [$turma->curso_id]);
            $emitidos += count($formacoes['emitidos']);
            $pendentes += count($formacoes['pendentes']);
        }

        return ['emitidos' => $emitidos, 'pendentes' => $pendentes];
    }
}
