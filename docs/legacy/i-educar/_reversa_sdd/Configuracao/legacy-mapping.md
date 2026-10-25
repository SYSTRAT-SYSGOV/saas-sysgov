# Mapeamento Legado: Parametrizações Globais da Rede de Ensino e Bloqueio de Prazos (`Configuracao`)

> **Módulo:** `Configuracao / Parametrização da Rede`  
> **Submódulo SYSGOV:** `SYS-Educa`  
> **Banco de Dados Alvo:** **MySQL 8.0/8.4+** (`InnoDB`, `CHAR(36)` UUID, `tenant_id`, `utf8mb4_unicode_ci`)  
> **Data:** 2026-10-12  

---

## 1. Visão Geral e Arquitetura Comparada

### 1.1 O Modelo Legado do i-Educar
No i-Educar legado:
1. **Dispersão e Despadronização Estrutural**:
   - Os parâmetros de funcionamento da rede escolar e do sistema estavam fragmentados em 4 fontes distintas:
     - `pmieducar.instituicao`: Detinha os dados da mantenedora municipal e datas de corte CNE (31/03), mas misturava parâmetros administrativos (datas de encerramento de ano, data limite de remanejamento) com regras cadastrais (exigência de CPF, laudo médico, cartão SUS).
     - `pmieducar.configuracoes_gerais`: Guardava textos de certificados, cabeçalhos de relatórios, logotipos e labels de menus institucionais.
     - `pmieducar.bloqueio_ano_letivo`: Implementava um travamento único e monolítico de ano letivo por um intervalo rígido `[data_inicio, data_fim]`, aplicado cegamente a todas as escolas e a qualquer ação do sistema.
     - `public.settings` / `public.settings_categories`: Tabela genérica chave-valor que armazenava configurações globais de infraestrutura (inclusive senhas e tokens em texto puro), sem isolamento nativo por entidade mantenedora ou tenant.
2. **Rigidez e Falta de Granularidade no Bloqueio de Prazos**:
   - A tabela `bloqueio_ano_letivo` só permitia bloquear o ano como um todo. Não havia suporte para prazos diferenciados por **tipo de operação** (lançar notas do 2º bimestre vs. lançar frequência diária vs. alterar matrículas na secretaria).
   - Não existia o conceito de **escopo por escola ou etapa de ensino** (ex: Educação Infantil encerra prazos em datas diferentes do Ensino Fundamental II).
   - Inexistia qualquer mecanismo auditável de **prorrogação ou exceção administrativa**: quando um professor precisava lançar notas após o prazo por motivo de atestado médico, o administrador era obrigado a reabrir o bloqueio para a rede inteira.
3. **Ausência de Cache Estruturado e Performance**:
   - As telas do i-Educar liam constantemente `instituicao` e `configuracoes_gerais` por consultas repetitivas de banco, sem invalidação seletiva de cache.

### 1.2 A Arquitetura Moderna no SYSGOV (`SYS-Educa`)
1. **Configuração Centralizada da Mantenedora (`educa_network_configurations`)**:
   - Unificação de todos os parâmetros institucionais, regras de matrícula e diretrizes de corte etário da Resolução CNE nº 2/2018 (31 de março) por tenant.
   - Parametrizações de obrigatoriedade cadastral (CPF do aluno, certidão de nascimento civil, NIS, laudo de AEE, cartão nacional de saúde SUS).
   - Diretrizes de dependência disciplinar (máximo de disciplinas permitidas em regime de progressão parcial) e regras de unificação de matrículas.
2. **Motor Granular de Bloqueio de Prazos (`educa_calendar_locks`)**:
   - Travamento cirúrgico por **tipo de operação**:
     - `GRADE_POSTING`: Lançamento e retificação de notas e médias por etapa.
     - `ATTENDANCE_POSTING`: Lançamento de frequência e faltas (com tolerância em dias retroativos).
     - `LESSON_PLAN`: Registro de planos de aula e conteúdos lecionados.
     - `ENROLLMENT_MODIFICATION`: Modificações cadastrais, transferências e remanejamentos de matrícula.
     - `ACADEMIC_HISTORY`: Lançamento e retificação de registros de histórico escolar.
   - Hierarquia de escopos: `NETWORK` (toda a rede), `STAGE` (etapa de ensino, ex: Ensino Fundamental Anos Finais) ou `SCHOOL` (escola específica).
3. **Gestão e Auditoria de Exceções Extraordinárias (`educa_lock_exceptions`)**:
   - Permite que a Secretaria de Educação conceda uma reabertura de prazo temporária, estritamente direcionada:
     - A um servidor docente específico (`teacher_id`), turma (`school_class_id`) e componente curricular (`discipline_id`).
     - Com data/hora limite improrrogável de validade (`expires_at`), número de processo administrativo/chamado e justificativa legal registrada.
   - Qualquer operação realizada durante a exceção é registrada em trilha de auditoria vinculada ao protocolo de liberação.
4. **Dicionário Tipado de Parâmetros com Cache Redis (`educa_system_parameters`)**:
   - Estrutura chave-valor tipada (`STRING`, `INTEGER`, `DECIMAL`, `BOOLEAN`, `JSON`, `ENCRYPTED`), garantindo validação de esquema.
   - Parâmetros sensíveis (chaves de integração de SMS, credenciais de mensageria WhatsApp, tokens governamentais) gravados com encriptação AES-256.
   - Camada de cache no Redis com tag `educa_params:{tenant_id}`, com hit time < 1ms e recarga atômica na atualização.

---

## 2. Modelagem de Dados MySQL 8.0/8.4+

```sql
-- =============================================================================
-- TABELA 74: educa_network_configurations (Parâmetros da Mantenedora / Rede)
-- =============================================================================
CREATE TABLE `educa_network_configurations` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `entity_name` VARCHAR(180) NOT NULL COMMENT 'Nome oficial da mantenedora (ex: Prefeitura Municipal de ... - Secretaria de Educação)',
    `acronym` VARCHAR(30) NULL COMMENT 'Sigla oficial (ex: SME-SP, SEMED)',
    `cnpj` CHAR(14) NOT NULL COMMENT 'CNPJ da mantenedora (apenas dígitos)',
    `state_code` CHAR(2) NOT NULL COMMENT 'UF (ex: SP, MG, RJ)',
    `city_ibge_code` CHAR(7) NOT NULL COMMENT 'Código IBGE do município',
    `city_name` VARCHAR(100) NOT NULL,
    
    -- Atos Oficiais e Identidade
    `education_board_name` VARCHAR(150) NULL COMMENT 'Nome do Conselho Municipal/Estadual de Educação',
    `standard_coat_of_arms_url` VARCHAR(255) NULL COMMENT 'URL do brasão padrão do município para documentos',
    `standard_logo_url` VARCHAR(255) NULL COMMENT 'Logotipo padrão da Secretaria de Educação',
    `official_journal_name` VARCHAR(120) NULL COMMENT 'Nome do Diário Oficial utilizado para publicações',
    
    -- Diretrizes CNE e Datas de Corte Etário
    `cne_cutoff_day` TINYINT UNSIGNED NOT NULL DEFAULT 31 COMMENT 'Dia limite da data de corte etário (Padrão CNE: 31)',
    `cne_cutoff_month` TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'Mês limite da data de corte etário (Padrão CNE: 3 - Março)',
    `allow_cutoff_exceptions` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Permite matricular com corte judicial ou liminar deferida',
    
    -- Obrigatoriedades e Validações Cadastrais
    `require_student_cpf` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Exige CPF obrigatório no cadastro do aluno',
    `require_parent_cpf` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Exige CPF do responsável legal',
    `require_birth_certificate` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Exige certidão de nascimento civil',
    `require_sus_card` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Exige número do Cartão Nacional de Saúde (SUS)',
    `require_nis` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Exige Número de Identificação Social (CadÚnico/Bolsa Família)',
    `require_medical_report_for_aee` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Exige anexo de laudo médico para atendimento educacional especializado',
    
    -- Regras Acadêmicas e Movimentação
    `max_disciplinary_dependencies` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT 'Máximo de dependências permitidas para progressão parcial (0 = não permite)',
    `allow_duplicate_enrollment_same_network` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Permite matrículas ativas simultâneas no mesmo turno na rede',
    `enable_automatic_student_id` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Gera matrícula/código de identificação único automaticamente',
    `student_id_prefix` VARCHAR(10) NULL DEFAULT 'ALU' COMMENT 'Prefixo para o código do aluno',
    `student_id_sequence_length` TINYINT UNSIGNED NOT NULL DEFAULT 8 COMMENT 'Tamanho da numeração sequencial do aluno',
    
    -- Metadados de Auditoria
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_network_config_tenant` (`tenant_id`),
    CONSTRAINT `fk_network_config_tenant` FOREIGN KEY (`tenant_id`)
        REFERENCES `sys_tenants` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- TABELA 75: educa_calendar_locks (Motor de Bloqueio de Prazos por Operação/Escopo)
-- =============================================================================
CREATE TABLE `educa_calendar_locks` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `academic_year_id` CHAR(36) NOT NULL,
    `operation_type` ENUM(
        'GRADE_POSTING',             -- Lançamento e alteração de notas/médias
        'ATTENDANCE_POSTING',        -- Lançamento de frequência diária/faltas
        'LESSON_PLAN',               -- Registro de plano de aula e conteúdos
        'ENROLLMENT_MODIFICATION',   -- Matrícula, remanejamento e enturmação
        'ACADEMIC_HISTORY'           -- Lançamento/alteração de histórico escolar
    ) NOT NULL,
    `stage_id` CHAR(36) NULL COMMENT 'Se preenchido, restrito a uma etapa de avaliação específica (bimestre/trimestre)',
    `scope_type` ENUM('NETWORK', 'STAGE', 'SCHOOL') NOT NULL DEFAULT 'NETWORK',
    `school_id` CHAR(36) NULL COMMENT 'Se scope_type=SCHOOL, aponta para a escola específica',
    `course_stage_id` CHAR(36) NULL COMMENT 'Se scope_type=STAGE, aponta para a etapa escolar (ex: Ensino Fundamental)',
    
    -- Janela Temporal de Funcionamento
    `lock_start_at` DATETIME NOT NULL COMMENT 'Início da vigência do bloqueio (a partir deste momento fica travado)',
    `lock_end_at` DATETIME NULL COMMENT 'Fim da vigência do bloqueio (se NULL, bloqueio definitivo/indeterminado)',
    `retroactive_tolerance_days` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Dias de retroatividade tolerados para lançamento (ex: 3 dias para frequência)',
    
    `description` VARCHAR(255) NOT NULL COMMENT 'Motivo / Descrição do bloqueio (ex: Fechamento das Notas do 2º Bimestre)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` CHAR(36) NOT NULL COMMENT 'Usuário da SME que instituiu o bloqueio',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,

    PRIMARY KEY (`id`),
    INDEX `idx_calendar_locks_lookup` (`tenant_id`, `academic_year_id`, `operation_type`, `is_active`),
    INDEX `idx_calendar_locks_school` (`tenant_id`, `school_id`, `operation_type`),
    CONSTRAINT `fk_calendar_locks_tenant` FOREIGN KEY (`tenant_id`)
        REFERENCES `sys_tenants` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_calendar_locks_academic_year` FOREIGN KEY (`academic_year_id`)
        REFERENCES `educa_academic_years` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_calendar_locks_school` FOREIGN KEY (`school_id`)
        REFERENCES `educa_schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- TABELA 76: educa_lock_exceptions (Exceções e Prorrogações Administrativas Auditadas)
-- =============================================================================
CREATE TABLE `educa_lock_exceptions` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `lock_id` CHAR(36) NOT NULL COMMENT 'Bloqueio de referência ao qual a exceção se aplica',
    `user_id` CHAR(36) NOT NULL COMMENT 'Usuário beneficiário da exceção (docente ou secretário)',
    `school_class_id` CHAR(36) NULL COMMENT 'Se restrito a uma turma específica',
    `discipline_id` CHAR(36) NULL COMMENT 'Se restrito a uma disciplina/componente específico',
    `school_id` CHAR(36) NULL COMMENT 'Se aplicável a toda uma escola específica',
    
    -- Prazos e Vigência da Prorrogação
    `expires_at` DATETIME NOT NULL COMMENT 'Data e hora limite exata em que a tolerância expira',
    `protocol_number` VARCHAR(60) NOT NULL COMMENT 'Número do memorando, chamado ou processo administrativo que embasa a liberação',
    `reason` TEXT NOT NULL COMMENT 'Justificativa detalhada (ex: Licença médica do docente regular atestada)',
    
    -- Auditoria
    `granted_by` CHAR(36) NOT NULL COMMENT 'Gestor/Supervisão que autorizou a prorrogação',
    `is_revoked` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Se foi revogado antes do prazo',
    `revoked_at` DATETIME NULL,
    `revocation_reason` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_lock_exceptions_validation` (`tenant_id`, `lock_id`, `user_id`, `expires_at`, `is_revoked`),
    INDEX `idx_lock_exceptions_target` (`tenant_id`, `school_class_id`, `discipline_id`),
    CONSTRAINT `fk_lock_exceptions_tenant` FOREIGN KEY (`tenant_id`)
        REFERENCES `sys_tenants` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_lock_exceptions_lock` FOREIGN KEY (`lock_id`)
        REFERENCES `educa_calendar_locks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lock_exceptions_user` FOREIGN KEY (`user_id`)
        REFERENCES `sys_users` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_lock_exceptions_class` FOREIGN KEY (`school_class_id`)
        REFERENCES `educa_school_classes` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lock_exceptions_discipline` FOREIGN KEY (`discipline_id`)
        REFERENCES `educa_disciplines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- TABELA 77: educa_system_parameters (Dicionário de Parâmetros Tipados por Tenant)
-- =============================================================================
CREATE TABLE `educa_system_parameters` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `group_name` VARCHAR(60) NOT NULL COMMENT 'Agrupador de contexto (ex: MESSAGING, INTEGRATION, PORTAL_PARENTS, REPORTS, SECURITY)',
    `param_key` VARCHAR(100) NOT NULL COMMENT 'Chave única identificadora (ex: whatsapp_notifications_enabled, sms_gateway_token)',
    `data_type` ENUM('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON', 'ENCRYPTED') NOT NULL DEFAULT 'STRING',
    `param_value` MEDIUMTEXT NULL COMMENT 'Valor gravado (em texto puro ou JSON formatado)',
    `encrypted_value` BLOB NULL COMMENT 'Valor criptografado com AES-256 (utilizado quando data_type=ENCRYPTED)',
    `description` VARCHAR(255) NOT NULL COMMENT 'Descrição amigável da finalidade do parâmetro para os administradores',
    `is_system_reserved` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Se 1, não pode ser deletado pela interface administrativa',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_sys_params_tenant_key` (`tenant_id`, `param_key`),
    INDEX `idx_sys_params_tenant_group` (`tenant_id`, `group_name`),
    CONSTRAINT `fk_sys_params_tenant` FOREIGN KEY (`tenant_id`)
        REFERENCES `sys_tenants` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Matriz de Mapeamento De/Para

| Entidade / Coluna Legada (i-Educar) | Tabela / Coluna Alvo (SYSGOV) | Tipo Alvo | Regra de Transformação / Comentário |
| :--- | :--- | :--- | :--- |
| `pmieducar.instituicao.cod_instituicao` | `educa_network_configurations.id` | `CHAR(36)` | Geração de UUID v4 determinístico vinculado ao `tenant_id`. |
| `pmieducar.instituicao.nm_instituicao` | `educa_network_configurations.entity_name` | `VARCHAR(180)` | Nome oficial da mantenedora / Secretaria Municipal de Educação. |
| *(Novo)* | `educa_network_configurations.acronym` | `VARCHAR(30)` | Sigla oficial (ex: SEMED). |
| *(Novo no banco)* | `educa_network_configurations.cnpj` | `CHAR(14)` | CNPJ da prefeitura/órgão gestor. |
| `pmieducar.instituicao.data_base_remanejamento` | `educa_calendar_locks` | Linha / `DATETIME` | Migrado de data fixa de coluna para registro dinâmico de bloqueio `ENROLLMENT_MODIFICATION`. |
| `pmieducar.instituicao.data_base_transferencia` | `educa_calendar_locks` | Linha / `DATETIME` | Migrado para bloqueio de movimentação com escopo `NETWORK`. |
| `pmieducar.instituicao.data_corte_etario` | `educa_network_configurations.cne_cutoff_day` e `cne_cutoff_month` | `TINYINT` | Extração do dia e mês (padrão 31 de março, Resolução CNE nº 2/2018). |
| `pmieducar.instituicao.controlar_bloqueio_ano_letivo` | `educa_calendar_locks.is_active` | `TINYINT(1)` | Substituído por controle granular por operação e escopo. |
| `pmieducar.instituicao.exigir_cpf_aluno` | `educa_network_configurations.require_student_cpf` | `TINYINT(1)` | Booleano de obrigatoriedade de CPF discente. |
| `pmieducar.instituicao.exigir_laudo_medico` | `educa_network_configurations.require_medical_report_for_aee` | `TINYINT(1)` | Validação para matrículas em salas de recursos/AEE. |
| `pmieducar.instituicao.quantidade_dependencia` | `educa_network_configurations.max_disciplinary_dependencies` | `TINYINT` | Número máximo de disciplinas que admitem progressão continuada. |
| `pmieducar.configuracoes_gerais.brasao_relatorios` | `educa_network_configurations.standard_coat_of_arms_url` | `VARCHAR(255)` | Migração de asset físico local para URL/S3 do tenant. |
| `pmieducar.configuracoes_gerais.logo_login` | `educa_network_configurations.standard_logo_url` | `VARCHAR(255)` | URL da logomarca oficial para cabeçalhos e portais. |
| `pmieducar.bloqueio_ano_letivo.data_inicio` / `data_fim` | `educa_calendar_locks.lock_start_at` / `lock_end_at` | `DATETIME` | Período de vigência da trava para a operação indicada. |
| *(Inexistente no Legado)* | `educa_lock_exceptions.*` | Tabela | Mecanismo inédito no SYSGOV para concessão auditada de prorrogação a professores específicos. |
| `public.settings.key` / `value` | `educa_system_parameters.param_key` / `param_value` | Dicionário | Parâmetros chave-valor tipados com suporte a valores encriptados. |

---

## 4. Implementação Backend Laravel 13

### 4.1 Interceptor de Validação de Bloqueio de Prazos (`CalendarLockManagerService`)

```php
<?php

declare(strict_types=1);

namespace App\Services\Educa\Configuration;

use App\Enums\Educa\CalendarOperationType;
use App\Exceptions\Educa\CalendarLockedException;
use App\Models\Educa\CalendarLock;
use App\Models\Educa\LockException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class CalendarLockManagerService
{
    /**
     * Valida se uma operação pode ser executada no momento ou se está bloqueada.
     * Lança CalendarLockedException caso a operação esteja travada e sem exceção ativa.
     *
     * @throws CalendarLockedException
     */
    public function assertOperationAllowed(
        string $tenantId,
        string $academicYearId,
        CalendarOperationType $operationType,
        string $userId,
        ?string $schoolId = null,
        ?string $schoolClassId = null,
        ?string $disciplineId = null,
        ?CarbonImmutable $targetDate = null
    ): void {
        $now = CarbonImmutable::now();
        $dateToCheck = $targetDate ?? $now;

        // 1. Busca os bloqueios ativos aplicáveis a esta operação
        $locks = $this->getActiveLocks($tenantId, $academicYearId, $operationType, $schoolId);

        foreach ($locks as $lock) {
            // Verifica tolerância retroativa caso informada uma data alvo (ex: chamada de 3 dias atrás)
            if ($targetDate !== null && $lock->retroactive_tolerance_days > 0) {
                $earliestAllowedDate = $now->subDays($lock->retroactive_tolerance_days)->startOfDay();
                if ($targetDate->lessThan($earliestAllowedDate)) {
                    $this->validateExceptionOrThrow($lock, $userId, $schoolClassId, $disciplineId, $schoolId, 'Tolerância retroativa expirada.');
                }
            }

            // Verifica se a data atual está dentro da janela de bloqueio
            $isWithinLockWindow = $now->greaterThanOrEqualTo($lock->lock_start_at) &&
                ($lock->lock_end_at === null || $now->lessThanOrEqualTo($lock->lock_end_at));

            if ($isWithinLockWindow) {
                $this->validateExceptionOrThrow(
                    $lock,
                    $userId,
                    $schoolClassId,
                    $disciplineId,
                    $schoolId,
                    "Prazo encerrado para a operação: {$lock->description}"
                );
            }
        }
    }

    /**
     * Verifica se o usuário possui uma exceção/prorrogação válida e não revogada.
     */
    private function validateExceptionOrThrow(
        CalendarLock $lock,
        string $userId,
        ?string $schoolClassId,
        ?string $disciplineId,
        ?string $schoolId,
        string $lockReason
    ): void {
        $now = CarbonImmutable::now();

        $hasValidException = LockException::query()
            ->where('tenant_id', $lock->tenant_id)
            ->where('lock_id', $lock->id)
            ->where('user_id', $userId)
            ->where('is_revoked', false)
            ->where('expires_at', '>', $now)
            ->where(function ($query) use ($schoolClassId) {
                $query->whereNull('school_class_id')
                    ->orWhere('school_class_id', $schoolClassId);
            })
            ->where(function ($query) use ($disciplineId) {
                $query->whereNull('discipline_id')
                    ->orWhere('discipline_id', $disciplineId);
            })
            ->where(function ($query) use ($schoolId) {
                $query->whereNull('school_id')
                    ->orWhere('school_id', $schoolId);
            })
            ->exists();

        if (! $hasValidException) {
            throw new CalendarLockedException(
                message: "Acesso travado pela Secretaria de Educação. {$lockReason}",
                lockId: $lock->id,
                operationType: $lock->operation_type->value,
                lockExpiresAt: $lock->lock_end_at?->toIso8601String()
            );
        }
    }

    /**
     * Recupera bloqueios ativos do cache ou banco de dados.
     */
    private function getActiveLocks(
        string $tenantId,
        string $academicYearId,
        CalendarOperationType $operationType,
        ?string $schoolId
    ) {
        $cacheKey = "educa_locks:{$tenantId}:{$academicYearId}:{$operationType->value}";

        return Cache::tags(["tenant:{$tenantId}", 'educa_locks'])->remember(
            $cacheKey,
            now()->addMinutes(10),
            fn () => CalendarLock::query()
                ->where('tenant_id', $tenantId)
                ->where('academic_year_id', $academicYearId)
                ->where('operation_type', $operationType)
                ->where('is_active', true)
                ->where(function ($query) use ($schoolId) {
                    $query->where('scope_type', 'NETWORK')
                        ->orWhere(function ($q) use ($schoolId) {
                            $q->where('scope_type', 'SCHOOL')
                                ->where('school_id', $schoolId);
                        });
                })
                ->get()
        );
    }
}
```

### 4.2 Serviço de Parâmetros e Cache Distribuído (`SystemParameterService`)

```php
<?php

declare(strict_types=1);

namespace App\Services\Educa\Configuration;

use App\Models\Educa\SystemParameter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

final class SystemParameterService
{
    /**
     * Recupera o valor tipado de um parâmetro do sistema pelo tenant e chave.
     */
    public function get(string $tenantId, string $key, mixed $default = null): mixed
    {
        $cacheKey = "educa_param:{$tenantId}:{$key}";

        return Cache::tags(["tenant:{$tenantId}", 'system_params'])->remember(
            $cacheKey,
            now()->addHours(24),
            function () use ($tenantId, $key, $default) {
                $param = SystemParameter::query()
                    ->where('tenant_id', $tenantId)
                    ->where('param_key', $key)
                    ->first();

                if (! $param) {
                    return $default;
                }

                return match ($param->data_type) {
                    'BOOLEAN' => filter_var($param->param_value, FILTER_VALIDATE_BOOLEAN),
                    'INTEGER' => (int) $param->param_value,
                    'DECIMAL' => (float) $param->param_value,
                    'JSON' => json_decode($param->param_value, true),
                    'ENCRYPTED' => $param->encrypted_value ? Crypt::decrypt($param->encrypted_value) : null,
                    default => $param->param_value,
                };
            }
        );
    }

    /**
     * Persiste ou atualiza um parâmetro de sistema com invalidação atômica de cache.
     */
    public function set(string $tenantId, string $key, mixed $value, string $dataType = 'STRING', ?string $description = null): void
    {
        $param = SystemParameter::firstOrNew([
            'tenant_id' => $tenantId,
            'param_key' => $key,
        ]);

        $param->data_type = $dataType;
        if ($description) {
            $param->description = $description;
        }

        if ($dataType === 'ENCRYPTED') {
            $param->param_value = null;
            $param->encrypted_value = Crypt::encrypt($value);
        } elseif ($dataType === 'JSON') {
            $param->param_value = json_encode($value);
        } else {
            $param->param_value = (string) $value;
        }

        $param->save();

        Cache::tags(["tenant:{$tenantId}", 'system_params'])->forget("educa_param:{$tenantId}:{$key}");
    }
}
```

---

## 5. Tipos e Interfaces TypeScript (`@sysgov/sdk`)

```typescript
/**
 * @file EducaConfigurationTypes.ts
 * Contratos de DTO e interfaces para o módulo de Configurações Globais e Bloqueio de Prazos.
 */

export type CalendarOperationType =
  | 'GRADE_POSTING'
  | 'ATTENDANCE_POSTING'
  | 'LESSON_PLAN'
  | 'ENROLLMENT_MODIFICATION'
  | 'ACADEMIC_HISTORY';

export type LockScopeType = 'NETWORK' | 'STAGE' | 'SCHOOL';

export type SystemParamDataType =
  | 'STRING'
  | 'INTEGER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'JSON'
  | 'ENCRYPTED';

export interface NetworkConfigurationDTO {
  id: string;
  tenantId: string;
  entityName: string;
  acronym?: string;
  cnpj: string;
  stateCode: string;
  cityIbgeCode: string;
  cityName: string;
  educationBoardName?: string;
  standardCoatOfArmsUrl?: string;
  standardLogoUrl?: string;
  officialJournalName?: string;
  cneCutoffDay: number;
  cneCutoffMonth: number;
  allowCutoffExceptions: boolean;
  requireStudentCpf: boolean;
  requireParentCpf: boolean;
  requireBirthCertificate: boolean;
  requireSusCard: boolean;
  requireNis: boolean;
  requireMedicalReportForAee: boolean;
  maxDisciplinaryDependencies: number;
  allowDuplicateEnrollmentSameNetwork: boolean;
  enableAutomaticStudentId: boolean;
  studentIdPrefix: string;
  studentIdSequenceLength: number;
}

export interface CalendarLockDTO {
  id: string;
  tenantId: string;
  academicYearId: string;
  operationType: CalendarOperationType;
  scopeType: LockScopeType;
  schoolId?: string;
  schoolName?: string;
  stageId?: string;
  stageName?: string;
  lockStartAt: string; // ISO 8601
  lockEndAt?: string;  // ISO 8601
  retroactiveToleranceDays: number;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface LockExceptionDTO {
  id: string;
  tenantId: string;
  lockId: string;
  operationType: CalendarOperationType;
  userId: string;
  userName: string;
  schoolClassId?: string;
  schoolClassName?: string;
  disciplineId?: string;
  disciplineName?: string;
  expiresAt: string; // ISO 8601
  protocolNumber: string;
  reason: string;
  grantedBy: string;
  grantedByName: string;
  isRevoked: boolean;
  createdAt: string;
}

export interface SystemParameterDTO {
  id: string;
  tenantId: string;
  groupName: string;
  paramKey: string;
  dataType: SystemParamDataType;
  paramValue?: string;
  description: string;
  isSystemReserved: boolean;
}
```

---

## 6. Interface Frontend React 19 + Tailwind v4 + `@sysgov/ui`

Componente de painel administrativo para gestão dos bloqueios da rede e concessão de exceções:

```tsx
import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Calendar, 
  ShieldAlert, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Clock, 
  UserCheck 
} from 'lucide-react';
import type { CalendarLockDTO, LockExceptionDTO, CalendarOperationType } from './EducaConfigurationTypes';

interface CalendarLockManagerProps {
  locks: CalendarLockDTO[];
  exceptions: LockExceptionDTO[];
  academicYear: number;
  onGrantException: (data: Partial<LockExceptionDTO>) => Promise<void>;
  onToggleLock: (lockId: string, active: boolean) => Promise<void>;
}

export const CalendarLockManager: React.FC<CalendarLockManagerProps> = ({
  locks,
  exceptions,
  academicYear,
  onGrantException,
  onToggleLock,
}) => {
  const [activeTab, setActiveTab] = useState<'LOCKS' | 'EXCEPTIONS'>('LOCKS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getOperationBadge = (type: CalendarOperationType) => {
    const badges: Record<CalendarOperationType, { label: string; class: string }> = {
      GRADE_POSTING: { label: 'Lançamento de Notas', class: 'bg-amber-100 text-amber-800 border-amber-300' },
      ATTENDANCE_POSTING: { label: 'Frequência / Chamada', class: 'bg-blue-100 text-blue-800 border-blue-300' },
      LESSON_PLAN: { label: 'Plano de Aula / Diário', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      ENROLLMENT_MODIFICATION: { label: 'Matrículas / Secretaria', class: 'bg-purple-100 text-purple-800 border-purple-300' },
      ACADEMIC_HISTORY: { label: 'Histórico Escolar', class: 'bg-slate-100 text-slate-800 border-slate-300' },
    };
    const item = badges[type];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${item.class}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      {/* Header com Identidade e Abas */}
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Governança de Prazos e Bloqueios do Ano Letivo {academicYear}
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Controle de datas limites para diário de classe, notas, faltas e autorizações de exceções pedagógicas.
          </p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('LOCKS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'LOCKS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bloqueios Ativos ({locks.length})
          </button>
          <button
            onClick={() => setActiveTab('EXCEPTIONS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'EXCEPTIONS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exceções Concedidas ({exceptions.length})
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba: Bloqueios */}
      {activeTab === 'LOCKS' && (
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4">Operação / Alvo</th>
                  <th className="py-3 px-4">Escopo</th>
                  <th className="py-3 px-4">Início do Bloqueio</th>
                  <th className="py-3 px-4">Término</th>
                  <th className="py-3 px-4">Tolerância</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {locks.map((lock) => (
                  <tr key={lock.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{lock.description}</div>
                      <div className="mt-1">{getOperationBadge(lock.operationType)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {lock.scopeType === 'NETWORK' ? 'REDE TODA' : lock.schoolName || lock.scopeType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                      {new Date(lock.lockStartAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                      {lock.lockEndAt ? new Date(lock.lockEndAt).toLocaleString('pt-BR') : 'Indeterminado'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {lock.retroactiveToleranceDays > 0 ? (
                        <span className="text-amber-700 font-semibold">{lock.retroactiveToleranceDays} dias</span>
                      ) : (
                        <span className="text-slate-400">Nenhuma</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {lock.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <Lock className="w-3 h-3" /> Bloqueado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          <Unlock className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onToggleLock(lock.id, !lock.isActive)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {lock.isActive ? 'Desativar' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba: Exceções */}
      {activeTab === 'EXCEPTIONS' && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Prorrogações Extraordinárias de Prazo em Vigor
            </h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Conceder Prorrogação
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4">Beneficiário / Professor</th>
                  <th className="py-3 px-4">Turma & Disciplina</th>
                  <th className="py-3 px-4">Validade Até</th>
                  <th className="py-3 px-4">Protocolo / Processo</th>
                  <th className="py-3 px-4">Autorizado Por</th>
                  <th className="py-3 px-4 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {exceptions.map((exc) => (
                  <tr key={exc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-indigo-500" />
                        {exc.userName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {exc.userId.substring(0, 8)}...</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <div>{exc.schoolClassName || 'Todas as turmas atribuídas'}</div>
                      <div className="text-slate-500">{exc.disciplineName || 'Todos os componentes'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-amber-700">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {new Date(exc.expiresAt).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-800">
                      {exc.protocolNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {exc.grantedByName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {!exc.isRevoked && new Date(exc.expiresAt) > new Date() ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Vigente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          Expirada / Revogada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
```
