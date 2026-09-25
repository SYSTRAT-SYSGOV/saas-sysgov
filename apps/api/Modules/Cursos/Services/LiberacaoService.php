<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Carbon\CarbonImmutable;
use Modules\Cursos\Contracts\ComLiberacao;
use Modules\Cursos\Enums\RegraLiberacao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Support\SituacaoLiberacao;

/**
 * Único ponto que decide se um material ou avaliação está liberado para uma
 * turma (design D2 da Fase 2). Calculado na consulta, sem job agendado.
 */
final class LiberacaoService
{
    private const FUSO = 'America/Sao_Paulo';

    public function situacao(ComLiberacao $item, Turma $turma, ?CarbonImmutable $agora = null): SituacaoLiberacao
    {
        $agora ??= CarbonImmutable::now();

        return match ($item->regraLiberacao()) {
            RegraLiberacao::Imediata => SituacaoLiberacao::liberada(),
            RegraLiberacao::InicioAula => $this->noInicioDaAula($item, $turma, $agora),
            RegraLiberacao::DiasAposInicio => SituacaoLiberacao::agendada($this->aposInicioDaTurma($item, $turma), $agora),
        };
    }

    public function liberado(ComLiberacao $item, Turma $turma, ?CarbonImmutable $agora = null): bool
    {
        return $this->situacao($item, $turma, $agora)->liberado;
    }

    private function noInicioDaAula(ComLiberacao $item, Turma $turma, CarbonImmutable $agora): SituacaoLiberacao
    {
        $aulaId = $item->aulaLiberacaoId();
        $agendamento = $aulaId === null ? null : $turma->agendamentos()->where('aula_id', $aulaId)->first();

        if ($agendamento === null) {
            return SituacaoLiberacao::aguardandoAgendamento();
        }

        return SituacaoLiberacao::agendada(CarbonImmutable::instance($agendamento->inicio), $agora);
    }

    /** 00:00 (Brasília) do dia N dias depois do início da turma. */
    private function aposInicioDaTurma(ComLiberacao $item, Turma $turma): CarbonImmutable
    {
        return CarbonImmutable::parse($turma->data_inicio->toDateString(), self::FUSO)
            ->addDays($item->diasLiberacao() ?? 0)
            ->startOfDay();
    }
}
