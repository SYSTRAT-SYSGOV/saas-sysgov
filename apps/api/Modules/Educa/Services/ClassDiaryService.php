<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Models\EducaClassDiary;
use Modules\Educa\Models\EducaSchoolClass;

/**
 * Serviço de Negócio para o Diário de Classe e Validação de Dias Letivos.
 */
final class ClassDiaryService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Registra uma aula ministrada no diário de classe com validação estrita de dia letivo.
     *
     * @param array<string, mixed> $dados
     */
    public function registrarAula(array $dados): EducaClassDiary
    {
        $turma = EducaSchoolClass::query()->where('id', $dados['school_class_id'])->firstOrFail();

        // 1. Validação de Dia Letivo Oficial no Calendário
        $this->validarDiaLetivo($turma, (string) $dados['data_aula']);

        /** @var EducaClassDiary $diario */
        $diario = EducaClassDiary::create([
            'tenant_id' => $turma->tenant_id,
            'school_class_id' => $turma->id,
            'curriculum_component_id' => $dados['curriculum_component_id'],
            'data_aula' => $dados['data_aula'],
            'quantidade_aulas' => $dados['quantidade_aulas'] ?? 1,
            'conteudo' => $dados['conteudo'],
            'habilidades_bncc' => $dados['habilidades_bncc'] ?? null,
            'status' => $dados['status'] ?? EducaClassDiary::STATUS_PUBLICADO,
        ]);

        $this->audit->record('educa', 'class_diary.created', "EducaClassDiary #{$diario->id}", null, $diario->toArray());

        return $diario;
    }

    /**
     * Lista aulas registradas com filtros.
     *
     * @param array<string, mixed> $filtros
     * @return Collection<int, EducaClassDiary>
     */
    public function listar(array $filtros): Collection
    {
        $query = EducaClassDiary::with(['turma', 'componente'])->orderByDesc('data_aula');

        if (!empty($filtros['school_class_id'])) {
            $query->where('school_class_id', $filtros['school_class_id']);
        }
        if (!empty($filtros['curriculum_component_id'])) {
            $query->where('curriculum_component_id', $filtros['curriculum_component_id']);
        }
        if (!empty($filtros['data_inicio'])) {
            $query->where('data_aula', '>=', $filtros['data_inicio']);
        }
        if (!empty($filtros['data_fim'])) {
            $query->where('data_aula', '<=', $filtros['data_fim']);
        }

        return $query->get();
    }

    /**
     * Valida se a data corresponde a um dia letivo do calendário escolar ativo.
     */
    private function validarDiaLetivo(EducaSchoolClass $turma, string $dataAula): void
    {
        $ano = $turma->anoLetivo?->ano ?? (int) substr($dataAula, 0, 4);

        // Busca o calendário da escola ou o calendário geral da rede para o ano
        $calendario = EducaAcademicCalendar::query()
            ->where('tenant_id', $turma->tenant_id)
            ->where('ano', $ano)
            ->where(function ($q) use ($turma): void {
                $q->where('school_id', $turma->school_id)
                  ->orWhereNull('school_id'); // Calendário da rede
            })
            ->orderByRaw('school_id IS NOT NULL DESC')
            ->first();

        if ($calendario !== null) {
            $dia = EducaCalendarDay::query()
                ->where('calendario_id', $calendario->id)
                ->where('data', $dataAula)
                ->first();

            // Se o dia existir e estiver marcado como não letivo, bloqueia
            if ($dia !== null && !$dia->is_school_day) {
                throw ValidationException::withMessages([
                    'data_aula' => ["A data {$dataAula} não é um dia letivo oficial no calendário escolar."],
                ]);
            }
        }
    }
}
