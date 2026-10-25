# Mapeamento Técnico de Migração: Quadro de Horários e Alocação Docente

> **Módulo:** `Quadro de Horários e Alocação Docente` (`Timetable` / `Servidores / Alocação`)  
> **Sistema Origem:** `i-Educar (Legado PHP / PostgreSQL)`  
> **Sistema Destino:** `SYSGOV` / `SYS-Educa` (`Laravel 13 PHP 8.4` / `MySQL 8.0/8.4+` / `React 19`)  
> **Data de Elaboração:** `2026-10-12`  
> **Status:** `Pronto para Implementação (Fase SDD / Forward)`

---

## 1. Visão Geral e Contexto de Negócio

No i-Educar legado, a alocação de docentes e a definição de grades horárias eram tratadas de forma fragmentada entre:
1. `pmieducar.servidor_alocacao`: Registro administrativo da jornada de trabalho do professor na unidade escolar (dias da semana, períodos, horas em sala de aula e `hora_atividade`).
2. `pmieducar.servidor_disciplina`: Habilitação formal do docente para ministrar determinados componentes curriculares.
3. `pmieducar.quadro_horario` e `pmieducar.quadro_horario_horarios`: O quadro semanal de horários da turma, distribuindo as aulas por dia da semana (`dia_semana` 1..7) e intervalos (`hora_inicial` a `hora_final`).
4. `pmieducar.quadro_horario_horarios_aux`: Staging transitório utilizado por scripts legados para rascunho e salvamento em lote da grade.

### Desafios Identificados no Legado
- **Ausência de Travamento Concorrente:** A verificação de choques dependia de consultas ad-hoc não protegidas por transações ou constraints rigorosas, gerando conflitos quando duas escolas municipais alocavam o mesmo professor no mesmo horário.
- **Risco de Choque Inter-Escolas:** Como os professores da rede municipal costumam atuar em duas ou mais escolas municipais diferentes no mesmo ano, o cálculo de choque precisa ser **global no Tenant (Município)** e não apenas na escola local.
- **Diferenciação Estrita de Horas:** Falta de suporte fluido a horas-aula regulares vs. hora-atividade (planejamento) vs. horas excedentes (regime suplementar).
- **Substituição Docente Precária:** O legado apenas sobrepunha `ref_servidor_substituto` sem registrar o período histórico de afastamento (licença médica, maternidade ou prêmio).

---

## 2. DDL no Padrão SYSGOV (MySQL 8.0/8.4+ InnoDB)

```sql
-- =============================================================================
-- TABELA: educa_teacher_allocations (Alocação Administrativa de Docentes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_teacher_allocations` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 da alocação',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão contratante',
    `school_id` CHAR(36) NOT NULL COMMENT 'FK educa_schools: Unidade de ensino de exercício',
    `employee_id` CHAR(36) NOT NULL COMMENT 'FK core_employees/users: Servidor/Professor alocado',
    `academic_year_id` CHAR(36) NOT NULL COMMENT 'FK educa_academic_years: Ano letivo de vigência',
    `role_id` CHAR(36) DEFAULT NULL COMMENT 'FK core_roles: Função desempenhada (ex: Professor Titular, Apoio)',
    `contract_type` VARCHAR(50) NOT NULL DEFAULT 'EFETIVO' COMMENT 'Tipo de vínculo: EFETIVO, CONTRATO_TEMPORARIO, COMISSIONADO',
    `workload_hours_weekly` DECIMAL(5, 2) NOT NULL DEFAULT 40.00 COMMENT 'Carga horária semanal total em horas',
    `classroom_hours_weekly` DECIMAL(5, 2) NOT NULL DEFAULT 26.66 COMMENT 'Horas dedicadas a sala de aula',
    `planning_hours_weekly` DECIMAL(5, 2) NOT NULL DEFAULT 13.34 COMMENT 'Hora-atividade / Planejamento pedagógico',
    `extra_hours_weekly` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Horas suplementares / excedentes autorizadas',
    `admission_date` DATE NOT NULL COMMENT 'Data de início do exercício na escola',
    `termination_date` DATE DEFAULT NULL COMMENT 'Data de encerramento do exercício',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Ativo, 0 = Inativo',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_teacher_alloc_tenant` (`tenant_id`),
    INDEX `idx_teacher_alloc_school` (`school_id`),
    INDEX `idx_teacher_alloc_emp_year` (`employee_id`, `academic_year_id`),
    CONSTRAINT `fk_teacher_alloc_school` FOREIGN KEY (`school_id`) REFERENCES `educa_schools` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_teacher_alloc_year` FOREIGN KEY (`academic_year_id`) REFERENCES `educa_academic_years` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Alocação contratual e jornada semanal do docente na escola';

-- =============================================================================
-- TABELA: educa_teacher_qualifications (Habilitações do Docente por Disciplina)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_teacher_qualifications` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do registro de habilitação',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município',
    `employee_id` CHAR(36) NOT NULL COMMENT 'FK do servidor docente',
    `discipline_id` CHAR(36) NOT NULL COMMENT 'FK educa_disciplines: Componente curricular habilitado',
    `course_id` CHAR(36) DEFAULT NULL COMMENT 'FK educa_courses: Curso específico (opcional se geral)',
    `license_type` VARCHAR(50) NOT NULL DEFAULT 'LICENCIATURA_PLENA' COMMENT 'LICENCIATURA_PLENA, BACHARELADO, NOTORIO_SABER, COMPLEMENTACAO',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_teacher_qualif` (`tenant_id`, `employee_id`, `discipline_id`, `course_id`),
    INDEX `idx_teacher_qualif_emp` (`employee_id`),
    CONSTRAINT `fk_teacher_qualif_discipline` FOREIGN KEY (`discipline_id`) REFERENCES `educa_disciplines` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Habilitações e permissões de ensino do docente por disciplina';

-- =============================================================================
-- TABELA: educa_timetables (Cabeçalho do Quadro de Horários da Turma)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_timetables` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do quadro de horários',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município',
    `school_id` CHAR(36) NOT NULL COMMENT 'FK educa_schools',
    `school_class_id` CHAR(36) NOT NULL COMMENT 'FK educa_school_classes: Turma vinculada',
    `academic_year_id` CHAR(36) NOT NULL COMMENT 'FK educa_academic_years: Ano letivo',
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT' COMMENT 'Situação da grade de horários',
    `version` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Versão sequencial da grade da turma',
    `published_at` DATETIME DEFAULT NULL COMMENT 'Data e hora da homologação/publicação',
    `created_by` CHAR(36) DEFAULT NULL COMMENT 'Usuário que criou',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_timetable_turma_ano_ver` (`tenant_id`, `school_class_id`, `academic_year_id`, `version`),
    INDEX `idx_timetable_school` (`school_id`),
    INDEX `idx_timetable_status` (`status`),
    CONSTRAINT `fk_timetable_turma` FOREIGN KEY (`school_class_id`) REFERENCES `educa_school_classes` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_timetable_year` FOREIGN KEY (`academic_year_id`) REFERENCES `educa_academic_years` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quadro mestre de horários da turma';

-- =============================================================================
-- TABELA: educa_timetable_slots (Slots / Aulas Semanais da Grade)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_timetable_slots` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do slot de aula',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município',
    `timetable_id` CHAR(36) NOT NULL COMMENT 'FK educa_timetables',
    `school_class_id` CHAR(36) NOT NULL COMMENT 'Denormalizado para indexação e check de choque veloz',
    `discipline_id` CHAR(36) NOT NULL COMMENT 'FK educa_disciplines: Componente curricular da aula',
    `teacher_id` CHAR(36) NOT NULL COMMENT 'FK core_employees: Professor titular ministrante',
    `day_of_week` TINYINT UNSIGNED NOT NULL COMMENT '1=Domingo, 2=Segunda, 3=Terça, 4=Quarta, 5=Quinta, 6=Sexta, 7=Sábado',
    `slot_sequence` TINYINT UNSIGNED NOT NULL COMMENT 'Número ordinal da aula no dia (1ª aula, 2ª aula...)',
    `start_time` TIME NOT NULL COMMENT 'Horário de início da aula (ex: 07:30:00)',
    `end_time` TIME NOT NULL COMMENT 'Horário de término da aula (ex: 08:20:00)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Slot ativo, 0 = Removido',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_slot_timetable` (`timetable_id`),
    INDEX `idx_slot_turma_tempo` (`tenant_id`, `school_class_id`, `day_of_week`, `start_time`, `end_time`),
    INDEX `idx_slot_docente_tempo` (`tenant_id`, `teacher_id`, `day_of_week`, `start_time`, `end_time`),
    CONSTRAINT `fk_slot_timetable` FOREIGN KEY (`timetable_id`) REFERENCES `educa_timetables` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_slot_discipline` FOREIGN KEY (`discipline_id`) REFERENCES `educa_disciplines` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Grade horária semanal com aulas e professores atribuídos';

-- =============================================================================
-- TABELA: educa_teacher_substitutions (Histórico de Substituição Docente)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_teacher_substitutions` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do afastamento/substituição',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município',
    `school_id` CHAR(36) NOT NULL COMMENT 'FK educa_schools',
    `original_teacher_id` CHAR(36) NOT NULL COMMENT 'Professor titular substituído',
    `substitute_teacher_id` CHAR(36) NOT NULL COMMENT 'Professor substituto assumindo as aulas',
    `school_class_id` CHAR(36) DEFAULT NULL COMMENT 'Turma específica (NULL = Todas as turmas da escola)',
    `discipline_id` CHAR(36) DEFAULT NULL COMMENT 'Disciplina específica (NULL = Todas as disciplinas)',
    `reason` VARCHAR(100) NOT NULL COMMENT 'Motivo: LICENCA_MATERNIDADE, LICENCA_MEDICA, AFASTAMENTO, OUTRO',
    `start_date` DATE NOT NULL COMMENT 'Data inicial da substituição',
    `end_date` DATE NOT NULL COMMENT 'Data final da substituição',
    `status` ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_teacher_sub_original` (`tenant_id`, `original_teacher_id`, `start_date`, `end_date`),
    INDEX `idx_teacher_sub_substitute` (`tenant_id`, `substitute_teacher_id`, `start_date`, `end_date`),
    CONSTRAINT `fk_teacher_sub_school` FOREIGN KEY (`school_id`) REFERENCES `educa_schools` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Controle e histórico de substituições temporárias de docentes';
```

---

## 3. Matriz De/Para: Legado (i-Educar) $\rightarrow$ SYSGOV

| Tabela Legada | Campo Legado | Tabela SYSGOV | Campo SYSGOV | Transformação / Regra |
| :--- | :--- | :--- | :--- | :--- |
| `pmieducar.quadro_horario` | `cod_quadro_horario` | `educa_timetables` | `id` | Conversão para UUID v4 |
| `pmieducar.quadro_horario` | `ref_cod_turma` | `educa_timetables` | `school_class_id` | FK `educa_school_classes(id)` |
| `pmieducar.quadro_horario` | `ano` | `educa_timetables` | `academic_year_id` | Resolução do ID do ano letivo |
| `pmieducar.quadro_horario` | `ativo` | `educa_timetables` | `status` | `1` $\rightarrow$ `'PUBLISHED'`, `0` $\rightarrow$ `'ARCHIVED'` |
| `pmieducar.quadro_horario_horarios` | `ref_cod_quadro_horario` | `educa_timetable_slots` | `timetable_id` | FK do cabeçalho da grade |
| `pmieducar.quadro_horario_horarios` | `sequencial` | `educa_timetable_slots` | `slot_sequence` | Sequencial ordinal da aula (1..N) |
| `pmieducar.quadro_horario_horarios` | `dia_semana` | `educa_timetable_slots` | `day_of_week` | 1=Dom .. 7=Sáb (`TINYINT UNSIGNED`) |
| `pmieducar.quadro_horario_horarios` | `hora_inicial` | `educa_timetable_slots` | `start_time` | Tipo `TIME` (`HH:MM:SS`) |
| `pmieducar.quadro_horario_horarios` | `hora_final` | `educa_timetable_slots` | `end_time` | Tipo `TIME` (`HH:MM:SS`) |
| `pmieducar.quadro_horario_horarios` | `ref_cod_disciplina` | `educa_timetable_slots` | `discipline_id` | FK `educa_disciplines(id)` |
| `pmieducar.quadro_horario_horarios` | `ref_servidor` | `educa_timetable_slots` | `teacher_id` | UUID do docente titular |
| `pmieducar.quadro_horario_horarios` | `ref_servidor_substituto` | `educa_teacher_substitutions` | `substitute_teacher_id` | Criação de registro na tabela histórica |
| `pmieducar.servidor_alocacao` | `cod_servidor_alocacao` | `educa_teacher_allocations` | `id` | Conversão para UUID v4 |
| `pmieducar.servidor_alocacao` | `ref_cod_servidor` | `educa_teacher_allocations` | `employee_id` | UUID do servidor docente |
| `pmieducar.servidor_alocacao` | `ref_cod_escola` | `educa_teacher_allocations` | `school_id` | FK da unidade escolar |
| `pmieducar.servidor_alocacao` | `carga_horaria` | `educa_teacher_allocations` | `classroom_hours_weekly`| Horas de regência de classe |
| `pmieducar.servidor_alocacao` | `hora_atividade` | `educa_teacher_allocations` | `planning_hours_weekly` | Horas de planejamento/coordenação |
| `pmieducar.servidor_alocacao` | `horas_excedentes` | `educa_teacher_allocations` | `extra_hours_weekly` | Horas complementares |
| `pmieducar.servidor_disciplina`| `(servidor, disciplina)` | `educa_teacher_qualifications` | `(employee_id, discipline_id)`| Habilitação curricular formal |

---

## 4. Serviço de Detecção de Choque de Horários (`apps/api`)

Implementação do algoritmo de detecção de choque em **Laravel 13 (PHP 8.4)**:

```php
<?php

declare(strict_types=1);

namespace Modules\SysEduca\Services\Timetable;

use App\Models\Tenant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\SysEduca\DTOs\TimetableSlotDTO;
use Modules\SysEduca\Exceptions\TimetableConflictException;

/**
 * Serviço responsável por validar e garantir a inexistência de choques
 * de horários tanto para turmas quanto para professores em todo o Tenant.
 */
final class ScheduleConflictDetectorService
{
    /**
     * Valida um slot individual antes de sua inclusão ou alteração.
     *
     * @param string $tenantId
     * @param string $academicYearId
     * @param TimetableSlotDTO $slot
     * @param string|null $ignoreSlotId Slot que está sendo editado (se houver)
     * @return void
     * @throws TimetableConflictException
     */
    public function validateSlot(
        string $tenantId,
        string $academicYearId,
        TimetableSlotDTO $slot,
        ?string $ignoreSlotId = null
    ): void {
        // 1. Validar Choque da Turma (mesma turma não pode ter 2 aulas no mesmo intervalo de tempo)
        $classConflict = DB::table('educa_timetable_slots as s')
            ->join('educa_timetables as t', 't.id', '=', 's.timetable_id')
            ->where('s.tenant_id', $tenantId)
            ->where('t.academic_year_id', $academicYearId)
            ->where('s.school_class_id', $slot->schoolClassId)
            ->where('s.day_of_week', $slot->dayOfWeek)
            ->where('s.is_active', 1)
            ->where('t.status', '!=', 'ARCHIVED')
            ->when($ignoreSlotId, fn($q) => $q->where('s.id', '!=', $ignoreSlotId))
            ->where(function ($query) use ($slot) {
                // Interval overlap: StartA < EndB AND EndA > StartB
                $query->where('s.start_time', '<', $slot->endTime)
                      ->where('s.end_time', '>', $slot->startTime);
            })
            ->select('s.id', 's.start_time', 's.end_time', 's.discipline_id')
            ->first();

        if ($classConflict) {
            throw new TimetableConflictException(
                message: "Choque de horário na Turma! Já existe aula alocada entre {$classConflict->start_time} e {$classConflict->end_time}.",
                conflictType: 'CLASS_OVERLAP',
                conflictData: (array) $classConflict
            );
        }

        // 2. Validar Choque do Docente (mesmo professor não pode lecionar em 2 turmas/escolas simultaneamente)
        $teacherConflict = DB::table('educa_timetable_slots as s')
            ->join('educa_timetables as t', 't.id', '=', 's.timetable_id')
            ->join('educa_schools as sc', 'sc.id', '=', 't.school_id')
            ->join('educa_school_classes as c', 'c.id', '=', 's.school_class_id')
            ->where('s.tenant_id', $tenantId)
            ->where('t.academic_year_id', $academicYearId)
            ->where('s.teacher_id', $slot->teacherId)
            ->where('s.day_of_week', $slot->dayOfWeek)
            ->where('s.is_active', 1)
            ->where('t.status', '!=', 'ARCHIVED')
            ->when($ignoreSlotId, fn($q) => $q->where('s.id', '!=', $ignoreSlotId))
            ->where(function ($query) use ($slot) {
                $query->where('s.start_time', '<', $slot->endTime)
                      ->where('s.end_time', '>', $slot->startTime);
            })
            ->select(
                's.id',
                's.start_time',
                's.end_time',
                'c.name as class_name',
                'sc.name as school_name'
            )
            ->first();

        if ($teacherConflict) {
            throw new TimetableConflictException(
                message: "Choque de horário do Docente! O professor já está lecionando na turma '{$teacherConflict->class_name}' ({$teacherConflict->school_name}) das {$teacherConflict->start_time} às {$teacherConflict->end_time}.",
                conflictType: 'TEACHER_OVERLAP',
                conflictData: (array) $teacherConflict
            );
        }
    }

    /**
     * Valida em lote toda uma matriz semanal de slots de uma turma (utilizado ao salvar grade inteira).
     *
     * @param string $tenantId
     * @param string $academicYearId
     * @param string $schoolClassId
     * @param array<TimetableSlotDTO> $slots
     * @return Collection
     */
    public function validateBatch(
        string $tenantId,
        string $academicYearId,
        string $schoolClassId,
        array $slots
    ): Collection {
        $conflicts = collect();

        // 1. Checagem interna na própria carga enviada
        $count = count($slots);
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $a = $slots[$i];
                $b = $slots[$j];

                if ($a->dayOfWeek === $b->dayOfWeek) {
                    $overlap = ($a->startTime < $b->endTime) && ($a->endTime > $b->startTime);
                    if ($overlap) {
                        $conflicts->push([
                            'type' => 'INTERNAL_COLLISION',
                            'message' => "Dois slots enviados possuem sobreposição no mesmo dia (dia {$a->dayOfWeek}: {$a->startTime}-{$a->endTime} vs {$b->startTime}-{$b->endTime})."
                        ]);
                    }
                }
            }
        }

        // 2. Checagem contra o banco
        foreach ($slots as $slot) {
            try {
                $this->validateSlot($tenantId, $academicYearId, $slot);
            } catch (TimetableConflictException $e) {
                $conflicts->push([
                    'type' => $e->getConflictType(),
                    'message' => $e->getMessage(),
                    'data' => $e->getConflictData(),
                ]);
            }
        }

        return $conflicts;
    }
}
```

---

## 4. Endpoints RESTful (`apps/api`)

### Quadro de Horários da Turma
- `GET /api/v1/schools/{school}/classes/{class}/timetable`: Retorna a grade atual publicada da turma com os slots organizados por dia da semana e horários.
- `POST /api/v1/schools/{school}/classes/{class}/timetable`: Cria ou atualiza a grade de horários da turma em lote (inclui transação atômica e checagem de choque).
- `POST /api/v1/schools/{school}/timetables/validate-conflicts`: Endpoint rápido de validação prévia de choque para feedback instantâneo na UI.

### Alocação e Habilitação de Docentes
- `GET /api/v1/schools/{school}/teacher-allocations`: Lista os professores alocados na escola para o ano letivo, com saldo de carga horária e horas-aula já atribuídas.
- `POST /api/v1/schools/{school}/teacher-allocations`: Registra a alocação de um professor na escola.
- `GET /api/v1/teachers/{teacher}/qualifications`: Consulta as disciplinas habilitadas para o professor.
- `POST /api/v1/teachers/substitutions`: Registra a substituição temporária de um professor em afastamento com verificação de choque do substituto.

---

## 5. Contratos TypeScript (`@sysgov/sdk`)

```typescript
// =============================================================================
// CONTRATOS: Quadro de Horários e Alocação Docente
// =============================================================================

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface TimetableSlot {
  id: string;
  timetableId: string;
  schoolClassId: string;
  disciplineId: string;
  disciplineName: string;
  disciplineColor?: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: DayOfWeek;
  slotSequence: number;
  startTime: string; // "07:30:00"
  endTime: string;   // "08:20:00"
  isActive: boolean;
}

export interface Timetable {
  id: string;
  schoolId: string;
  schoolClassId: string;
  schoolClassName: string;
  academicYearId: string;
  academicYear: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  slots: TimetableSlot[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictValidationRequest {
  academicYearId: string;
  schoolClassId: string;
  slots: Array<{
    id?: string;
    disciplineId: string;
    teacherId: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
  }>;
}

export interface ConflictValidationResult {
  hasConflicts: boolean;
  conflicts: Array<{
    type: 'CLASS_OVERLAP' | 'TEACHER_OVERLAP' | 'WORKLOAD_EXCEEDED' | 'INTERNAL_COLLISION';
    message: string;
    details?: Record<string, unknown>;
  }>;
}

export interface TeacherAllocationSummary {
  id: string;
  employeeId: string;
  employeeName: string;
  schoolId: string;
  schoolName: string;
  workloadHoursWeekly: number;
  classroomHoursWeekly: number;
  planningHoursWeekly: number;
  assignedClassroomHours: number;
  availableHours: number;
  qualifiedDisciplines: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}
```

---

## 6. Componente UI: Grade Interativa com Prevenção Visual de Choques (`apps/web-client`)

Implementado em **React 19 + TypeScript + Tailwind v4** com design system `@sysgov/ui`:

```tsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sysgov/ui/card';
import { Button } from '@sysgov/ui/button';
import { Badge } from '@sysgov/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@sysgov/ui/alert';
import { Clock, AlertTriangle, CheckCircle2, User, BookOpen } from 'lucide-react';
import type { Timetable, TimetableSlot, DayOfWeek } from '@sysgov/sdk';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 2, label: 'Segunda-feira' },
  { key: 3, label: 'Terça-feira' },
  { key: 4, label: 'Quarta-feira' },
  { key: 5, label: 'Quinta-feira' },
  { key: 6, label: 'Sexta-feira' },
  { key: 7, label: 'Sábado' },
];

interface TimetableGridProps {
  timetable: Timetable;
  onSlotClick?: (slot: TimetableSlot | null, day: DayOfWeek, time: string) => void;
  conflicts?: Array<{ message: string; type: string }>;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  timetable,
  onSlotClick,
  conflicts = []
}) => {
  // Horários padrão dos períodos da escola
  const timeSlots = [
    { start: '07:30', end: '08:20', label: '1ª Aula' },
    { start: '08:20', end: '09:10', label: '2ª Aula' },
    { start: '09:10', end: '10:00', label: '3ª Aula' },
    { start: '10:15', end: '11:05', label: '4ª Aula' },
    { start: '11:05', end: '11:55', label: '5ª Aula' },
  ];

  const getSlot = (day: DayOfWeek, startTime: string) => {
    return timetable.slots.find(
      (s) => s.dayOfWeek === day && s.startTime.startsWith(startTime) && s.isActive
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner de Conflitos Detectados */}
      {conflicts.length > 0 && (
        <Alert variant="destructive" className="border-red-600 bg-red-50 text-red-900">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertTitle className="font-semibold text-red-800">
            Conflito de Choque de Horários Detectado!
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm font-mono">
              {conflicts.map((c, idx) => (
                <li key={idx}>{c.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Cabeçalho da Grade */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Quadro de Horários — {timetable.schoolClassName}
          </h2>
          <p className="text-sm text-slate-500 font-mono">
            Ano Letivo: {timetable.academicYear} | Versão {timetable.version}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={timetable.status === 'PUBLISHED' ? 'default' : 'secondary'}>
            {timetable.status === 'PUBLISHED' ? 'Publicado / Vigente' : 'Rascunho'}
          </Badge>
          <Button variant="outline" size="sm">
            Validar Choques
          </Button>
          <Button size="sm">
            Salvar e Publicar
          </Button>
        </div>
      </div>

      {/* Matriz Semanal de Horários */}
      <Card className="overflow-x-auto shadow-sm border border-slate-200">
        <CardContent className="p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <th className="p-3 font-semibold text-center w-28">Horário</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="p-3 font-semibold border-l border-slate-200 text-center">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {timeSlots.map((period, pIdx) => (
                <tr key={pIdx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-center bg-slate-50 font-mono text-xs text-slate-600 font-medium">
                    <div className="font-bold text-slate-800">{period.label}</div>
                    <div>{period.start} - {period.end}</div>
                  </td>
                  {DAYS.map((d) => {
                    const slot = getSlot(d.key, period.start);
                    return (
                      <td
                        key={d.key}
                        onClick={() => onSlotClick?.(slot || null, d.key, period.start)}
                        className="p-2 border-l border-slate-200 align-top cursor-pointer hover:bg-blue-50/40 transition-colors"
                      >
                        {slot ? (
                          <div className="rounded-lg p-2.5 bg-blue-50 border border-blue-200 shadow-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-xs">
                              <BookOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{slot.disciplineName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-mono">
                              <User className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{slot.teacherName}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-16 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
                            <span className="text-xs font-mono font-medium">+ Adicionar</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
```
