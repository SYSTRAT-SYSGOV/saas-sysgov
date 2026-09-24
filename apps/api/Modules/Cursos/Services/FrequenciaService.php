<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Presenca;

/**
 * Frequência = aulas com presença ÷ aulas agendadas da turma × 100.
 * Turma sem aula agendada tem frequência 0 (nunca divide por zero).
 */
final class FrequenciaService
{
    /**
     * @param bool $ateAgora só considera as aulas que já começaram (acompanhamento durante a turma)
     * @return array{aulas: int, presencas: int, percentual: float}
     */
    public function resumo(Inscricao $inscricao, bool $ateAgora = false): array
    {
        $agendamentos = AulaAgendamento::query()
            ->where('turma_id', $inscricao->turma_id)
            ->when($ateAgora, fn ($q) => $q->where('inicio', '<=', now()))
            ->pluck('id');

        $presencas = Presenca::query()
            ->where('inscricao_id', $inscricao->id)
            ->where('presente', true)
            ->whereIn('agendamento_id', $agendamentos)
            ->count();

        $aulas = $agendamentos->count();

        return [
            'aulas' => $aulas,
            'presencas' => $presencas,
            'percentual' => $aulas === 0 ? 0.0 : round($presencas / $aulas * 100, 2),
        ];
    }

    /**
     * Detalhe por aula agendada: presente, falta, em andamento (sem chamada ainda) ou não realizada.
     *
     * @return list<array{agendamento_id: int, aula: string, inicio: string, fim: string, situacao: string}>
     */
    public function detalhe(Inscricao $inscricao): array
    {
        $presencas = Presenca::query()->where('inscricao_id', $inscricao->id)->pluck('presente', 'agendamento_id');

        return AulaAgendamento::query()
            ->where('turma_id', $inscricao->turma_id)
            ->with('aula:id,titulo')
            ->orderBy('inicio')
            ->get()
            ->map(fn (AulaAgendamento $a): array => [
                'agendamento_id' => $a->id,
                'aula' => $a->aula->titulo,
                'inicio' => $a->inicio->toIso8601String(),
                'fim' => $a->fim->toIso8601String(),
                'situacao' => match (true) {
                    ($presencas[$a->id] ?? null) === true => 'presente',
                    !$a->jaComecou() => 'nao_realizada',
                    $a->emAndamento() && !isset($presencas[$a->id]) => 'em_andamento',
                    default => 'falta',
                },
            ])
            ->values()
            ->all();
    }
}
