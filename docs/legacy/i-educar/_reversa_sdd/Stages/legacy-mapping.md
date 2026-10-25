# Mapeamento Técnico de Migração: Etapas de Ensino, Ciclos e Séries Escolares

> **Módulo:** `Stages (Etapas de Ensino, Ciclos e Séries Escolares)` (`AcademicStructure` / `NivelEnsino` / `Curso` / `Serie` / `SequenciaSerie`)  
> **Sistema Origem:** `i-Educar (Legado PHP / PostgreSQL)`  
> **Sistema Destino:** `SYSGOV` / `SYS-Educa` (`Laravel 13 PHP 8.4` / `MySQL 8.0/8.4+` / `React 19`)  
> **Data de Elaboração:** `2026-10-12`  
> **Status:** `Pronto para Implementação (Fase SDD / Forward)`

---

## 1. Visão Geral e Contexto de Negócio

No i-Educar legado original, a organização acadêmica de etapas e seriação estruturava-se em:
1. `pmieducar.nivel_ensino`: Nível macro de ensino (ex.: Educação Infantil, Ensino Fundamental, Ensino Médio).
2. `pmieducar.curso`: Entidade central que agregava o tipo de regime de ensino (seriado, modular, ciclos), padrão de ano letivo/etapas, carga horária mínima total, modalidade do Censo e regras gerais.
3. `pmieducar.serie`: Anos escolares ou etapas internas do curso (ex.: 1º Ano, 2º Ano, etc.), contendo carga horária anual própria, dias letivos mínimos, idades mínimas e de corte para matrícula, etapa do Educacenso e vinculação com regra de avaliação.
4. `pmieducar.sequencia_serie`: Regras de progressão simples (série origem -> série destino), determinando para qual série o aluno aprovado pode avançar.
5. `pmieducar.escola_curso` e `pmieducar.escola_serie`: Matriz de autorização da oferta de cursos e séries por unidade escolar municipal.

### Gaps e Oportunidades na Modernização para SYSGOV
- **Inflexibilidade nos Ciclos e Blocos de Alfabetização:** No Brasil, a Resolução CNE/CEB nº 7/2010 e o Pacto Nacional pela Alfabetização fixam o bloco pedagógico dos anos iniciais (1º e 2º anos, ou 1º ao 3º anos) sem retenção punitiva por nota, aplicando-se **progressão continuada**. O i-Educar legado tratava isso como exceção no código PHP ou forçava fórmulas de avaliação artificiais. O SYSGOV modela o conceito nativo de **Ciclos de Aprendizagem** e **Tipos de Transição de Progressão** (`educa_grade_sequences`).
- **Mapeamento Normativo com o Educacenso/INEP:** As etapas do Censo Escolar mudam periodicamente e exigem consistência formal entre a modalidade de ensino, a etapa de matrícula e a idade do estudante. O SYSGOV isola os códigos de etapa do MEC/INEP em campos padronizados validados por JSON Schema.
- **Multi-tenancy Estrito e Isolamento Municipal:** No SYSGOV, cada rede de ensino municipal administra sua matriz de cursos e seriação sob o seu `tenant_id`, com suporte a modelos de referência compartilhados (templates estaduais/nacionais) e customizações locais.
- **Rastreabilidade de Autorizações Regulatórias:** Cursos e séries em redes públicas requerem atos regulatórios de autorização e reconhecimento pelo Conselho Municipal de Educação (CME). O SYSGOV adiciona número e data do ato autorizativo na oferta escolar.

---

## 2. DDL no Padrão SYSGOV (MySQL 8.0/8.4+ InnoDB)

```sql
-- =============================================================================
-- TABELA 78: educa_education_levels (Níveis e Modalidades Nacionais de Ensino)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_education_levels` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do nível de ensino',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `code` VARCHAR(30) NOT NULL COMMENT 'Código canônico: EARLY_CHILDHOOD, PRIMARY_ELEMENTARY, FINAL_ELEMENTARY, HIGH_SCHOOL, EJA_ELEMENTARY, EJA_HIGH, SPECIAL_EDUCATION, VOCATIONAL',
    `name` VARCHAR(150) NOT NULL COMMENT 'Nome de exibição (ex: Ensino Fundamental - Anos Iniciais)',
    `inep_level_code` VARCHAR(10) DEFAULT NULL COMMENT 'Código do nível correspondente no Censo Escolar/INEP',
    `stage_modality` VARCHAR(40) NOT NULL DEFAULT 'REGULAR' COMMENT 'REGULAR, SPECIAL, EJA, INDIGENOUS, QUILOMBOLA, VOCATIONAL',
    `description` TEXT DEFAULT NULL COMMENT 'Descrição pedagógica e diretrizes curriculares do nível',
    `display_order` SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Ordem de apresentação na listagem',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Ativo, 0 = Inativo',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_level_tenant_code` (`tenant_id`, `code`),
    INDEX `idx_level_tenant` (`tenant_id`),
    INDEX `idx_level_inep` (`inep_level_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 78: Níveis e modalidades de ensino';

-- =============================================================================
-- TABELA 79: educa_courses (Cursos Ofertados pela Rede Municipal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_courses` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do curso',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `education_level_id` CHAR(36) NOT NULL COMMENT 'FK educa_education_levels: Nível de ensino vinculado',
    `evaluation_rule_id` CHAR(36) DEFAULT NULL COMMENT 'FK educa_evaluation_rules: Regra de avaliação padrão do curso',
    `code` VARCHAR(50) NOT NULL COMMENT 'Código interno do curso no município',
    `name` VARCHAR(200) NOT NULL COMMENT 'Nome completo do curso (ex: Ensino Fundamental de 9 Anos)',
    `short_name` VARCHAR(50) DEFAULT NULL COMMENT 'Sigla ou nome abreviado (ex: EF-9A)',
    `regime_type` VARCHAR(30) NOT NULL DEFAULT 'ANNUAL' COMMENT 'ANNUAL, SEMESTER, MODULAR, CYCLIC',
    `inep_course_code` VARCHAR(20) DEFAULT NULL COMMENT 'Código de homologação do curso no Educacenso/INEP',
    `minimum_workload_hours` SMALLINT UNSIGNED NOT NULL DEFAULT 800 COMMENT 'Carga horária total mínima do curso (horas)',
    `minimum_school_days` SMALLINT UNSIGNED NOT NULL DEFAULT 200 COMMENT 'Dias letivos anuais mínimos obrigatórios (LDB)',
    `total_stages` TINYINT UNSIGNED NOT NULL DEFAULT 9 COMMENT 'Quantidade de etapas/séries que compõem o curso completo',
    `stage_division_type` VARCHAR(30) NOT NULL DEFAULT 'BIMESTER' COMMENT 'BIMESTER (4), TRIMESTER (3), SEMESTER (2), ANNUAL (1)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Ativo, 0 = Inativo',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_course_tenant_code` (`tenant_id`, `code`),
    INDEX `idx_course_tenant` (`tenant_id`),
    INDEX `idx_course_level` (`education_level_id`),
    INDEX `idx_course_rule` (`evaluation_rule_id`),
    CONSTRAINT `fk_course_level` FOREIGN KEY (`education_level_id`) REFERENCES `educa_education_levels` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_course_eval_rule` FOREIGN KEY (`evaluation_rule_id`) REFERENCES `educa_evaluation_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 79: Cursos ofertados pela rede municipal';

-- =============================================================================
-- TABELA 80: educa_grades (Séries, Anos Escolares ou Ciclos de Aprendizagem)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_grades` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 da série/etapa escolar',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `course_id` CHAR(36) NOT NULL COMMENT 'FK educa_courses: Curso ao qual a série pertence',
    `evaluation_rule_id` CHAR(36) DEFAULT NULL COMMENT 'FK educa_evaluation_rules: Regra específica da série (sobrescreve a do curso)',
    `name` VARCHAR(150) NOT NULL COMMENT 'Nome oficial da série (ex: 1º Ano, Berçário II, 8º Ano)',
    `order_index` TINYINT UNSIGNED NOT NULL COMMENT 'Ordem de progressão sequencial no curso (1, 2, 3...)',
    `stage_code_inep` VARCHAR(10) NOT NULL COMMENT 'Código oficial da etapa no Censo Escolar/INEP (ex: 14, 15, 41)',
    `workload_hours` SMALLINT UNSIGNED NOT NULL DEFAULT 800 COMMENT 'Carga horária letiva anual da série em horas',
    `school_days` SMALLINT UNSIGNED NOT NULL DEFAULT 200 COMMENT 'Quantidade mínima de dias letivos da série',
    `target_age` TINYINT UNSIGNED DEFAULT NULL COMMENT 'Idade ideal esperada do aluno na série (ex: 6 para 1º Ano)',
    `min_age` TINYINT UNSIGNED DEFAULT NULL COMMENT 'Idade mínima regulamentar para ingresso',
    `max_age` TINYINT UNSIGNED DEFAULT NULL COMMENT 'Idade máxima recomendada antes de distorção idade-série',
    `cutoff_day` TINYINT UNSIGNED DEFAULT 31 COMMENT 'Dia limite da data de corte etário (padrão 31)',
    `cutoff_month` TINYINT UNSIGNED DEFAULT 3 COMMENT 'Mês limite da data de corte etário (padrão 3 - Março)',
    `is_graduating_stage` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Etapa concluinte do curso/nível (ex: 9º Ano, 3º Ano Médio)',
    `cycle_name` VARCHAR(100) DEFAULT NULL COMMENT 'Nome do ciclo pedagógico (ex: Bloco de Alfabetização, Ciclo II)',
    `is_continuous_progression` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Progressão continuada de ciclo (sem retenção por nota)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Ativo, 0 = Inativo',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_grade_course_order` (`course_id`, `order_index`),
    INDEX `idx_grade_tenant` (`tenant_id`),
    INDEX `idx_grade_course` (`course_id`),
    INDEX `idx_grade_inep` (`stage_code_inep`),
    CONSTRAINT `fk_grade_course` FOREIGN KEY (`course_id`) REFERENCES `educa_courses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_grade_eval_rule` FOREIGN KEY (`evaluation_rule_id`) REFERENCES `educa_evaluation_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 80: Séries, etapas escolares e ciclos de aprendizagem';

-- =============================================================================
-- TABELA 81: educa_grade_sequences (Matriz de Transição e Progressão de Séries)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_grade_sequences` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do vínculo de transição',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `origin_grade_id` CHAR(36) NOT NULL COMMENT 'FK educa_grades: Série de origem do estudante',
    `destination_grade_id` CHAR(36) NOT NULL COMMENT 'FK educa_grades: Série de destino após conclusão/transição',
    `transition_type` VARCHAR(40) NOT NULL DEFAULT 'REGULAR_PROMOTION' COMMENT 'REGULAR_PROMOTION, CYCLE_CONTINUATION, PARTIAL_DEPENDENCY, ACCELERATION_JUMP, INTER_COURSE_TRANSITION',
    `description` VARCHAR(255) DEFAULT NULL COMMENT 'Descrição da regra normativa (ex: Avanço regular para 2º ano ou Transição para EJA)',
    `requires_board_approval` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Exige parecer deliberativo do Conselho de Classe',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Regra ativa na matriz',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_sequence_transition` (`origin_grade_id`, `destination_grade_id`, `transition_type`),
    INDEX `idx_seq_tenant` (`tenant_id`),
    INDEX `idx_seq_origin` (`origin_grade_id`),
    INDEX `idx_seq_dest` (`destination_grade_id`),
    CONSTRAINT `fk_seq_origin` FOREIGN KEY (`origin_grade_id`) REFERENCES `educa_grades` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_seq_dest` FOREIGN KEY (`destination_grade_id`) REFERENCES `educa_grades` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 81: Matriz de transição e progressão de etapas e séries';

-- =============================================================================
-- TABELA 82: educa_course_school_offers (Oferta Autorizada de Cursos por Escola)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_course_school_offers` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 da oferta autorizada',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `school_id` CHAR(36) NOT NULL COMMENT 'FK educa_schools: Unidade escolar autorizada',
    `course_id` CHAR(36) NOT NULL COMMENT 'FK educa_courses: Curso ofertado',
    `authorization_act_number` VARCHAR(100) DEFAULT NULL COMMENT 'Número do ato de autorização do CME ou CEE (Portaria/Resolução)',
    `authorization_date` DATE DEFAULT NULL COMMENT 'Data de publicação do ato autorizativo',
    `start_year` SMALLINT UNSIGNED NOT NULL COMMENT 'Ano letivo inicial de oferta na escola',
    `end_year` SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Ano letivo final (se a oferta foi desativada/extinta)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Oferta vigente, 0 = Inativa',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_offer_school_course` (`school_id`, `course_id`),
    INDEX `idx_offer_tenant` (`tenant_id`),
    INDEX `idx_offer_school` (`school_id`),
    INDEX `idx_offer_course` (`course_id`),
    CONSTRAINT `fk_offer_school` FOREIGN KEY (`school_id`) REFERENCES `educa_schools` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_offer_course` FOREIGN KEY (`course_id`) REFERENCES `educa_courses` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 82: Habilitação e oferta autorizada de cursos por unidade escolar';
```

---

## 3. Matriz De/Para com o Legado do i-Educar

| Tabela Legada (i-Educar / Postgres) | Campo Legado | Tabela SYSGOV (MySQL 8.0/8.4+) | Coluna SYSGOV | Regra de Transformação / Sanatização |
| :--- | :--- | :--- | :--- | :--- |
| `pmieducar.nivel_ensino` | `cod_nivel_ensino` | `educa_education_levels` | `id` | Conversão de chave sequencial inteira para UUID v4. |
| `pmieducar.nivel_ensino` | `nm_nivel` | `educa_education_levels` | `name` | Normalização de nomenclatura e atribuição de `code` canônico. |
| `pmieducar.curso` | `cod_curso` | `educa_courses` | `id` | Conversão para UUID v4. |
| `pmieducar.curso` | `nm_curso` | `educa_courses` | `name` | Nome completo do curso. |
| `pmieducar.curso` | `sgl_curso` | `educa_courses` | `short_name` | Sigla ou abreviação do curso. |
| `pmieducar.curso` | `ref_cod_nivel_ensino` | `educa_courses` | `education_level_id` | Mapeamento da FK referenciada em `educa_education_levels`. |
| `pmieducar.curso` | `padrao_ano_escolar` | `educa_courses` | `stage_division_type` | `1` => `BIMESTER`, `2` => `TRIMESTER`, `3` => `SEMESTER`. |
| `pmieducar.curso` | `carga_horaria` | `educa_courses` | `minimum_workload_hours` | Carga horária total mínima regulamentar. |
| `pmieducar.curso` | `dias_letivos` | `educa_courses` | `minimum_school_days` | Dias letivos mínimos obrigatórios (padrão LDB: 200). |
| `pmieducar.serie` | `cod_serie` | `educa_grades` | `id` | Conversão para UUID v4. |
| `pmieducar.serie` | `ref_cod_curso` | `educa_grades` | `course_id` | FK vinculada a `educa_courses`. |
| `pmieducar.serie` | `nm_serie` | `educa_grades` | `name` | Nome oficial do ano escolar / série. |
| `pmieducar.serie` | `etapa_curso` | `educa_grades` | `order_index` | Posição sequencial numérica da etapa no curso. |
| `pmieducar.serie` | `carga_horaria` | `educa_grades` | `workload_hours` | Carga horária anual da série. |
| `pmieducar.serie` | `dias_letivos` | `educa_grades` | `school_days` | Dias letivos específicos da série. |
| `pmieducar.serie` | `idade_inicial` | `educa_grades` | `min_age` | Idade mínima de matrícula no corte etário. |
| `pmieducar.serie` | `idade_ideal` | `educa_grades` | `target_age` | Idade esperada para o ano escolar. |
| `pmieducar.serie` | `concluinte` | `educa_grades` | `is_graduating_stage` | Booleano `1` se etapa final de curso ou nível. |
| `pmieducar.serie` | `etapa_ensino_censo` | `educa_grades` | `stage_code_inep` | Código numérico oficial da etapa do Censo Escolar/INEP. |
| `pmieducar.sequencia_serie` | `ref_serie_origem` | `educa_grade_sequences`| `origin_grade_id` | Série de onde o aluno conclui/avança. |
| `pmieducar.sequencia_serie` | `ref_serie_destino` | `educa_grade_sequences`| `destination_grade_id`| Próxima série na linha de transição. |
| `pmieducar.escola_curso` | `ref_cod_escola` | `educa_course_school_offers` | `school_id` | FK vinculada a `educa_schools`. |
| `pmieducar.escola_curso` | `ref_cod_curso` | `educa_course_school_offers` | `course_id` | FK vinculada a `educa_courses`. |
| `pmieducar.escola_curso` | `autorizacao` | `educa_course_school_offers` | `authorization_act_number` | Número e ano do ato normativo de autorização. |

---

## 4. Camada de Aplicação Laravel 13 (PHP 8.4)

### 4.1. `AcademicStructureService.php`

```php
<?php

declare(strict_types=1);

namespace App\Services\Educa;

use App\Models\Educa\EducationLevel;
use App\Models\Educa\Course;
use App\Models\Educa\Grade;
use App\Models\Educa\CourseSchoolOffer;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Ramsey\Uuid\Uuid;

final class AcademicStructureService
{
    /**
     * Cria ou atualiza um Curso com validação de conformidade LDB/MEC.
     */
    public function upsertCourse(string $tenantId, array $data, ?string $courseId = null): Course
    {
        return DB::transaction(function () use ($tenantId, $data, $courseId): Course {
            $minimumDays = (int) ($data['minimum_school_days'] ?? 200);
            if ($minimumDays < 200 && ($data['regime_type'] ?? 'ANNUAL') === 'ANNUAL') {
                throw ValidationException::withMessages([
                    'minimum_school_days' => 'A Lei de Diretrizes e Bases (LDB art. 24) estabelece o mínimo de 200 dias de efetivo trabalho escolar para cursos anuais.'
                ]);
            }

            $minimumHours = (int) ($data['minimum_workload_hours'] ?? 800);
            if ($minimumHours < 800) {
                throw ValidationException::withMessages([
                    'minimum_workload_hours' => 'A carga horária mínima anual obrigatória é de 800 horas.'
                ]);
            }

            $id = $courseId ?? Uuid::uuid4()->toString();

            return Course::updateOrCreate(
                ['id' => $id, 'tenant_id' => $tenantId],
                [
                    'education_level_id'     => $data['education_level_id'],
                    'evaluation_rule_id'     => $data['evaluation_rule_id'] ?? null,
                    'code'                   => $data['code'],
                    'name'                   => $data['name'],
                    'short_name'             => $data['short_name'] ?? null,
                    'regime_type'            => $data['regime_type'] ?? 'ANNUAL',
                    'inep_course_code'       => $data['inep_course_code'] ?? null,
                    'minimum_workload_hours' => $minimumHours,
                    'minimum_school_days'    => $minimumDays,
                    'total_stages'           => (int) ($data['total_stages'] ?? 1),
                    'stage_division_type'    => $data['stage_division_type'] ?? 'BIMESTER',
                    'is_active'              => (bool) ($data['is_active'] ?? true),
                ]
            );
        });
    }

    /**
     * Retorna a árvore hierárquica completa de organização pedagógica do município.
     */
    public function getAcademicStructureTree(string $tenantId): Collection
    {
        return EducationLevel::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with([
                'courses' => function ($query) {
                    $query->where('is_active', true)
                          ->with(['grades' => function ($g) {
                              $g->where('is_active', true)->orderBy('order_index');
                          }]);
                }
            ])
            ->orderBy('display_order')
            ->get();
    }

    /**
     * Registra ou renova a autorização de oferta do curso em uma unidade escolar.
     */
    public function authorizeSchoolOffer(
        string $tenantId,
        string $schoolId,
        string $courseId,
        string $actNumber,
        string $actDate,
        int $startYear
    ): CourseSchoolOffer {
        return CourseSchoolOffer::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'school_id' => $schoolId,
                'course_id' => $courseId,
            ],
            [
                'id'                       => Uuid::uuid4()->toString(),
                'authorization_act_number' => $actNumber,
                'authorization_date'       => $actDate,
                'start_year'               => $startYear,
                'is_active'                => true,
            ]
        );
    }
}
```

---

### 4.2. `GradeProgressionMatrixService.php`

```php
<?php

declare(strict_types=1);

namespace App\Services\Educa;

use App\Models\Educa\Grade;
use App\Models\Educa\GradeSequence;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Ramsey\Uuid\Uuid;

final class GradeProgressionMatrixService
{
    /**
     * Resolve para qual série o estudante tem direito a se matricular após a apuração final.
     * 
     * @param string $tenantId
     * @param string $currentGradeId
     * @param string $finalSituation 'APPROVED', 'CONTINUOUS_CYCLE', 'FAILED', 'ACCELERATED'
     * @return Grade
     */
    public function resolveNextGrade(string $tenantId, string $currentGradeId, string $finalSituation): Grade
    {
        $currentGrade = Grade::where('id', $currentGradeId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Se o aluno foi retido (FAILED) e não é ciclo continuado, permanece na mesma série
        if ($finalSituation === 'FAILED' && !$currentGrade->is_continuous_progression) {
            return $currentGrade;
        }

        // Tipo de transição esperada
        $transitionType = match ($finalSituation) {
            'APPROVED'         => 'REGULAR_PROMOTION',
            'CONTINUOUS_CYCLE' => 'CYCLE_CONTINUATION',
            'ACCELERATED'      => 'ACCELERATION_JUMP',
            default            => 'REGULAR_PROMOTION'
        };

        $sequence = GradeSequence::where('tenant_id', $tenantId)
            ->where('origin_grade_id', $currentGradeId)
            ->where('transition_type', $transitionType)
            ->where('is_active', true)
            ->first();

        if ($sequence && $sequence->destinationGrade) {
            return $sequence->destinationGrade;
        }

        // Fallback: se não houver regra de transição configurada e for promoção regular, busca próxima ordem no mesmo curso
        if ($transitionType === 'REGULAR_PROMOTION' || $transitionType === 'CYCLE_CONTINUATION') {
            $nextGrade = Grade::where('course_id', $currentGrade->course_id)
                ->where('tenant_id', $tenantId)
                ->where('order_index', $currentGrade->order_index + 1)
                ->where('is_active', true)
                ->first();

            if ($nextGrade) {
                return $nextGrade;
            }
        }

        // Se é etapa concluinte, retorna a própria grade marcada com concluinte
        if ($currentGrade->is_graduating_stage) {
            return $currentGrade;
        }

        throw ValidationException::withMessages([
            'grade_progression' => "Não foi encontrada uma regra de progressão configurada para a série {$currentGrade->name} ({$finalSituation})."
        ]);
    }

    /**
     * Salva ou atualiza a matriz de transições entre séries.
     */
    public function syncProgressionRules(string $tenantId, string $originGradeId, array $destinations): void
    {
        DB::transaction(function () use ($tenantId, $originGradeId, $destinations): void {
            // Remove sequências antigas da série de origem
            GradeSequence::where('tenant_id', $tenantId)
                ->where('origin_grade_id', $originGradeId)
                ->delete();

            foreach ($destinations as $dest) {
                GradeSequence::create([
                    'id'                      => Uuid::uuid4()->toString(),
                    'tenant_id'               => $tenantId,
                    'origin_grade_id'         => $originGradeId,
                    'destination_grade_id'    => $dest['destination_grade_id'],
                    'transition_type'         => $dest['transition_type'] ?? 'REGULAR_PROMOTION',
                    'description'             => $dest['description'] ?? null,
                    'requires_board_approval' => (bool) ($dest['requires_board_approval'] ?? false),
                    'is_active'               => true,
                ]);
            }
        });
    }
}
```

---

## 5. DTOs TypeScript (`@sysgov/sdk`)

```typescript
// =============================================================================
// DTOs: Etapas de Ensino, Cursos, Séries e Matriz de Progressão
// =============================================================================

export type EducationLevelCode =
  | 'EARLY_CHILDHOOD'
  | 'PRIMARY_ELEMENTARY'
  | 'FINAL_ELEMENTARY'
  | 'HIGH_SCHOOL'
  | 'EJA_ELEMENTARY'
  | 'EJA_HIGH'
  | 'SPECIAL_EDUCATION'
  | 'VOCATIONAL';

export type StageDivisionType = 'BIMESTER' | 'TRIMESTER' | 'SEMESTER' | 'ANNUAL';

export type TransitionType =
  | 'REGULAR_PROMOTION'
  | 'CYCLE_CONTINUATION'
  | 'PARTIAL_DEPENDENCY'
  | 'ACCELERATION_JUMP'
  | 'INTER_COURSE_TRANSITION';

export interface EducationLevelDTO {
  id: string;
  tenant_id: string;
  code: EducationLevelCode;
  name: string;
  inep_level_code: string | null;
  stage_modality: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  courses?: CourseDTO[];
}

export interface CourseDTO {
  id: string;
  tenant_id: string;
  education_level_id: string;
  evaluation_rule_id: string | null;
  code: string;
  name: string;
  short_name: string | null;
  regime_type: 'ANNUAL' | 'SEMESTER' | 'MODULAR' | 'CYCLIC';
  inep_course_code: string | null;
  minimum_workload_hours: number;
  minimum_school_days: number;
  total_stages: number;
  stage_division_type: StageDivisionType;
  is_active: boolean;
  grades?: GradeDTO[];
}

export interface GradeDTO {
  id: string;
  tenant_id: string;
  course_id: string;
  evaluation_rule_id: string | null;
  name: string;
  order_index: number;
  stage_code_inep: string;
  workload_hours: number;
  school_days: number;
  target_age: number | null;
  min_age: number | null;
  max_age: number | null;
  cutoff_day: number;
  cutoff_month: number;
  is_graduating_stage: boolean;
  cycle_name: string | null;
  is_continuous_progression: boolean;
  is_active: boolean;
}

export interface GradeSequenceDTO {
  id: string;
  tenant_id: string;
  origin_grade_id: string;
  destination_grade_id: string;
  transition_type: TransitionType;
  description: string | null;
  requires_board_approval: boolean;
  is_active: boolean;
  destination_grade?: GradeDTO;
}

export interface CourseSchoolOfferDTO {
  id: string;
  tenant_id: string;
  school_id: string;
  course_id: string;
  authorization_act_number: string | null;
  authorization_date: string | null;
  start_year: number;
  end_year: number | null;
  is_active: boolean;
  course?: CourseDTO;
}
```

---

## 6. Componentes Frontend React 19 (`@sysgov/ui` + Tailwind v4)

### 6.1. `CurriculumStructureTree.tsx`

```tsx
import React, { useState } from 'react';
import { 
  FolderIcon, 
  AcademicCapIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  TagIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import type { EducationLevelDTO, CourseDTO, GradeDTO } from '@sysgov/sdk';

interface CurriculumStructureTreeProps {
  levels: EducationLevelDTO[];
  onSelectGrade: (grade: GradeDTO) => void;
}

export const CurriculumStructureTree: React.FC<CurriculumStructureTreeProps> = ({
  levels,
  onSelectGrade,
}) => {
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({ [levels[0]?.id]: true });
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  const toggleLevel = (id: string) => {
    setExpandedLevels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCourse = (id: string) => {
    setExpandedCourses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl font-sans text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <AcademicCapIcon className="w-6 h-6 text-emerald-400" />
            Estrutura Curricular e Etapas de Ensino
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            SYSGOV :: Educa / Academic Taxonomy & Grade Cycle Engine
          </p>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
          LDB / INEP Validados
        </span>
      </div>

      <div className="space-y-3">
        {levels.map((level) => {
          const isLvlOpen = expandedLevels[level.id];
          return (
            <div key={level.id} className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-950/50">
              <button
                type="button"
                onClick={() => toggleLevel(level.id)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isLvlOpen ? (
                    <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                  )}
                  <FolderIcon className="w-5 h-5 text-blue-400" />
                  <div>
                    <span className="font-semibold text-sm text-slate-200">{level.name}</span>
                    <span className="ml-2 text-xs font-mono text-slate-500">[{level.code}]</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {level.courses?.length ?? 0} Cursos
                </span>
              </button>

              {isLvlOpen && (
                <div className="p-3 pl-8 space-y-2 border-t border-slate-800/60 bg-slate-900/30">
                  {level.courses?.map((course) => {
                    const isCrsOpen = expandedCourses[course.id];
                    return (
                      <div key={course.id} className="border border-slate-800/60 rounded-md bg-slate-950/40">
                        <button
                          type="button"
                          onClick={() => toggleCourse(course.id)}
                          className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/30 transition text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            {isCrsOpen ? (
                              <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <AcademicCapIcon className="w-4 h-4 text-indigo-400" />
                            <span className="font-medium text-xs text-slate-300">{course.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400">
                              {course.minimum_workload_hours}h / {course.minimum_school_days} dias
                            </span>
                            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                              {course.stage_division_type}
                            </span>
                          </div>
                        </button>

                        {isCrsOpen && (
                          <div className="p-2.5 pl-6 space-y-1.5 border-t border-slate-800/40 bg-slate-900/40">
                            {course.grades?.map((grade) => (
                              <div
                                key={grade.id}
                                onClick={() => onSelectGrade(grade)}
                                className="flex items-center justify-between p-2 rounded hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-700/60 group"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                                    {grade.order_index}
                                  </span>
                                  <span className="text-xs text-slate-200 group-hover:text-emerald-400 font-medium">
                                    {grade.name}
                                  </span>
                                  {grade.cycle_name && (
                                    <span className="text-[10px] font-mono text-pink-400 bg-pink-950/40 px-1.5 py-0.2 rounded border border-pink-800/30">
                                      {grade.cycle_name}
                                    </span>
                                  )}
                                  {grade.is_continuous_progression && (
                                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/30">
                                      Ciclo Continuado
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                                  <span>INEP: {grade.stage_code_inep}</span>
                                  <span>{grade.workload_hours}h</span>
                                  {grade.is_graduating_stage && (
                                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" title="Etapa Concluinte" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

### 6.2. `GradeSequenceMatrixBuilder.tsx`

```tsx
import React, { useState } from 'react';
import { ArrowsRightLeftIcon, PlusIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { GradeDTO, GradeSequenceDTO, TransitionType } from '@sysgov/sdk';

interface GradeSequenceMatrixBuilderProps {
  grades: GradeDTO[];
  sequences: GradeSequenceDTO[];
  onSaveSequence: (newSequence: Omit<GradeSequenceDTO, 'id' | 'tenant_id'>) => void;
  onDeleteSequence: (sequenceId: string) => void;
}

export const GradeSequenceMatrixBuilder: React.FC<GradeSequenceMatrixBuilderProps> = ({
  grades,
  sequences,
  onSaveSequence,
  onDeleteSequence,
}) => {
  const [originGradeId, setOriginGradeId] = useState<string>(grades[0]?.id || '');
  const [destinationGradeId, setDestinationGradeId] = useState<string>(grades[1]?.id || '');
  const [transitionType, setTransitionType] = useState<TransitionType>('REGULAR_PROMOTION');
  const [requiresApproval, setRequiresApproval] = useState<boolean>(false);

  const handleAdd = () => {
    if (!originGradeId || !destinationGradeId) return;

    onSaveSequence({
      origin_grade_id: originGradeId,
      destination_grade_id: destinationGradeId,
      transition_type: transitionType,
      description: `Transição ${transitionType} de ${grades.find(g => g.id === originGradeId)?.name} para ${grades.find(g => g.id === destinationGradeId)?.name}`,
      requires_board_approval: requiresApproval,
      is_active: true,
    });
  };

  const getTransitionBadge = (type: TransitionType) => {
    switch (type) {
      case 'REGULAR_PROMOTION':
        return <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px] font-mono">Promoção Regular</span>;
      case 'CYCLE_CONTINUATION':
        return <span className="bg-pink-950/80 text-pink-400 border border-pink-800/60 px-2 py-0.5 rounded text-[10px] font-mono">Continuação de Ciclo</span>;
      case 'ACCELERATION_JUMP':
        return <span className="bg-amber-950/80 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded text-[10px] font-mono">Aceleração de Fluxo</span>;
      case 'PARTIAL_DEPENDENCY':
        return <span className="bg-purple-950/80 text-purple-400 border border-purple-800/60 px-2 py-0.5 rounded text-[10px] font-mono">Dependência Parcial</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">{type}</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-5 h-5 text-indigo-400" />
            Matriz de Transição e Progressão de Séries
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Motor de regras de remanejamento, avanço de série e aceleração pedagógica
          </p>
        </div>
      </div>

      {/* Formulário de Nova Regra */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 mb-5">
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Série Origem</label>
          <select
            value={originGradeId}
            onChange={(e) => setOriginGradeId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 font-sans focus:ring-1 focus:ring-indigo-500"
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.order_index}º - {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Série Destino</label>
          <select
            value={destinationGradeId}
            onChange={(e) => setDestinationGradeId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 font-sans focus:ring-1 focus:ring-indigo-500"
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.order_index}º - {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Tipo de Transição</label>
          <select
            value={transitionType}
            onChange={(e) => setTransitionType(e.target.value as TransitionType)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 font-sans focus:ring-1 focus:ring-indigo-500"
          >
            <option value="REGULAR_PROMOTION">Promoção Regular</option>
            <option value="CYCLE_CONTINUATION">Continuação de Ciclo</option>
            <option value="ACCELERATION_JUMP">Aceleração de Fluxo</option>
            <option value="PARTIAL_DEPENDENCY">Dependência Parcial</option>
            <option value="INTER_COURSE_TRANSITION">Transição Entre Cursos</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
            />
            Exige Conselho
          </label>
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 px-3 rounded-md flex items-center justify-center gap-1 transition"
          >
            <PlusIcon className="w-4 h-4" />
            Adicionar Regra
          </button>
        </div>
      </div>

      {/* Listagem de Regras Existentes */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/30">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 font-mono text-[11px] text-slate-400 uppercase border-b border-slate-800">
            <tr>
              <th className="p-3">Série Origem</th>
              <th className="p-3">Série Destino</th>
              <th className="p-3">Tipo de Transição</th>
              <th className="p-3">Exigência Deliberativa</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sequences.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-500 font-mono">
                  Nenhuma regra de progressão configurada para o filtro atual.
                </td>
              </tr>
            ) : (
              sequences.map((seq) => {
                const origin = grades.find((g) => g.id === seq.origin_grade_id);
                const dest = grades.find((g) => g.id === seq.destination_grade_id);
                return (
                  <tr key={seq.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-medium text-slate-200">
                      {origin?.name || seq.origin_grade_id}
                    </td>
                    <td className="p-3 font-medium text-slate-200">
                      {dest?.name || seq.destination_grade_id}
                    </td>
                    <td className="p-3">
                      {getTransitionBadge(seq.transition_type)}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {seq.requires_board_approval ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <ShieldCheckIcon className="w-4 h-4" /> Parecer Conselho
                        </span>
                      ) : (
                        <span className="text-slate-500">Automático</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteSequence(seq.id)}
                        className="text-slate-500 hover:text-red-400 transition p-1"
                        title="Remover regra"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```
