<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Models\EducaCalendarDayReason;

/**
 * Gestão de Calendários Escolares, Cálculo de Dias Letivos e Cópia Atômica da Rede.
 */
final class CalendarService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly LdbComplianceService $ldb,
    ) {}

    /**
     * @param array{
     *     tenant_id: int,
     *     school_id?: string|null,
     *     ano: int,
     *     nome: string,
     *     carga_horaria_diaria_minutos?: int
     * } $data
     */
    public function criarCalendario(array $data): EducaAcademicCalendar
    {
        $schoolId = $data['school_id'] ?? null;
        $ano = $data['ano'];

        // Se for calendário específico de escola, exige existência do ano letivo com etapas datadas
        if ($schoolId !== null) {
            $anoLetivo = EducaAcademicYear::query()
                ->where('school_id', $schoolId)
                ->where('ano', $ano)
                ->first();

            if (!$anoLetivo || $anoLetivo->etapas()->count() === 0) {
                throw new InvalidArgumentException('A criação do calendário da escola exige que o ano letivo esteja cadastrado com etapas datadas.');
            }
        }

        $calendar = EducaAcademicCalendar::create([
            'tenant_id' => $data['tenant_id'],
            'school_id' => $schoolId,
            'ano' => $ano,
            'nome' => $data['nome'],
            'status' => EducaAcademicCalendar::STATUS_DRAFT,
            'carga_horaria_diaria_minutos' => $data['carga_horaria_diaria_minutos'] ?? 240,
            'total_school_days' => 0,
            'total_school_hours' => 0.00,
        ]);

        $this->audit->record('educa', 'calendar.created', "EducaAcademicCalendar #{$calendar->id}", null, $calendar->toArray());

        return $calendar;
    }

    /**
     * Salva ou atualiza marcações de dias do calendário e recalcula totais atomicamente.
     *
     * @param list<array{
     *     data: string,
     *     motivo_id?: string|null,
     *     descricao?: string|null,
     *     carga_horaria_minutos?: int|null
     * }> $diasInput
     */
    public function salvarDias(EducaAcademicCalendar $calendar, array $diasInput): void
    {
        if ($calendar->isLocked()) {
            throw new LogicException('O calendário escolar está bloqueado para edições.');
        }

        DB::transaction(function () use ($calendar, $diasInput): void {
            $reasonsMap = EducaCalendarDayReason::query()
                ->whereIn('id', array_filter(array_column($diasInput, 'motivo_id')))
                ->get()
                ->keyBy('id');

            foreach ($diasInput as $dia) {
                $carbonDate = Carbon::parse($dia['data']);
                $motivoId = $dia['motivo_id'] ?? null;
                $motivo = $motivoId ? ($reasonsMap[$motivoId] ?? null) : null;

                // Regra: se tem motivo, respeita is_school_day do motivo.
                // Se não tem motivo, dias úteis (seg-sex) são letivos por padrão.
                $diaDaSemana = (int) $carbonDate->dayOfWeekIso; // 1 = Seg, 7 = Dom
                $isFimDeSemana = $diaDaSemana === 6 || $diaDaSemana === 7;

                $isSchoolDay = $motivo ? (bool) $motivo->is_school_day : (!$isFimDeSemana);

                EducaCalendarDay::updateOrCreate(
                    [
                        'tenant_id' => $calendar->tenant_id,
                        'calendario_id' => $calendar->id,
                        'data' => $dia['data'],
                    ],
                    [
                        'dia_da_semana' => (int) $carbonDate->dayOfWeek + 1, // 1 = Dom ... 7 = Sab
                        'motivo_id' => $motivoId,
                        'is_school_day' => $isSchoolDay,
                        'descricao' => $dia['descricao'] ?? null,
                        'carga_horaria_minutos' => $dia['carga_horaria_minutos'] ?? null,
                    ]
                );
            }

            $this->recalcularTotais($calendar);
        });
    }

    /**
     * Recalcula a quantidade de dias letivos e o total de horas do calendário.
     */
    public function recalcularTotais(EducaAcademicCalendar $calendar): void
    {
        $dias = EducaCalendarDay::query()
            ->where('calendario_id', $calendar->id)
            ->where('is_school_day', true)
            ->get();

        $totalDias = $dias->count();
        $totalMinutos = 0;

        $padraoMinutos = $calendar->carga_horaria_diaria_minutos;

        foreach ($dias as $dia) {
            $totalMinutos += ($dia->carga_horaria_minutos ?? $padraoMinutos);
        }

        $totalHoras = round($totalMinutos / 60, 2);

        $before = $calendar->toArray();

        $calendar->update([
            'total_school_days' => $totalDias,
            'total_school_hours' => $totalHoras,
        ]);

        $this->audit->record('educa', 'calendar.totals_recalculated', "EducaAcademicCalendar #{$calendar->id}", $before, $calendar->toArray());
    }

    /**
     * Importa atômica e integralmente os dias e feriados do calendário padrão da rede.
     */
    public function importarDaRede(EducaAcademicCalendar $escolaCalendar, EducaAcademicCalendar $redeCalendar, bool $substituir = false): void
    {
        if ($escolaCalendar->isPublished() || $escolaCalendar->isLocked()) {
            throw new LogicException('Apenas calendários em rascunho (draft) podem importar dias da rede.');
        }

        DB::transaction(function () use ($escolaCalendar, $redeCalendar, $substituir): void {
            if ($substituir) {
                EducaCalendarDay::where('calendario_id', $escolaCalendar->id)->delete();
            }

            $diasRede = EducaCalendarDay::where('calendario_id', $redeCalendar->id)->get();

            foreach ($diasRede as $dia) {
                EducaCalendarDay::updateOrCreate(
                    [
                        'tenant_id' => $escolaCalendar->tenant_id,
                        'calendario_id' => $escolaCalendar->id,
                        'data' => $dia->data->format('Y-m-d'),
                    ],
                    [
                        'dia_da_semana' => $dia->dia_da_semana,
                        'motivo_id' => $dia->motivo_id,
                        'is_school_day' => $dia->is_school_day,
                        'origem' => 'rede',
                        'descricao' => $dia->descricao,
                        'carga_horaria_minutos' => $dia->carga_horaria_minutos,
                    ]
                );
            }

            $this->recalcularTotais($escolaCalendar);
        });

        $this->audit->record('educa', 'calendar.network_imported', "EducaAcademicCalendar #{$escolaCalendar->id}", null, [
            'escola_calendario_id' => $escolaCalendar->id,
            'rede_calendario_id' => $redeCalendar->id,
        ]);
    }

    /**
     * Publica o calendário escolar, exigindo estritamente os mínimos de 200 dias e 800h da LDB.
     *
     * @throws LogicException caso não atinja os requisitos da LDB
     */
    public function publicar(EducaAcademicCalendar $calendar): EducaAcademicCalendar
    {
        $this->recalcularTotais($calendar);
        $diagnostico = $this->ldb->verificarConformidade($calendar->fresh());

        if (!$diagnostico['atende_ldb']) {
            throw new LogicException(
                "O calendário escolar não cumpre as exigências da LDB: faltam {$diagnostico['faltam_dias']} dia(s) letivo(s) e {$diagnostico['faltam_horas']} hora(s)."
            );
        }

        $before = $calendar->toArray();

        $calendar->update([
            'status' => EducaAcademicCalendar::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        $this->audit->record('educa', 'calendar.published', "EducaAcademicCalendar #{$calendar->id}", $before, $calendar->toArray());

        return $calendar->fresh();
    }
}
