# Mapeamento do Módulo: Educacenso (Exportações Regulatórias MEC/Inep)

> Mapeamento de engenharia reversa do i-Educar para o submódulo **`SYS-Educa`** no ecossistema multi-tenant **SYSGOV**.  
> **Diretriz de Infraestrutura do SYSGOV:** Banco de dados **MySQL 8.0+** (InnoDB, utf8mb4), backend em **Laravel 13** (PHP 8.4) e frontend em **React 19 + TypeScript + Tailwind v4** com **`@sysgov/ui`** e **`@sysgov/sdk`**.

---

## 1. Visão Geral e Contexto Regulatório

O **Educacenso** é o instrumento oficial de coleta de dados da educação básica brasileira, gerido pelo **Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (INEP / MEC)**. O preenchimento e exportação anual fidedigna do Censo Escolar é mandatório por lei federal para todos os municípios e estados brasileiros, pois dele derivam:

1. **Distribuição do FUNDEB (Lei nº 14.113/2020):** Repasse de recursos com base no número de matrículas declaradas na data de referência (última quarta-feira de maio).
2. **Programas Federais (FNDE):** Alimentação escolar (PNAE), transporte do escolar (PNATE), livro didático (PNLD) e dinheiro direto na escola (PDDE).
3. **Indicadores Nacionais (IDEB):** Cruzamento de dados de fluxo escolar (aprovação, reprovação e abandono) com as avaliações do SAEB.
4. **Estrutura dos Arquivos de Exportação:** Arquivo posicional delimitado pelo caractere pipe (`|`), organizado hierarquicamente em 8 tipos de registros:
   - **Registro `00`:** Identificação e Caracterização da Escola (Infraestrutura, Saneamento, Energia, Equipamentos, Internet, Dependências).
   - **Registro `10`:** Gestor Escolar (CPF, cargo, critério de acesso, tipo de vínculo).
   - **Registro `20`:** Turmas (Código da turma, horário, dias da semana, modalidade, etapa agregada do INEP, tipo de atendimento, itinerários formativos).
   - **Registro `30`:** Docentes e Profissionais Escolares em Sala (CPF, NIS, dados civis, escolaridade, curso superior/licenciatura, deficiências).
   - **Registro `40`:** Vínculo do Docente com a Turma (etapa lecionada, componentes curriculares ministrados, tipo de contratação).
   - **Registro `50`:** Alunos (Identificação civil, certidão de nascimento, CPF, NIS, filiação, deficiências/TGD/superdotação, recursos para provas).
   - **Registro `60`:** Vínculo do Aluno com a Turma (Matrícula, forma de ingresso, transporte escolar público com modal e poder público pagador, escolarização em outro espaço).
   - **Registro `99`:** Registro de Fechamento (Totalizador de linhas exportadas por registro).

---

## 2. Modelagem de Dados no SYSGOV (MySQL 8.0+)

Todas as tabelas do submódulo seguem a convenção corporativa do SYSGOV:
- **Engine:** `InnoDB` com `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
- **Identificadores:** `id CHAR(36) NOT NULL PRIMARY KEY` (UUID v4).
- **Multi-tenancy:** `tenant_id CHAR(36) NOT NULL` obrigatório em todas as tabelas, indexado preventivamente com `INDEX idx_tenant_*`.
- **Booleans:** `TINYINT(1) NOT NULL DEFAULT 0`.
- **Metadados e Logs:** Colunas nativas `JSON` do MySQL 8 para flexibilidade de validação de schemas em evolução constante das portarias do MEC.

```sql
-- ============================================================================
-- 1. Lotes de Exportação e Importação de Retorno do Censo Escolar
-- ============================================================================
CREATE TABLE `educa_censo_batches` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `school_id` CHAR(36) NULL COMMENT 'NULL indica lote consolidado da rede municipal',
    `academic_year` SMALLINT NOT NULL COMMENT 'Ano de referência do Censo Escolar',
    `reference_date` DATE NOT NULL COMMENT 'Data de referência oficial do INEP (última quarta-feira de maio)',
    `batch_type` ENUM('INITIAL_ENROLLMENT', 'SCHOOL_SITUATION') NOT NULL DEFAULT 'INITIAL_ENROLLMENT' COMMENT 'Fase 1: Matrícula Inicial | Fase 2: Situação do Aluno',
    `status` ENUM('DRAFT', 'VALIDATING', 'VALIDATED_WITH_ERRORS', 'VALIDATED_READY', 'GENERATING', 'GENERATED', 'SENT_INEP', 'IMPORTED_RETURN') NOT NULL DEFAULT 'DRAFT',
    `file_path` VARCHAR(255) NULL COMMENT 'Caminho no S3/MinIO do arquivo .txt ou .zip gerado',
    `file_hash_sha256` CHAR(64) NULL COMMENT 'Checksum SHA-256 do arquivo oficial para auditoria',
    `total_records_00` INT NOT NULL DEFAULT 0,
    `total_records_10` INT NOT NULL DEFAULT 0,
    `total_records_20` INT NOT NULL DEFAULT 0,
    `total_records_30` INT NOT NULL DEFAULT 0,
    `total_records_40` INT NOT NULL DEFAULT 0,
    `total_records_50` INT NOT NULL DEFAULT 0,
    `total_records_60` INT NOT NULL DEFAULT 0,
    `total_records_99` INT NOT NULL DEFAULT 0,
    `total_errors` INT NOT NULL DEFAULT 0,
    `total_warnings` INT NOT NULL DEFAULT 0,
    `created_by_user_id` CHAR(36) NOT NULL,
    `generated_at` DATETIME NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_tenant_academic_year` (`tenant_id`, `academic_year`),
    INDEX `idx_tenant_school` (`tenant_id`, `school_id`),
    INDEX `idx_tenant_status` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Controle de arquivos e lotes de exportação do Educacenso';

-- ============================================================================
-- 2. Caracterização de Infraestrutura e Configurações Específicas da Escola (Registro 00)
-- ============================================================================
CREATE TABLE `educa_censo_school_configs` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `school_id` CHAR(36) NOT NULL,
    `academic_year` SMALLINT NOT NULL,
    `inep_code` CHAR(8) NOT NULL COMMENT 'Código de 8 dígitos atribuído pelo INEP',
    `operating_status` TINYINT NOT NULL DEFAULT 1 COMMENT '1=Em atividade, 2=Paralisada, 3=Extinta',
    `location_zone` TINYINT NOT NULL DEFAULT 1 COMMENT '1=Urbana, 2=Rural',
    `location_type` TINYINT NOT NULL DEFAULT 1 COMMENT '1=Área urbana, 2=Área rural, 3=Área de assentamento, 4=Terra indígena, 5=Quilombola',
    `building_occupation_type` TINYINT NOT NULL DEFAULT 1 COMMENT '1=Próprio, 2=Alugado, 3=Cedido, 4=Outro',
    `water_supply` JSON NOT NULL COMMENT 'Array: [1=Rede pública, 2=Poço artesiano, 3=Cisterna, 4=Fonte/Rio, 5=Não há]',
    `energy_supply` JSON NOT NULL COMMENT 'Array: [1=Rede pública, 2=Gerador fóssil, 3=Energia solar/eólica, 4=Não há]',
    `sewage_system` JSON NOT NULL COMMENT 'Array: [1=Rede pública, 2=Fossa séptica, 3=Fossa rudimentar, 4=Não há]',
    `garbage_disposal` JSON NOT NULL COMMENT 'Array: [1=Coleta periódica, 2=Queima, 3=Enterra, 4=Descarta em área pública]',
    `treatment_lixo_separacao` TINYINT(1) NOT NULL DEFAULT 0,
    `treatment_lixo_reciclagem` TINYINT(1) NOT NULL DEFAULT 0,
    `facilities` JSON NOT NULL COMMENT 'Array de dependências (salas, diretoria, biblioteca, laboratório, refeitório, quadra)',
    `accessibility_resources` JSON NOT NULL COMMENT 'Array de recursos de acessibilidade física (rampas, corrimãos, pisos táteis, elevadores)',
    `internet_access` TINYINT(1) NOT NULL DEFAULT 0,
    `internet_for_learning` TINYINT(1) NOT NULL DEFAULT 0,
    `internet_for_administrative` TINYINT(1) NOT NULL DEFAULT 0,
    `internet_for_students` TINYINT(1) NOT NULL DEFAULT 0,
    `number_of_classrooms_used` INT NOT NULL DEFAULT 0,
    `number_of_classrooms_inside` INT NOT NULL DEFAULT 0,
    `number_of_classrooms_outside` INT NOT NULL DEFAULT 0,
    `collegial_bodies` JSON NOT NULL COMMENT 'Array: [1=Conselho escolar, 2=Associação de pais e mestres, 3=Grêmio estudantil, 4=Outro]',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tenant_school_year` (`tenant_id`, `school_id`, `academic_year`),
    INDEX `idx_tenant_inep` (`tenant_id`, `inep_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dados de infraestrutura escolar para o Registro 00 do Censo';

-- ============================================================================
-- 3. Catálogo de Etapas de Ensino do INEP (Tabela Base e De/Para)
-- ============================================================================
CREATE TABLE `educa_censo_stages` (
    `id` CHAR(36) NOT NULL,
    `inep_stage_code` INT NOT NULL COMMENT 'Código oficial da etapa no Censo (ex: 1, 2, 14, 15, 25, 41)',
    `name` VARCHAR(255) NOT NULL,
    `education_level` ENUM('INFANTIL', 'FUNDAMENTAL', 'MEDIO', 'EJA', 'PROFISSIONAL', 'ESPECIAL') NOT NULL,
    `modality` ENUM('REGULAR', 'ESPECIAL', 'EJA', 'PROFISSIONAL') NOT NULL DEFAULT 'REGULAR',
    `min_age` TINYINT NULL COMMENT 'Idade mínima recomendada pelo INEP',
    `max_age` TINYINT NULL COMMENT 'Idade máxima recomendada pelo INEP',
    `is_multi_stage` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Indica turmas multietapas ou multi-série',
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_inep_stage_code` (`inep_stage_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo nacional de etapas de ensino homologadas pelo INEP';

-- ============================================================================
-- 4. De/Para de Cursos/Séries da Rede Municipal com as Etapas do INEP
-- ============================================================================
CREATE TABLE `educa_censo_course_stages` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `course_id` CHAR(36) NOT NULL,
    `grade_id` CHAR(36) NULL COMMENT 'Série/Ano escolar (NULL se o curso inteiro pertencer à etapa)',
    `censo_stage_id` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tenant_course_grade` (`tenant_id`, `course_id`, `grade_id`),
    INDEX `idx_tenant_censo_stage` (`tenant_id`, `censo_stage_id`),
    CONSTRAINT `fk_course_stages_stage` FOREIGN KEY (`censo_stage_id`) REFERENCES `educa_censo_stages` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vinculação de cursos e séries municipais às etapas do INEP';

-- ============================================================================
-- 5. De/Para de Componentes Curriculares da Rede com os Códigos do INEP
-- ============================================================================
CREATE TABLE `educa_censo_disciplines` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `discipline_id` CHAR(36) NOT NULL COMMENT 'FK para educa_curriculum_disciplines',
    `inep_discipline_code` INT NOT NULL COMMENT 'Código oficial INEP da disciplina (ex: 1=Química, 2=Física, 3=Matemática)',
    `knowledge_area` ENUM('LINGUAGENS', 'MATEMATICA', 'CIENCIAS_NATUREZA', 'CIENCIAS_HUMANAS', 'ENSINO_RELIGIOSO', 'ITINERARIO_FORMATIVO', 'PARTE_DIVERSIFICADA') NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tenant_discipline` (`tenant_id`, `discipline_id`),
    INDEX `idx_tenant_inep_discipline` (`tenant_id`, `inep_discipline_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mapeamento de disciplinas municipais para a codificação oficial INEP';

-- ============================================================================
-- 6. Repositório Central de Códigos Identificadores do INEP (Retorno do Censo)
-- ============================================================================
CREATE TABLE `educa_censo_inep_references` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `entity_type` ENUM('SCHOOL', 'CLASSROOM', 'STAFF', 'STUDENT') NOT NULL,
    `entity_id` CHAR(36) NOT NULL COMMENT 'ID local no SYSGOV (escola, turma, servidor ou aluno)',
    `inep_code` CHAR(12) NOT NULL COMMENT 'Identificador de até 12 dígitos gerado pelo INEP',
    `confirmed_academic_year` SMALLINT NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tenant_entity` (`tenant_id`, `entity_type`, `entity_id`),
    INDEX `idx_tenant_inep_lookup` (`tenant_id`, `entity_type`, `inep_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Identificadores oficiais atribuídos pelo INEP após processamento';

-- ============================================================================
-- 7. Log de Inconsistências e Pendências Cadastrais (Pré-Validador)
-- ============================================================================
CREATE TABLE `educa_censo_validation_issues` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `batch_id` CHAR(36) NOT NULL,
    `severity` ENUM('CRITICAL_BLOCKER', 'WARNING') NOT NULL DEFAULT 'CRITICAL_BLOCKER',
    `record_type` CHAR(2) NOT NULL COMMENT '00, 10, 20, 30, 40, 50, 60',
    `entity_type` ENUM('SCHOOL', 'CLASSROOM', 'STAFF', 'STUDENT', 'ENROLLMENT') NOT NULL,
    `entity_id` CHAR(36) NOT NULL,
    `field_name` VARCHAR(100) NOT NULL,
    `issue_code` VARCHAR(50) NOT NULL COMMENT 'Ex: CPF_REQUIRED, INVALID_AGE_FOR_STAGE, INEP_CODE_MISSING',
    `message` TEXT NOT NULL,
    `resolution_hint` TEXT NULL COMMENT 'Orientações amigáveis para o secretário escolar resolver o erro',
    `is_resolved` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_batch_severity` (`batch_id`, `severity`, `is_resolved`),
    INDEX `idx_tenant_entity_issue` (`tenant_id`, `entity_type`, `entity_id`),
    CONSTRAINT `fk_issues_batch` FOREIGN KEY (`batch_id`) REFERENCES `educa_censo_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auditoria de inconsistências prévias para validação do Censo';
```

---

## 3. Mapeamento De/Para dos Registros do Educacenso

A tabela abaixo detalha a equivalência entre os campos das tabelas legadas do i-Educar e o novo modelo modular `SYS-Educa`:

| Registro Censo | Campo INEP | Tabela Legada i-Educar | Campo Legado | Tabela SYSGOV (MySQL) | Campo Novo | Regra de Validação / Transformação |
|---|---|---|---|---|---|---|
| **00** | Tipo Registro | Fixo | `'00'` | `educa_censo_batches` | `batch_type` | Constante `'00'` |
| **00** | Código INEP Escola | `modules.educacenso_cod_escola` | `cod_escola_inep` | `educa_censo_school_configs` | `inep_code` | 8 dígitos numéricos obrigatórios |
| **00** | Situação Funcionamento | `pmieducar.escola` | `situacao_funcionamento` | `educa_censo_school_configs` | `operating_status` | 1=Em atividade, 2=Paralisada, 3=Extinta |
| **00** | CEP / Endereço | `cadastro.endereco_pessoa` | `cep`, `logradouro`, `numero` | `@sysgov/address` | `postal_code`, `street` | CEP normalizado (8 dígitos sem hífen) |
| **00** | Abastecimento de Água | `pmieducar.escola_complemento` | `agua_potavel`, `poco_artesiano` | `educa_censo_school_configs` | `water_supply` | JSON array com tipos selecionados |
| **00** | Energia Elétrica | `pmieducar.escola_complemento` | `energia_rede_publica`, `gerador` | `educa_censo_school_configs` | `energy_supply` | JSON array com matrizes energéticas |
| **00** | Acesso à Internet | `pmieducar.escola_complemento` | `acesso_internet` | `educa_censo_school_configs` | `internet_access` | 0=Não, 1=Sim |
| **10** | Cargo Gestor | `pmieducar.escola_gestor` | `cargo_gestor` | `educa_censo_batches` (subquery) | `manager_role` | 1=Diretor, 2=Outro cargo |
| **10** | CPF do Gestor | `cadastro.fisica` | `cpf` | `sysgov_people` | `cpf` | 11 dígitos, obrigatório e validado com algoritmo de módulo 11 |
| **20** | Código INEP Turma | `modules.educacenso_cod_turma` | `cod_turma_inep` | `educa_censo_inep_references` | `inep_code` | Até 12 dígitos, opcional para turmas novas |
| **20** | Nome da Turma | `pmieducar.turma` | `nm_turma` | `educa_school_classes` | `name` | Máx. 80 caracteres alfanuméricos |
| **20** | Horário Inicial/Final | `pmieducar.turma` | `hora_inicial`, `hora_final` | `educa_school_classes` | `start_time`, `end_time` | Formato `HH:MM` |
| **20** | Dias da Semana | `pmieducar.turma` | `dias_semana` | `educa_school_classes` | `week_days` | Array de flags [Segunda a Domingo] |
| **20** | Tipo de Atendimento | `pmieducar.turma` | `tipo_atendimento` | `educa_school_classes` | `service_type` | 1=Escolarização, 2=AEE, 3=Ativ. Complementar |
| **20** | Etapa Agregada INEP | `modules.etapas_curso_educacenso`| `etapa_educacenso_id` | `educa_censo_course_stages` | `censo_stage_id` | Código da etapa INEP (ex: 14, 15, 25, 41) |
| **30** | CPF do Professor | `cadastro.fisica` | `cpf` | `sysgov_people` | `cpf` | Obrigatório para todos os profissionais |
| **30** | Escolaridade / Curso | `modules.educacenso_curso_superior`| `curso_superior_id` | `educa_staff_education` | `higher_education_code` | Código INEP do curso superior de formação |
| **40** | Turma Lecionada | `pmieducar.servidor_alocacao` | `ref_cod_turma` | `educa_class_teachers` | `school_class_id` | Vinculação ativa na data de referência |
| **40** | Disciplina Ministrada | `modules.componente_curricular` | `codigo_educacenso` | `educa_censo_disciplines` | `inep_discipline_code` | Código oficial da Base Nacional Comum |
| **50** | Identificação Aluno | `cadastro.fisica` | `nome`, `data_nasc`, `sexo` | `sysgov_people` | `full_name`, `birth_date` | Nome civil idêntico à base da Receita/Certidão |
| **50** | Certidão de Nascimento | `cadastro.certidao_nascimento` | `numero_termo`, `livro`, `folha` | `sysgov_civil_certificates` | `certificate_matricula` | Padrão unificado de 32 dígitos (CNJ) |
| **60** | Matrícula / Turma | `pmieducar.matricula_turma` | `ref_cod_matricula` | `educa_enrollments` | `id` | Matrícula ativa na última 4ª de maio |
| **60** | Transporte Público | `modules.pessoa_transporte` | `utiliza_transporte` | `educa_transport_students` | `is_active` | 0=Não, 1=Sim |
| **60** | Poder Público Transp. | `pmieducar.aluno` | `poder_publico_responsavel` | `educa_transport_routes` | `public_authority` | 1=Estadual, 2=Municipal |
| **60** | Modal de Transporte | `modules.veiculo` | `tipo_veiculo` | `educa_transport_vehicles` | `vehicle_type` | Códigos INEP (Van, Ônibus, Embarcação, etc.) |
| **99** | Totalizador de Linhas | Calculado no streaming | Contador de registros | `educa_censo_batches` | `total_records_*` | Fechamento do arquivo posicional |

---

## 4. Endpoints RESTful no Laravel 13 (`apps/api`)

Os controllers do módulo são implementados sob `apps/api/modules/Educa/Http/Controllers/Censo/`:

```
POST   /api/v1/educa/censo/batches                       -> CensoBatchController@store (Inicia novo lote de exportação)
GET    /api/v1/educa/censo/batches                       -> CensoBatchController@index (Lista histórico de lotes gerados)
GET    /api/v1/educa/censo/batches/{id}                  -> CensoBatchController@show (Detalhes do lote e estatísticas)
POST   /api/v1/educa/censo/batches/{id}/validate         -> CensoValidationController@validateBatch (Dispara pré-validação)
GET    /api/v1/educa/censo/batches/{id}/issues           -> CensoValidationController@listIssues (Lista pendências cadastrais)
POST   /api/v1/educa/censo/batches/{id}/generate         -> CensoBatchController@generateFile (Dispara job de exportação do .txt)
GET    /api/v1/educa/censo/batches/{id}/download         -> CensoBatchController@downloadFile (Download com conferência SHA-256)
POST   /api/v1/educa/censo/batches/{id}/import-return    -> CensoBatchController@importReturnFile (Processa retorno do INEP)
GET    /api/v1/educa/censo/mappings/stages               -> CensoMappingController@getStages (Catálogo de etapas INEP)
PUT    /api/v1/educa/censo/mappings/stages               -> CensoMappingController@updateCourseStages (Salva de/para de etapas)
GET    /api/v1/educa/censo/mappings/disciplines          -> CensoMappingController@getDisciplines (Catálogo de disciplinas INEP)
PUT    /api/v1/educa/censo/mappings/disciplines          -> CensoMappingController@updateDisciplines (Salva de/para de disciplinas)
```

---

## 5. Contratos TypeScript para o `@sysgov/sdk`

```typescript
export type CensoBatchStatus = 
  | 'DRAFT' 
  | 'VALIDATING' 
  | 'VALIDATED_WITH_ERRORS' 
  | 'VALIDATED_READY' 
  | 'GENERATING' 
  | 'GENERATED' 
  | 'SENT_INEP' 
  | 'IMPORTED_RETURN';

export type CensoIssueSeverity = 'CRITICAL_BLOCKER' | 'WARNING';

export interface CensoBatch {
  id: string;
  tenant_id: string;
  school_id: string | null;
  school_name?: string;
  academic_year: number;
  reference_date: string;
  batch_type: 'INITIAL_ENROLLMENT' | 'SCHOOL_SITUATION';
  status: CensoBatchStatus;
  file_path: string | null;
  file_hash_sha256: string | null;
  record_counts: {
    record_00: number;
    record_10: number;
    record_20: number;
    record_30: number;
    record_40: number;
    record_50: number;
    record_60: number;
    record_99: number;
  };
  total_errors: number;
  total_warnings: number;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CensoValidationIssue {
  id: string;
  batch_id: string;
  severity: CensoIssueSeverity;
  record_type: '00' | '10' | '20' | '30' | '40' | '50' | '60';
  entity_type: 'SCHOOL' | 'CLASSROOM' | 'STAFF' | 'STUDENT' | 'ENROLLMENT';
  entity_id: string;
  entity_name?: string;
  field_name: string;
  issue_code: string;
  message: string;
  resolution_hint: string | null;
  is_resolved: boolean;
  created_at: string;
}

export interface CensoStageMapping {
  course_id: string;
  course_name: string;
  grade_id: string | null;
  grade_name: string | null;
  censo_stage_id: string;
  inep_stage_code: number;
  inep_stage_name: string;
}

export interface CensoDisciplineMapping {
  discipline_id: string;
  discipline_name: string;
  inep_discipline_code: number;
  knowledge_area: string;
}
```

---

## 6. Requisitos de UI no `@sysgov/ui`

Para os painéis `apps/web` (Painel Administrativo Municipal) e `apps/web-client` (Secretaria de Educação Escolar):

1. **Stepper do Ciclo do Censo Escolar:**
   - **Etapa 1: Configurações & Mapeamento:** Painel com alertas caso existam cursos ou componentes curriculares sem mapeamento no INEP.
   - **Etapa 2: Auditoria Prévia (Validador):** Exibição em tabela com paginação e busca por tipo de inconsistência, separando em duas abas:
     - 🔴 **Bloqueadores Críticos (Impeditivos):** Alunos sem CPF/certidão, turmas sem dias da semana preenchidos, professores sem vínculo funcional. Botão com link direto para o cadastro do aluno/turma facilitando a correção instantânea.
     - 🟡 **Avisos Informativos:** Discrepâncias de faixa etária vs série cursada que exigem justificativa do gestor.
   - **Etapa 3: Geração & Download:** Barra de progresso em tempo real (via SSE ou Polling de status do Job), exibição do resumo quantitativo de alunos e turmas e botão de download do `.txt` acompanhado da hash SHA-256 para confronto de integridade.
   - **Etapa 4: Retorno do INEP:** Dropzone de upload do arquivo gerado pelo sistema Educacenso após homologação, atualizando automaticamente os IDs de 12 dígitos dos alunos e escolas na base de dados.
2. **Tipografia e Cores:**
   - Dados técnicos (código INEP, SHA-256, códigos de etapas e CPF) rigorosamente em **JetBrains Mono**.
   - Badges de severidade padronizados: vermelho para `CRITICAL_BLOCKER` e amarelo para `WARNING`.
