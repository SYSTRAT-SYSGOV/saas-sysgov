# Mapeamento do Módulo: HistoricoEscolar (Vida Pregressa e Histórico Escolar Oficial)

> Mapeamento de engenharia reversa do i-Educar para o módulo **`SYS-Educa`** no ecossistema multi-tenant **SYSGOV**.

---

## 1. Visão Geral e Contexto Regulatório

O módulo **Histórico Escolar** consolida a trajetória educacional do estudante ao longo de sua vida acadêmica. Ele atende a dois propósitos fundamentais da legislação educacional brasileira (LDB nº 9.394/96):
1. **Vida Pregressa (Registros Anteriores/Externos):** Lançamento manual pela secretaria escolar das séries, etapas, disciplinas e notas cursadas pelo aluno em outras redes municipais, estaduais, privadas ou anos anteriores à informatização.
2. **Consolidação Anual Permanente (Assentamento Notarial):** Congelamento imutável das notas, frequências, faltas e situação final obtidas nas matrículas do próprio sistema no término do ano letivo, lavrado com número de **Livro**, **Folha** e **Registro de Arquivo**.

---

## 2. Modelagem de Dados no SYSGOV (PostgreSQL 16+)

### 2.1 Tabela: `educa_school_histories`
Armazena a certidão/etapa anual cursada pelo estudante.

```sql
CREATE TABLE educa_school_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES educa_students(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES educa_registrations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES educa_schools(id) ON DELETE SET NULL,
    
    -- Metadados de Sequência e Ordenamento Temporal
    sequence_order INT NOT NULL, -- Sequencial cronológico da vida do aluno (1, 2, 3...)
    calendar_year INT NOT NULL, -- Ano letivo (ex: 2024)
    matrix_position INT, -- Coluna correspondente no modelo impresso oficial (ex: 1 = 1º Ano, 9 = 9º Ano)
    grade_stage_type VARCHAR(20) NOT NULL DEFAULT 'grade_year', -- 'grade_year' (Anos 9), 'grade_series' (Séries 8), 'eja'
    
    -- Identificação Escolar (interna ou externa)
    school_name VARCHAR(255) NOT NULL,
    school_city VARCHAR(150),
    school_state VARCHAR(2),
    
    -- Curso e Etapa
    course_name VARCHAR(255) NOT NULL,
    grade_name VARCHAR(255) NOT NULL,
    
    -- Métricas e Cargas Horárias
    total_workload INT, -- Carga horária total da série em horas
    school_days INT, -- Dias letivos cumpridos (mínimo legal: 200)
    attendance_rate NUMERIC(5, 2), -- Frequência percentual (0.00 a 100.00)
    global_absences INT, -- Faltas globalizadas (se aplicável)
    
    -- Situação Final do Aluno
    final_status VARCHAR(30) NOT NULL, -- 'approved', 'reproved', 'reproved_by_absence', 'ongoing', 'transferred', 'abandoned', 'approved_with_dependency'
    is_extra_curricular BOOLEAN NOT NULL DEFAULT FALSE,
    is_acceleration BOOLEAN NOT NULL DEFAULT FALSE,
    is_dependency BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Assentamento Notarial / Livro de Registros da Secretaria
    registry_number VARCHAR(50), -- Número do registro no arquivo escolar
    book_number VARCHAR(50), -- Livro de assentamento
    page_number VARCHAR(50), -- Folha do livro
    
    -- Origem e Observações Oficiais
    origin_type VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'system' (processamento automático) ou 'manual' (vida pregressa externa)
    official_observations TEXT,
    
    -- Auditoria e Rastreabilidade
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES core_users(id),
    updated_by UUID REFERENCES core_users(id),
    deleted_by UUID REFERENCES core_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT uq_school_history_student_seq UNIQUE (tenant_id, student_id, sequence_order)
);

CREATE INDEX idx_educa_histories_student ON educa_school_histories(tenant_id, student_id);
CREATE INDEX idx_educa_histories_reg ON educa_school_histories(tenant_id, registration_id);
CREATE INDEX idx_educa_histories_year ON educa_school_histories(tenant_id, calendar_year);
```

### 2.2 Tabela: `educa_school_history_disciplines`
Armazena os componentes curriculares, notas e faltas que compõem o histórico escolar daquela etapa.

```sql
CREATE TABLE educa_school_history_disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
    school_history_id UUID NOT NULL REFERENCES educa_school_histories(id) ON DELETE CASCADE,
    
    -- Disciplina e Agrupamento
    discipline_name VARCHAR(255) NOT NULL, -- Nome oficial do componente curricular
    knowledge_area_id UUID REFERENCES educa_knowledge_areas(id) ON DELETE SET NULL,
    base_type VARCHAR(20) NOT NULL DEFAULT 'bncc', -- 'bncc' (Base Nacional Comum) ou 'diversified' (Parte Diversificada)
    display_order INT NOT NULL DEFAULT 1,
    
    -- Avaliação e Carga Horária
    final_score VARCHAR(20), -- Suporta nota numérica ('8.5'), conceito ('A', 'B') ou 'Disp' (dispensada)
    numeric_score NUMERIC(5, 2), -- Valor numérico normalizado para relatórios estatísticos
    absences INT DEFAULT 0,
    discipline_workload INT,
    
    -- Modalidade Especial
    is_dependency BOOLEAN NOT NULL DEFAULT FALSE,
    is_global_average BOOLEAN NOT NULL DEFAULT FALSE, -- Flag para linha de Média Geral da etapa
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_educa_hist_disc_history ON educa_school_history_disciplines(tenant_id, school_history_id);
CREATE INDEX idx_educa_hist_disc_order ON educa_school_history_disciplines(tenant_id, school_history_id, display_order);
```

---

## 3. Endpoints da API no SYSGOV (`apps/api` - Laravel 13)

Prefixos sob `api/v1/educa/school-histories`:

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/students/{studentId}/histories` | Lista a vida pregressa completa e etapas processadas do estudante ordenadas cronologicamente. |
| `POST` | `/students/{studentId}/histories/manual` | Cadastra etapa manual de vida pregressa (escola externa, ano, disciplinas e notas). |
| `PUT` | `/histories/{historyId}` | Atualiza etapa do histórico escolar (notas, livro, folha, registro, observações). |
| `DELETE` | `/histories/{historyId}` | Soft delete de uma etapa do histórico (com registro de quem excluiu). |
| `POST` | `/classes/{classId}/batch-process` | Processa e consolida o fechamento anual da turma inteira no histórico permanente. |
| `POST` | `/registrations/{registrationId}/process` | Processa o histórico escolar individual de uma matrícula concluída. |
| `PUT` | `/histories/{historyId}/notary-record` | Atualiza especificamente os dados notariais (Livro, Folha, Registro). |
| `GET` | `/students/{studentId}/official-transcript-pdf` | Emite o documento oficial timbrado de Histórico Escolar com assinatura e chancela digital. |

---

## 4. Tipos e Contratos TypeScript (`@sysgov/sdk`)

```typescript
export type GradeStageType = 'grade_year' | 'grade_series' | 'eja';
export type CurriculumBaseType = 'bncc' | 'diversified';
export type HistoryOriginType = 'system' | 'manual';

export interface SchoolHistoryDisciplineDTO {
  id: string;
  schoolHistoryId: string;
  disciplineName: string;
  knowledgeAreaId?: string;
  baseType: CurriculumBaseType;
  displayOrder: number;
  finalScore?: string; // "8.5", "A", "Disp", "-"
  numericScore?: number;
  absences?: number;
  disciplineWorkload?: number;
  isDependency: boolean;
  isGlobalAverage: boolean;
}

export interface SchoolHistoryDTO {
  id: string;
  tenantId: string;
  studentId: string;
  registrationId?: string;
  schoolId?: string;
  sequenceOrder: number;
  calendarYear: number;
  matrixPosition?: number;
  gradeStageType: GradeStageType;
  schoolName: string;
  schoolCity?: string;
  schoolState?: string;
  courseName: string;
  gradeName: string;
  totalWorkload?: number;
  schoolDays?: number;
  attendanceRate?: number;
  globalAbsences?: number;
  finalStatus: string;
  isExtraCurricular: boolean;
  isAcceleration: boolean;
  isDependency: boolean;
  registryNumber?: string;
  bookNumber?: string;
  pageNumber?: string;
  originType: HistoryOriginType;
  officialObservations?: string;
  disciplines: SchoolHistoryDisciplineDTO[];
}
```

---

## 5. Interface com o Usuário (`@sysgov/ui` / React 19)

### 5.1 Visão em Matriz Curricular (Grade Histórica)
- O painel exibe uma **tabela matricial dinâmica** onde:
  - **Linhas:** Componentes Curriculares agrupados por Base Nacional Comum (BNCC) e Parte Diversificada.
  - **Colunas:** As etapas/séries cursadas ao longo dos anos (ex: 1º Ano/2016, 2º Ano/2017... 9º Ano/2024).
  - **Células:** Nota final e faltas, destacando dispensas legais (`Disp`) e situação de aprovação.
  - **Rodapé:** Carga horária total, dias letivos, frequência (%) e dados de Livro/Folha/Registro.

### 5.2 Formulário de Vida Pregressa
- Modal padronizado com autocompletar de municípios brasileiros (`IBGE`), digitação livre de escola externa e grade dinâmica de disciplinas com botão de adição em lote de componentes comuns.
