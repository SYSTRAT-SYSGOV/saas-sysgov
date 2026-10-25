<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use Modules\Educa\Models\EducaAcademicCalendar;

/**
 * Serviço de Verificação de Conformidade com a LDB (Lei 9.394/1996, art. 24, I).
 *
 * Mínimos legais exigidos:
 * - 200 (duzentos) dias de efetivo trabalho escolar
 * - 800 (oitocentas) horas anuais de aula
 */
final class LdbComplianceService
{
    public const MINIMO_DIAS_LETIVOS = 200;
    public const MINIMO_HORAS_LETIVAS = 800.0;

    /**
     * @return array{
     *     atende_ldb: bool,
     *     dias_letivos_minimo: int,
     *     horas_minimo: float,
     *     dias_letivos_planejados: int,
     *     horas_planejadas: float,
     *     faltam_dias: int,
     *     faltam_horas: float,
     *     sugestoes: list<string>
     * }
     */
    public function verificarConformidade(EducaAcademicCalendar $calendar): array
    {
        $diasPlanejados = $calendar->total_school_days;
        $horasPlanejadas = (float) $calendar->total_school_hours;

        $faltamDias = max(0, self::MINIMO_DIAS_LETIVOS - $diasPlanejados);
        $faltamHoras = max(0.0, round(self::MINIMO_HORAS_LETIVAS - $horasPlanejadas, 2));

        $atendeLdb = $faltamDias === 0 && $faltamHoras <= 0.0;

        $sugestoes = [];
        if ($faltamDias > 0) {
            $sugestoes[] = "Incluir {$faltamDias} dia(s) letivo(s) extra(s) ou sábado(s) letivo(s) de reposição/planejamento.";
        }
        if ($faltamHoras > 0) {
            $sugestoes[] = "Aumentar a carga horária diária ou estender dias letivos para suprir as {$faltamHoras} hora(s) faltante(s).";
        }

        return [
            'atende_ldb' => $atendeLdb,
            'dias_letivos_minimo' => self::MINIMO_DIAS_LETIVOS,
            'horas_minimo' => self::MINIMO_HORAS_LETIVAS,
            'dias_letivos_planejados' => $diasPlanejados,
            'horas_planejadas' => $horasPlanejadas,
            'faltam_dias' => $faltamDias,
            'faltam_horas' => $faltamHoras,
            'sugestoes' => $sugestoes,
        ];
    }

    /**
     * Avalia conformidade do ano letivo com a LDB a partir de suas etapas e calendários.
     *
     * @return array<string, mixed>
     */
    public function evaluateAcademicYear(\Modules\Educa\Models\EducaAcademicYear $year): array
    {
        $calendar = EducaAcademicCalendar::query()
            ->where('ano', $year->ano)
            ->where(function ($q) use ($year): void {
                $q->where('school_id', $year->school_id)
                  ->orWhereNull('school_id');
            })
            ->orderByRaw('CASE WHEN school_id IS NOT NULL THEN 0 ELSE 1 END')
            ->first();

        $diasPlanejados = $calendar ? $calendar->total_school_days : (int) $year->etapas()->sum('dias_letivos');
        $horasPlanejadas = $calendar ? (float) $calendar->total_school_hours : (float) ($diasPlanejados * 4.0);

        $faltamDias = max(0, self::MINIMO_DIAS_LETIVOS - $diasPlanejados);
        $faltamHoras = max(0.0, round(self::MINIMO_HORAS_LETIVAS - $horasPlanejadas, 2));

        $conformePlanejamento = $faltamDias === 0 && $faltamHoras <= 0.0;

        $sugestoes = [];
        if ($faltamDias > 0) {
            $sugestoes[] = "Incluir {$faltamDias} dia(s) letivo(s) extra(s) ou sábado(s) letivo(s) de reposição/planejamento.";
        }
        if ($faltamHoras > 0) {
            $sugestoes[] = "Aumentar a carga horária diária ou estender dias letivos para suprir as {$faltamHoras} hora(s) faltante(s).";
        }

        return [
            'ano_letivo_id' => $year->id,
            'dias_letivos_minimo' => self::MINIMO_DIAS_LETIVOS,
            'horas_minimo' => (int) self::MINIMO_HORAS_LETIVAS,
            'dias_letivos_planejados' => $diasPlanejados,
            'horas_planejadas' => $horasPlanejadas,
            'dias_letivos_cumpridos' => 0,
            'horas_cumpridas' => 0.0,
            'conforme_planejamento' => $conformePlanejamento,
            'conforme_execucao' => false,
            'faltam_dias' => $faltamDias,
            'faltam_horas' => $faltamHoras,
            'sugestoes' => $sugestoes,
        ];
    }
}
