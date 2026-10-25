<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Models\EducaCalendarEvent;
use Modules\Educa\Models\EducaSchoolClass;

/**
 * Serviço de Eventos do Calendário e Calendário Personalizado por Turma.
 */
final class CalendarEventService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{mes?: int|null, data?: string|null} $filtros
     * @return Collection<int, EducaCalendarEvent>
     */
    public function listarEventos(EducaAcademicCalendar $calendario, array $filtros = []): Collection
    {
        $query = EducaCalendarEvent::where('calendario_id', $calendario->id);

        if (!empty($filtros['data'])) {
            $query->whereDate('data', $filtros['data']);
        }

        if (!empty($filtros['mes'])) {
            $query->whereMonth('data', (int) $filtros['mes']);
        }

        return $query->orderBy('data')->orderBy('horario_inicio')->get();
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     data: string,
     *     titulo: string,
     *     descricao?: string|null,
     *     tipo_evento: string,
     *     horario_inicio?: string|null,
     *     horario_fim?: string|null
     * } $dados
     */
    public function criarEvento(EducaAcademicCalendar $calendario, array $dados): EducaCalendarEvent
    {
        $dados['calendario_id'] = $calendario->id;

        // Tenta associar ao dia correspondente no calendário
        $dia = EducaCalendarDay::where('calendario_id', $calendario->id)
            ->whereDate('data', $dados['data'])
            ->first();

        if ($dia !== null) {
            $dados['calendar_day_id'] = $dia->id;
        }

        return DB::transaction(function () use ($dados): EducaCalendarEvent {
            $evento = EducaCalendarEvent::create($dados);
            $this->audit->record('educa', 'calendar_event.created', "EducaCalendarEvent #{$evento->id}", null, $evento->toArray());

            return $evento;
        });
    }

    /**
     * @param array{
     *     titulo?: string,
     *     descricao?: string|null,
     *     tipo_evento?: string,
     *     horario_inicio?: string|null,
     *     horario_fim?: string|null
     * } $dados
     */
    public function atualizarEvento(EducaCalendarEvent $evento, array $dados): EducaCalendarEvent
    {
        $old = $evento->toArray();
        $evento->update($dados);

        $this->audit->record('educa', 'calendar_event.updated', "EducaCalendarEvent #{$evento->id}", $old, $evento->fresh()->toArray());

        return $evento->fresh();
    }

    public function excluirEvento(EducaCalendarEvent $evento): void
    {
        $old = $evento->toArray();
        $evento->delete();

        $this->audit->record('educa', 'calendar_event.deleted', "EducaCalendarEvent #{$evento->id}", $old, null);
    }

    /**
     * @return list<string>
     */
    public function listarTurmasDoDia(EducaCalendarDay $dia): array
    {
        return $dia->turmas()->pluck('educa_school_classes.id')->all();
    }

    /**
     * @param list<string> $turmaIds
     * @return list<string>
     */
    public function sincronizarTurmasDoDia(EducaCalendarDay $dia, array $turmaIds): array
    {
        return DB::transaction(function () use ($dia, $turmaIds): array {
            $syncData = [];
            foreach ($turmaIds as $turmaId) {
                $syncData[$turmaId] = [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'tenant_id' => $dia->tenant_id,
                ];
            }

            $dia->turmas()->sync($syncData);

            $this->audit->record('educa', 'calendar_day.classes_synced', "EducaCalendarDay #{$dia->id}", null, [
                'calendar_day_id' => $dia->id,
                'turma_ids' => $turmaIds,
            ]);

            return $this->listarTurmasDoDia($dia);
        });
    }

    /**
     * Calcula a visão personalizada do calendário escolar para uma turma específica.
     *
     * @return array{
     *     turma_id: string,
     *     calendario_id: string,
     *     ano: int,
     *     total_dias_letivos: int,
     *     dias: list<array{
     *         data: string,
     *         dia_da_semana: int,
     *         is_school_day: bool,
     *         motivo_tipo: string|null,
     *         descricao: string|null,
     *         especifico_da_turma: bool
     *     }>
     * }
     */
    public function obterCalendarioTurma(EducaSchoolClass $turma, ?int $mes = null): array
    {
        $turma->loadMissing(['anoLetivo', 'escola']);
        $ano = (int) $turma->anoLetivo->ano;

        // Busca o calendário publicado da escola, ou da rede se a escola não tiver
        $calendario = EducaAcademicCalendar::query()
            ->where('ano', $ano)
            ->where(function ($q) use ($turma): void {
                $q->where('school_id', $turma->school_id)
                    ->orWhereNull('school_id');
            })
            ->where('status', EducaAcademicCalendar::STATUS_PUBLISHED)
            ->orderByRaw('CASE WHEN school_id IS NOT NULL THEN 0 ELSE 1 END')
            ->first();

        if ($calendario === null) {
            throw new LogicException("Não foi localizado calendário escolar publicado para o ano letivo {$ano}.");
        }

        $queryDias = EducaCalendarDay::where('calendario_id', $calendario->id)
            ->with(['motivo', 'turmas']);

        if ($mes !== null) {
            $queryDias->whereMonth('data', $mes);
        }

        $diasCollection = $queryDias->orderBy('data')->get();

        $diasFormatados = [];
        $totalDiasLetivos = 0;

        foreach ($diasCollection as $dia) {
            $turmasAssociadas = $dia->turmas;
            $temTurmasVinculadas = $turmasAssociadas->isNotEmpty();

            if ($temTurmasVinculadas) {
                $turmaEstaPresente = $turmasAssociadas->contains('id', $turma->id);
                $isLetivo = $turmaEstaPresente ? (bool) $dia->is_school_day : false;
                $especifico = $turmaEstaPresente;
            } else {
                $isLetivo = (bool) $dia->is_school_day;
                $especifico = false;
            }

            if ($isLetivo) {
                $totalDiasLetivos++;
            }

            $diasFormatados[] = [
                'data' => $dia->data->format('Y-m-d'),
                'dia_da_semana' => (int) $dia->dia_da_semana,
                'is_school_day' => $isLetivo,
                'motivo_tipo' => $dia->motivo?->tipo,
                'descricao' => $dia->descricao,
                'especifico_da_turma' => $especifico,
            ];
        }

        return [
            'turma_id' => $turma->id,
            'calendario_id' => $calendario->id,
            'ano' => $calendario->ano,
            'total_dias_letivos' => $totalDiasLetivos,
            'dias' => $diasFormatados,
        ];
    }
}
