# Mapeamento Técnico de Migração: Diário de Classe, Frequência e Conteúdos Ministrados

> **Módulo:** `Diário de Classe / Frequência e Conteúdos Ministrados` (`DailyRecord` / `Frequencia` / `LancamentoAulas`)  
> **Sistema Origem:** `i-Educar (Legado PHP / PostgreSQL)`  
> **Sistema Destino:** `SYSGOV` / `SYS-Educa` (`Laravel 13 PHP 8.4` / `MySQL 8.0/8.4+` / `React 19`)  
> **Data de Elaboração:** `2026-10-12`  
> **Status:** `Pronto para Implementação (Fase SDD / Forward)`

---

## 1. Visão Geral e Contexto de Negócio

No i-Educar legado original, o controle de frequência de alunos concentrava-se em dados consolidados de faltas calculados por etapa avaliativa:
1. `modules.falta_aluno`: Registro mestre vinculado à matrícula (`matricula_id`) definindo se o regime é `tipo_falta` = 1 (`GERAL`) ou 2 (`POR_COMPONENTE`).
2. `modules.falta_geral`: Total numérico de faltas na etapa (bimestre/trimestre) para cursos com apuração diária global (Educação Infantil e Anos Iniciais do Ensino Fundamental).
3. `modules.falta_componente_curricular`: Total numérico de faltas na etapa por componente curricular específico (Anos Finais do Fundamental, Ensino Médio e EJA).
4. As funções de banco `modules.frequencia_da_matricula` e `modules.frequencia_por_componente` calculavam a porcentagem de frequência com base na carga horária ou dias letivos da série.

### Gaps e Oportunidades na Modernização para SYSGOV
- **Ausência de Diário de Classe Eletrônico Atômico:** O legado original não persistia o diário diário aula a aula com chamada individual, conteúdos ministrados, metodologia e habilidades da Base Nacional Comum Curricular (BNCC). As faltas eram lançadas somadas ao final da etapa.
- **Rastreabilidade de Conteúdos e BNCC:** A legislação educacional contemporânea exige comprovação pedagógica dos planos de aula, conteúdos lecionados e códigos de habilidades da BNCC trabalhados diariamente.
- **Gestão Integrada de Atestados e Faltas Justificadas:** O i-Educar legado não dispunha de fluxo estruturado para cadastro de atestados médicos ou justificativas legais com período de vigência (data início/fim) que abonassem ou justificassem automaticamente as faltas do aluno nas chamadas do período.
- **Detecção Precoce de Evasão Escolar (FICAI / LDB):** Conforme o art. 12, VIII da LDB (com redação dada pela Lei Federal nº 13.803/2019), a escola deve notificar o Conselho Tutelar quando o aluno atinge 30% (ou 25% no critério da rede) de faltas não justificadas. O SYSGOV introduz alertas automáticos em tempo real.

---

## 2. DDL no Padrão SYSGOV (MySQL 8.0/8.4+ InnoDB)

```sql
-- =============================================================================
-- TABELA: educa_class_lessons (Registro Diário de Aulas Ministradas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_class_lessons` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 da aula ministrada',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `school_class_id` CHAR(36) NOT NULL COMMENT 'FK educa_school_classes: Turma',
    `discipline_id` CHAR(36) DEFAULT NULL COMMENT 'FK educa_curriculum_disciplines: Disciplina (NULL se unidocência global)',
    `teacher_id` CHAR(36) NOT NULL COMMENT 'FK core_employees/users: Docente responsável pelo lançamento',
    `timetable_slot_id` CHAR(36) DEFAULT NULL COMMENT 'FK educa_timetable_slots: Slot de horário na grade (opcional)',
    `lesson_date` DATE NOT NULL COMMENT 'Data de realização da aula',
    `lesson_count` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Quantidade de horas-aula ministradas (1=Normal, 2=Geminada)',
    `order_number` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Ordem da aula no dia (1ª aula, 2ª aula, etc.)',
    `lesson_type` VARCHAR(30) NOT NULL DEFAULT 'REGULAR' COMMENT 'REGULAR, REPOSITION, EXTRA, RECOVERY',
    `summary_content` TEXT NOT NULL COMMENT 'Conteúdo programático e atividades desenvolvidas',
    `methodology` TEXT DEFAULT NULL COMMENT 'Metodologias e recursos didáticos utilizados',
    `bncc_skills` JSON DEFAULT NULL COMMENT 'Array JSON com códigos e descrições das habilidades BNCC',
    `observations` TEXT DEFAULT NULL COMMENT 'Ocorrências pedagógicas ou observações da aula',
    `status` VARCHAR(20) NOT NULL DEFAULT 'FINALIZED' COMMENT 'DRAFT, FINALIZED, CANCELLED',
    `is_locked` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Bloqueado para edição retroativa após encerramento da etapa',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_lesson_tenant` (`tenant_id`),
    INDEX `idx_lesson_class_date` (`school_class_id`, `lesson_date`),
    INDEX `idx_lesson_discipline` (`discipline_id`),
    INDEX `idx_lesson_teacher` (`teacher_id`),
    CONSTRAINT `fk_lesson_class` FOREIGN KEY (`school_class_id`) REFERENCES `educa_school_classes` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lesson_discipline` FOREIGN KEY (`discipline_id`) REFERENCES `educa_curriculum_disciplines` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de aulas ministradas e conteúdos do diário de classe';

-- =============================================================================
-- TABELA: educa_absence_justifications (Atestados e Justificativas de Faltas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_absence_justifications` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do atestado/justificativa',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `student_id` CHAR(36) NOT NULL COMMENT 'FK educa_students: Aluno',
    `enrollment_id` CHAR(36) NOT NULL COMMENT 'FK educa_enrollments: Matrícula ativa',
    `justification_type` VARCHAR(40) NOT NULL DEFAULT 'MEDICAL' COMMENT 'MEDICAL, LEGAL_SUMMONS, BEREAVEMENT, RELIGIOUS, OTHER',
    `start_date` DATE NOT NULL COMMENT 'Data inicial de vigência do afastamento',
    `end_date` DATE NOT NULL COMMENT 'Data final de vigência do afastamento',
    `doctor_name` VARCHAR(150) DEFAULT NULL COMMENT 'Nome do profissional de saúde / emissor',
    `council_registry` VARCHAR(50) DEFAULT NULL COMMENT 'CRM / Registro de classe profissional',
    `cid_code` VARCHAR(20) DEFAULT NULL COMMENT 'Código Internacional de Doenças (CID-10/CID-11)',
    `description` TEXT NOT NULL COMMENT 'Descrição ou motivo detalhado do afastamento',
    `is_excused` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Abona a falta no cômputo legal; 0 = Justifica sem abono',
    `document_attachment_id` CHAR(36) DEFAULT NULL COMMENT 'FK core_storage_files: Anexo comprobatório digitalizado',
    `registered_by_user_id` CHAR(36) NOT NULL COMMENT 'FK core_users: Servidor da secretaria que cadastrou',
    `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED' COMMENT 'PENDING, APPROVED, REJECTED, CANCELLED',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_abs_just_tenant` (`tenant_id`),
    INDEX `idx_abs_just_student` (`student_id`),
    INDEX `idx_abs_just_enrollment` (`enrollment_id`),
    INDEX `idx_abs_just_period` (`start_date`, `end_date`),
    CONSTRAINT `fk_abs_just_student` FOREIGN KEY (`student_id`) REFERENCES `educa_students` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_abs_just_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `educa_enrollments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cadastro e controle de atestados e justificativas legais de ausência';

-- =============================================================================
-- TABELA: educa_attendance_records (Chamada Atômica de Alunos por Aula)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_attendance_records` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do registro de frequência',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `lesson_id` CHAR(36) NOT NULL COMMENT 'FK educa_class_lessons: Aula associada',
    `enrollment_id` CHAR(36) NOT NULL COMMENT 'FK educa_enrollments: Matrícula do aluno',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PRESENT' COMMENT 'PRESENT, ABSENT, JUSTIFIED_ABSENT',
    `absence_count` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Quantidade de faltas geradas (ex: 1 em aula simples, 2 em geminada)',
    `justification_id` CHAR(36) DEFAULT NULL COMMENT 'FK educa_absence_justifications: Se JUSTIFIED_ABSENT',
    `remarks` VARCHAR(255) DEFAULT NULL COMMENT 'Observações eventuais (ex: atraso na entrada)',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_attendance_lesson_enrollment` (`lesson_id`, `enrollment_id`),
    INDEX `idx_attendance_tenant` (`tenant_id`),
    INDEX `idx_attendance_enrollment` (`enrollment_id`),
    INDEX `idx_attendance_status` (`status`),
    CONSTRAINT `fk_attendance_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `educa_class_lessons` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_attendance_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `educa_enrollments` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_attendance_justification` FOREIGN KEY (`justification_id`) REFERENCES `educa_absence_justifications` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registros individuais e atômicos de presença/falta na chamada';

-- =============================================================================
-- TABELA: educa_stage_absence_summaries (Consolidação de Faltas por Etapa Avaliativa)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_stage_absence_summaries` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 da consolidação da etapa',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `enrollment_id` CHAR(36) NOT NULL COMMENT 'FK educa_enrollments: Matrícula do aluno',
    `stage` SMALLINT UNSIGNED NOT NULL COMMENT 'Número sequencial da etapa (1º Bimestre=1, etc.)',
    `discipline_id` CHAR(36) DEFAULT NULL COMMENT 'FK educa_curriculum_disciplines: NULL se frequência geral',
    `presence_type` VARCHAR(20) NOT NULL DEFAULT 'BY_DISCIPLINE' COMMENT 'GENERAL, BY_DISCIPLINE',
    `total_lessons` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total de aulas ministradas computadas',
    `unexcused_absences` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total de faltas não justificadas',
    `justified_absences` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total de faltas com justificativa/atestado',
    `attendance_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 100.00 COMMENT 'Porcentagem de presença calculada na etapa (0.00 a 100.00)',
    `warning_level` VARCHAR(25) NOT NULL DEFAULT 'NORMAL' COMMENT 'NORMAL, ATTENTION (15-24%), CRITICAL_EVASION_RISK (>=25%)',
    `last_calculated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_stage_summary` (`enrollment_id`, `stage`, `discipline_id`),
    INDEX `idx_stage_summary_tenant` (`tenant_id`),
    INDEX `idx_stage_summary_enrollment` (`enrollment_id`),
    INDEX `idx_stage_summary_warning` (`warning_level`),
    CONSTRAINT `fk_stage_summary_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `educa_enrollments` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_stage_summary_discipline` FOREIGN KEY (`discipline_id`) REFERENCES `educa_curriculum_disciplines` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Totais consolidados de faltas e frequência para boletim escolar';
```

---

## 3. Matriz De/Para de Campos e Migração de Dados

| Entidade / Tabela Legada | Campo Legado | Tabela Alvo SYSGOV (MySQL) | Campo Alvo SYSGOV | Regra de Transformação / Tratamento |
|---|---|---|---|---|
| `modules.falta_aluno` | `id` | `educa_stage_absence_summaries` | `id` | Gerado novo UUID v4 para cada consolidação. |
| `modules.falta_aluno` | `matricula_id` | `educa_stage_absence_summaries` | `enrollment_id` | Mapeado via tabela de de/para de matrículas UUID. |
| `modules.falta_aluno` | `tipo_falta` | `educa_stage_absence_summaries` | `presence_type` | `1` $\rightarrow$ `'GENERAL'`, `2` $\rightarrow$ `'BY_DISCIPLINE'`. |
| `modules.falta_geral` | `etapa` | `educa_stage_absence_summaries` | `stage` | Converte `varchar` para `SMALLINT UNSIGNED`. |
| `modules.falta_geral` | `quantidade` | `educa_stage_absence_summaries` | `unexcused_absences` | Carga direta das faltas legadas. |
| `modules.falta_componente_curricular`| `etapa` | `educa_stage_absence_summaries` | `stage` | Converte para `SMALLINT UNSIGNED`. |
| `modules.falta_componente_curricular`| `componente_curricular_id` | `educa_stage_absence_summaries` | `discipline_id` | Mapeado para o UUID correspondente da disciplina. |
| `modules.falta_componente_curricular`| `quantidade` | `educa_stage_absence_summaries` | `unexcused_absences` | Carga direta da quantidade de faltas. |
| *(Novo no SYSGOV)* | - | `educa_class_lessons` | *Todos* | Estrutura atômica de diário eletrônico diário, com conteúdos, BNCC e horários. |
| *(Novo no SYSGOV)* | - | `educa_attendance_records` | *Todos* | Registros atômicos de presença/falta na chamada diária. |
| *(Novo no SYSGOV)* | - | `educa_absence_justifications` | *Todos* | Gestão de atestados médicos e afastamentos com vigência e abono. |

---

## 4. Implementação do Serviço Backend (Laravel 13 / PHP 8.4)

O serviço centralizador `AttendanceService` gerencia a chamada em lote, verificação de travas de período letivo, checagem de justificativas ativas e recálculo da porcentagem de frequência e alertas de evasão.

```php
<?php

declare(strict_types=1);

namespace App\Services\Educa;

use App\Models\Educa\ClassLesson;
use App\Models\Educa\AttendanceRecord;
use App\Models\Educa\AbsenceJustification;
use App\Models\Educa\StageAbsenceSummary;
use App\Models\Educa\Enrollment;
use App\Models\Educa\SchoolClass;
use App\Models\Educa\AcademicYearStage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class AttendanceService
{
    /**
     * Registra ou atualiza uma aula no Diário de Classe com chamada em lote de alunos.
     *
     * @param array{
     *     tenant_id: string,
     *     school_class_id: string,
     *     discipline_id: ?string,
     *     teacher_id: string,
     *     timetable_slot_id: ?string,
     *     lesson_date: string,
     *     lesson_count: int,
     *     order_number: int,
     *     lesson_type: string,
     *     summary_content: string,
     *     methodology: ?string,
     *     bncc_skills: ?array<string>,
     *     observations: ?string,
     *     attendances: array<array{enrollment_id: string, status: string, remarks: ?string}>
     * } $data
     */
    public function recordLessonWithAttendance(array $data): ClassLesson
    {
        return DB::transaction(function () use ($data) {
            $class = SchoolClass::where('id', $data['school_class_id'])
                ->where('tenant_id', $data['tenant_id'])
                ->firstOrFail();

            // 1. Validar se a data letiva está dentro de uma etapa travada
            $this->validateStageLock($class, $data['lesson_date']);

            // 2. Criar ou atualizar o cabeçalho da aula ministrada
            $lesson = ClassLesson::updateOrCreate(
                [
                    'tenant_id' => $data['tenant_id'],
                    'school_class_id' => $data['school_class_id'],
                    'lesson_date' => $data['lesson_date'],
                    'order_number' => $data['order_number'],
                    'discipline_id' => $data['discipline_id'] ?? null,
                ],
                [
                    'id' => Str::uuid()->toString(),
                    'teacher_id' => $data['teacher_id'],
                    'timetable_slot_id' => $data['timetable_slot_id'] ?? null,
                    'lesson_count' => $data['lesson_count'] ?? 1,
                    'lesson_type' => $data['lesson_type'] ?? 'REGULAR',
                    'summary_content' => $data['summary_content'],
                    'methodology' => $data['methodology'] ?? null,
                    'bncc_skills' => $data['bncc_skills'] ?? [],
                    'observations' => $data['observations'] ?? null,
                    'status' => 'FINALIZED',
                    'is_locked' => 0,
                ]
            );

            // 3. Processar lista de chamada dos alunos
            $lessonCount = $lesson->lesson_count;
            $lessonDate = $lesson->lesson_date;

            foreach ($data['attendances'] as $att) {
                $enrollmentId = $att['enrollment_id'];
                $status = $att['status']; // 'PRESENT', 'ABSENT'

                // Verificar se o aluno possui atestado/justificativa vigente na data
                $justification = AbsenceJustification::where('tenant_id', $data['tenant_id'])
                    ->where('enrollment_id', $enrollmentId)
                    ->where('status', 'APPROVED')
                    ->where('start_date', '<=', $lessonDate)
                    ->where('end_date', '>=', $lessonDate)
                    ->first();

                $justificationId = null;
                $absenceCount = 0;

                if ($justification) {
                    $status = 'JUSTIFIED_ABSENT';
                    $justificationId = $justification->id;
                    $absenceCount = $justification->is_excused ? 0 : $lessonCount;
                } elseif ($status === 'ABSENT') {
                    $absenceCount = $lessonCount;
                }

                AttendanceRecord::updateOrCreate(
                    [
                        'tenant_id' => $data['tenant_id'],
                        'lesson_id' => $lesson->id,
                        'enrollment_id' => $enrollmentId,
                    ],
                    [
                        'id' => Str::uuid()->toString(),
                        'status' => $status,
                        'absence_count' => $absenceCount,
                        'justification_id' => $justificationId,
                        'remarks' => $att['remarks'] ?? null,
                    ]
                );

                // 4. Sincronizar totais acumulados da etapa avaliativa
                $this->syncStageSummary(
                    tenantId: $data['tenant_id'],
                    enrollmentId: $enrollmentId,
                    lessonDate: $lessonDate,
                    disciplineId: $lesson->discipline_id
                );
            }

            return $lesson->load('attendances');
        });
    }

    /**
     * Valida se a data do diário não pertence a uma etapa com bloqueio/travamento de lançamentos.
     */
    private function validateStageLock(SchoolClass $class, string $lessonDate): void
    {
        $stage = AcademicYearStage::where('school_id', $class->school_id)
            ->where('academic_year_id', $class->academic_year_id)
            ->where('start_date', '<=', $lessonDate)
            ->where('end_date', '>=', $lessonDate)
            ->first();

        if ($stage && $stage->is_locked) {
            throw new RuntimeException("O lançamento para a data {$lessonDate} está bloqueado pela gestão escolar.");
        }
    }

    /**
     * Recalcula a consolidação de faltas e porcentagem de frequência para o boletim.
     */
    public function syncStageSummary(string $tenantId, string $enrollmentId, string $lessonDate, ?string $disciplineId): void
    {
        $enrollment = Enrollment::with(['schoolClass.grade.evaluationRule'])->findOrFail($enrollmentId);
        $evalRule = $enrollment->schoolClass->grade->evaluationRule;
        $isByDiscipline = ($evalRule->presence_type ?? 'BY_DISCIPLINE') === 'BY_DISCIPLINE';

        $stageNumber = $this->resolveStageNumber($enrollment->schoolClass->academic_year_id, $lessonDate);

        // Agregação de faltas no intervalo da etapa
        $query = AttendanceRecord::join('educa_class_lessons', 'educa_class_lessons.id', '=', 'educa_attendance_records.lesson_id')
            ->where('educa_attendance_records.tenant_id', $tenantId)
            ->where('educa_attendance_records.enrollment_id', $enrollmentId);

        if ($isByDiscipline && $disciplineId) {
            $query->where('educa_class_lessons.discipline_id', $disciplineId);
        }

        $records = $query->selectRaw('
            COUNT(educa_class_lessons.id) as total_lessons,
            SUM(CASE WHEN educa_attendance_records.status = "ABSENT" THEN educa_attendance_records.absence_count ELSE 0 END) as unexcused_absences,
            SUM(CASE WHEN educa_attendance_records.status = "JUSTIFIED_ABSENT" THEN educa_class_lessons.lesson_count ELSE 0 END) as justified_absences
        ')->first();

        $totalLessons = (int) ($records->total_lessons ?? 0);
        $unexcused = (int) ($records->unexcused_absences ?? 0);
        $justified = (int) ($records->justified_absences ?? 0);

        // Cálculo da frequência
        $percentage = 100.00;
        if ($totalLessons > 0) {
            $effectiveLessons = max(1, $totalLessons);
            $presentLessons = max(0, $effectiveLessons - $unexcused);
            $percentage = round(($presentLessons * 100.0) / $effectiveLessons, 2);
        }

        // Determinação de alertas de evasão conforme LDB
        $warningLevel = 'NORMAL';
        if ($percentage < 75.00) {
            $warningLevel = 'CRITICAL_EVASION_RISK';
        } elseif ($percentage < 85.00) {
            $warningLevel = 'ATTENTION';
        }

        StageAbsenceSummary::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'enrollment_id' => $enrollmentId,
                'stage' => $stageNumber,
                'discipline_id' => $isByDiscipline ? $disciplineId : null,
            ],
            [
                'presence_type' => $isByDiscipline ? 'BY_DISCIPLINE' : 'GENERAL',
                'total_lessons' => $totalLessons,
                'unexcused_absences' => $unexcused,
                'justified_absences' => $justified,
                'attendance_percentage' => $percentage,
                'warning_level' => $warningLevel,
                'last_calculated_at' => now(),
            ]
        );
    }

    private function resolveStageNumber(string $academicYearId, string $date): int
    {
        $stage = AcademicYearStage::where('academic_year_id', $academicYearId)
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->first();

        return $stage ? (int) $stage->sequential : 1;
    }
}
```

---

## 5. Endpoints RESTful e Validações

### 5.1 Registro de Aula e Chamada
- **`POST /api/v1/classes/{classId}/lessons`**
  - **Payload:**
    ```json
    {
      "discipline_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "teacher_id": "8f2a1b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "timetable_slot_id": "7a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
      "lesson_date": "2026-10-12",
      "lesson_count": 2,
      "order_number": 1,
      "lesson_type": "REGULAR",
      "summary_content": "Introdução às Funções Afins e Estudo do Coeficiente Angular",
      "methodology": "Exposição dialogada com resolução de situações-problema no quadro",
      "bncc_skills": ["EM13MAT302", "EM13MAT401"],
      "attendances": [
        { "enrollment_id": "11111111-2222-3333-4444-555555555555", "status": "PRESENT" },
        { "enrollment_id": "22222222-3333-4444-5555-666666666666", "status": "ABSENT", "remarks": "Chegou 30 minutos após o término" }
      ]
    }
    ```
  - **Resposta (201 Created):** Retorna o objeto `ClassLesson` com `attendances` persistidos e calculados.

### 5.2 Cadastro de Atestado / Justificativa de Faltas
- **`POST /api/v1/enrollments/{enrollmentId}/justifications`**
  - **Payload:**
    ```json
    {
      "justification_type": "MEDICAL",
      "start_date": "2026-10-10",
      "end_date": "2026-10-14",
      "doctor_name": "Dra. Mariana Vasconcelos",
      "council_registry": "CRM/SC 14920",
      "cid_code": "J11",
      "description": "Quadro gripal agudo e necessidade de repouso",
      "is_excused": true,
      "document_attachment_id": "33333333-4444-5555-6666-777777777777"
    }
    ```
  - **Ação:** Salva em `educa_absence_justifications`, atualiza chamadas do período para `JUSTIFIED_ABSENT` e recalcula resumos das etapas afetadas.

---

## 6. Contratos de Tipos TypeScript (`@sysgov/sdk`)

```typescript
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'JUSTIFIED_ABSENT';

export type JustificationType = 'MEDICAL' | 'LEGAL_SUMMONS' | 'BEREAVEMENT' | 'RELIGIOUS' | 'OTHER';

export type LessonType = 'REGULAR' | 'REPOSITION' | 'EXTRA' | 'RECOVERY';

export type AttendanceWarningLevel = 'NORMAL' | 'ATTENTION' | 'CRITICAL_EVASION_RISK';

export interface ClassLesson {
  id: string;
  tenant_id: string;
  school_class_id: string;
  discipline_id: string | null;
  teacher_id: string;
  timetable_slot_id: string | null;
  lesson_date: string; // ISO YYYY-MM-DD
  lesson_count: number;
  order_number: number;
  lesson_type: LessonType;
  summary_content: string;
  methodology: string | null;
  bncc_skills: string[];
  observations: string | null;
  status: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
  is_locked: boolean;
  attendances?: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  lesson_id: string;
  enrollment_id: string;
  student_name?: string;
  roll_call_number?: number;
  status: AttendanceStatus;
  absence_count: number;
  justification_id: string | null;
  remarks: string | null;
}

export interface AbsenceJustification {
  id: string;
  tenant_id: string;
  student_id: string;
  enrollment_id: string;
  justification_type: JustificationType;
  start_date: string;
  end_date: string;
  doctor_name: string | null;
  council_registry: string | null;
  cid_code: string | null;
  description: string;
  is_excused: boolean;
  document_attachment_id: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}

export interface StageAbsenceSummary {
  id: string;
  tenant_id: string;
  enrollment_id: string;
  stage: number;
  discipline_id: string | null;
  presence_type: 'GENERAL' | 'BY_DISCIPLINE';
  total_lessons: number;
  unexcused_absences: number;
  justified_absences: number;
  attendance_percentage: number;
  warning_level: AttendanceWarningLevel;
}
```

---

## 7. Componente Frontend (`React 19 + Tailwind v4 + @sysgov/ui`)

Componente de chamada eletrônica interativa com marcação em 1-clique, visualização de atestados médicos vigentes e alerta em tempo real de alunos em risco de evasão escolar.

```tsx
import React, { useState } from 'react';
import { AttendanceRecord, ClassLesson, AttendanceStatus } from '@sysgov/sdk';

interface DailyRollCallProps {
  lesson: ClassLesson;
  students: Array<{
    enrollment_id: string;
    student_name: string;
    roll_number: number;
    has_active_justification?: boolean;
    current_attendance_rate: number;
  }>;
  onSave: (records: Array<{ enrollment_id: string; status: AttendanceStatus; remarks?: string }>) => Promise<void>;
}

export const DailyRollCall: React.FC<DailyRollCallProps> = ({ lesson, students, onSave }) => {
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      initial[s.enrollment_id] = s.has_active_justification ? 'JUSTIFIED_ABSENT' : 'PRESENT';
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);

  const toggleStatus = (enrollmentId: string) => {
    setAttendanceMap((prev) => {
      const current = prev[enrollmentId];
      let next: AttendanceStatus = 'PRESENT';
      if (current === 'PRESENT') next = 'ABSENT';
      else if (current === 'ABSENT') next = 'JUSTIFIED_ABSENT';
      else next = 'PRESENT';
      return { ...prev, [enrollmentId]: next };
    });
  };

  const handleQuickMarkAllPresent = () => {
    const updated = { ...attendanceMap };
    students.forEach((s) => {
      if (!s.has_active_justification) {
        updated[s.enrollment_id] = 'PRESENT';
      }
    });
    setAttendanceMap(updated);
  };

  const handleCommit = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(attendanceMap).map(([enrollment_id, status]) => ({
        enrollment_id,
        status,
      }));
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans">
            Diário de Classe & Chamada Rápida
          </h2>
          <p className="text-sm text-slate-500 font-mono">
            Data: {lesson.lesson_date} | {lesson.lesson_count} Aula(s) | Ordem: {lesson.order_number}ª
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleQuickMarkAllPresent}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            ✓ Todos Presentes
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleCommit}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? 'Gravando...' : 'Salvar Chamada'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center font-mono">Nº</th>
              <th className="py-2.5 px-4 font-sans">Estudante</th>
              <th className="py-2.5 px-3 text-center font-sans">Frequência Acumulada</th>
              <th className="py-2.5 px-4 text-center font-sans">Status na Aula</th>
              <th className="py-2.5 px-4 font-sans">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((student) => {
              const status = attendanceMap[student.enrollment_id];
              const isAtRisk = student.current_attendance_rate < 75.0;

              return (
                <tr key={student.enrollment_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                    {student.roll_number}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{student.student_name}</span>
                      {isAtRisk && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 rounded">
                          🚨 Risco Evasão
                        </span>
                      )}
                      {student.has_active_justification && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded">
                          📋 Atestado Vigente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    <span className={student.current_attendance_rate < 75 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {student.current_attendance_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => toggleStatus(student.enrollment_id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                        status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                          : status === 'ABSENT'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
                          : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {status === 'PRESENT' ? 'Presente' : status === 'ABSENT' ? 'Falta' : 'Justificada'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => toggleStatus(student.enrollment_id)}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Alternar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

## 8. Regras de Negócio e Casos de Borda

1. **Abono de Falta vs. Falta Justificada (LDB Art. 24, VI):**
   - Apenas justificativas com `is_excused = 1` (ex: amparos legais com previsão de abono) não geram acréscimo no cômputo de faltas.
   - Atestados médicos padrão justificam a ausência do aluno (evitando encaminhamento imediato ao Conselho Tutelar), mas mantêm a apuração para fins do cumprimento mínimo de 75% da carga horária, conforme normas do Conselho Municipal de Educação (CME) ou Conselho Estadual (CEE).
2. **Aulas Geminadas:**
   - Se a aula for cadastrada com `lesson_count = 2`, uma ausência do aluno acarreta 2 faltas no cômputo por componente.
3. **Travamento Retroativo:**
   - O professor não pode editar nem criar aulas em datas pertencentes a etapas já homologadas ou encerradas pela direção escolar.
4. **Migração do Legado com Dados Faltantes:**
   - Nos municípios onde não existiam dados atômicos de chamadas diárias no legado original, a carga de migração gera as consolidações diretamente em `educa_stage_absence_summaries` a partir de `modules.falta_geral` e `modules.falta_componente_curricular`.
