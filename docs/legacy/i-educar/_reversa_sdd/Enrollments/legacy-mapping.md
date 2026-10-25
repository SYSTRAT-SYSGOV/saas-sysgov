# Mapeamento Legado — Módulo Enrollments (Matrículas, Enturmações e Transferências)

> **Módulo:** `Registration` e `Enrollments` (Matrículas, Enturmações, Remanejamento, Transferências e Reclassificação)  
> **Sistema Destino:** `SYS-Educa` (`apps/api` - Laravel 13 / `apps/web-client` - React 19)  
> **Status:** Concluído / Pronto para Implementação

---

## 1. Visão Geral e Arquitetura no SYSGOV

O ciclo de vida do estudante na rede municipal articula-se em duas camadas complementares:
1. **Matrícula (`educa_registrations` / `pmieducar.matricula`):** Vínculo acadêmico formal e contratual do estudante com o município/escola em um determinado ano letivo, curso e série. Controla a situação pedagógica final (`APPROVED`, `REPROVED`, `TRANSFERRED`, etc.).
2. **Enturmação (`educa_enrollments` / `pmieducar.matricula_turma`):** Alocação física e espacial do aluno dentro de uma turma regular ou turma de Atendimento Educacional Especializado (AEE / Contraturno), gerando número de chamada no diário de classe e controlando datas de entrada e saída.

A transferência pode ser interna (entre escolas da rede) ou externa (de/para outras redes ou estados), disparando mecanismos automáticos de portabilidade de avaliações, notas e faltas (`TransferRegistrationDataService`).

---

## 2. Tabelas Legadas do i-Educar

| Tabela Legada | Descrição no Legado | Destino no SYSGOV |
| :--- | :--- | :--- |
| `pmieducar.matricula` | Registro do contrato acadêmico do estudante na escola/ano/série | `educa_registrations` |
| `pmieducar.matricula_turma` | Alocação física do estudante na turma, controle de data de entrada/saída e número | `educa_enrollments` |
| `pmieducar.transferencia_solicitacao` | Solicitações e guias de transferência com justificativas e parecer | `educa_transfer_requests` |
| `pmieducar.transferencia_tipo` | Catálogo de tipos/motivos de transferência (mudança de residência, conveniência, etc.) | `educa_transfer_types` |
| `pmieducar.abandono_tipo` | Catálogo de motivos declarados de evasão/abandono escolar (trabalho infantil, etc.) | `educa_dropout_reasons` |
| `pmieducar.reclassificacao` | Registro formal de avanço ou readequação de série por comissão pedagógica | `educa_reclassifications` |
| `pmieducar.matricula_turma_disciplina` | Dispensa ou itinerário formativo específico do aluno na turma | `educa_enrollment_disciplines` |

---

## 3. Regras de Negócio Críticas e Algoritmos Legados

### 3.1 Máquina de Situações da Matrícula (`MatriculaSituacao`)
O ciclo de vida acadêmico é governado por transições de estado estritas:
1. **`PRE_ENROLLED` (11 - Pré-matrícula):** Aluno aguarda confirmação documental; não consome vaga definitiva nem permite lançamento de notas no diário.
2. **`ACTIVE` (3 - Em Andamento):** Matrícula regular confirmada; alocada ou aguardando enturmação.
3. **`IN_EXAM` (7 - Em Exame):** Aluno não alcançou média direta no fechamento anual e realiza recuperação final.
4. **`APPROVED` (1) / `APPROVED_AFTER_EXAM` (8) / `APPROVED_DEPENDENCY` (12) / `APPROVED_COUNCIL` (13):** Conclusão pedagógica positiva.
5. **`REPROVED` (2) / `REPROVED_ABSENCE` (14):** Conclusão pedagógica negativa (por média insuficiente ou faltas acumuladas > 25%).
6. **`TRANSFERRED` (4):** Encerramento por transferência escolar com emissão de guia.
7. **`RECLASSIFIED` (5):** Encerramento com remanejamento de série decorrente de avaliação diagnóstica.
8. **`DROPOUT` (6):** Evasão escolar após esgotamento de busca ativa e prazos do Conselho Tutelar.
9. **`DECEASED` (15) / `CANCELLED`:** Encerramentos administrativos especiais.

### 3.2 Algoritmo de Enturmação (`EnrollmentService`)
Para alocar o estudante em uma turma (`educa_enrollments`), o serviço executa 4 validações atômicas:
1. **Validação de Vagas (`NoVacancyException`):**
   - Se o parâmetro institucional `bloquear_enturmacao_sem_vagas == 1`:
   - `total_vagas_ocupadas = COUNT(educa_enrollments WHERE active = true)`.
   - Se `total_vagas_ocupadas >= max_students`, bloqueia a enturmação.
2. **Limites do Ano Letivo:**
   - A `entry_date` (data de entrada) não pode ser anterior ao início do ano letivo da escola, nem posterior à data de término.
3. **Inversão Cronológica:**
   - Em caso de saída (`exit_date`), `exit_date >= entry_date`.
4. **Conflito de Horários (`AvailableTimeService`):**
   - Não permite duas enturmações regulares sobrepostas no mesmo turno/horário. Alunos com AEE (Atendimento Educacional Especializado) possuem exceção legal permitida no contraturno.

### 3.3 Sequenciamento e Número de Chamada (`SequencialEnturmacao`)
- A ordenação da lista de presença e do diário de classe é recalculada pelo serviço de sequenciamento.
- Critério: Alunos enturmados ativos na turma, ordenados alfabeticamente pelo nome social/civil do estudante.
- **Data de Corte do Censo (`relocation_date`):**
  - Enturmações criadas após o início do ano letivo recebem sequencial ao final da lista (ou reordenam tudo conforme configuração da rede).
  - Alunos transferidos mantêm o registro da ordem original caso a turma já tenha sido congelada para o Censo Escolar.

### 3.4 Portabilidade Atômica de Avaliações (`TransferRegistrationDataService`)
Ao aceitar uma transferência entre turmas ou escolas da mesma rede municipal:
1. O sistema verifica a paridade da regra avaliativa (`hasSameStages`).
2. Se ambas as turmas utilizam o mesmo número de etapas (ex: 4 bimestres):
   - `CopyScoreService`: Clona todas as notas lançadas até a data da transferência para a nova matrícula (`educa_discipline_scores`).
   - `CopyAbsenceService`: Clona os registros consolidados de faltas (`educa_discipline_absences`).
   - `CopyDescriptiveOpinionService`: Clona pareceres descritivos pedagógicos já assinados.
3. Se a estrutura divergir (ex: escola A com 3 trimestres e escola B com 4 bimestres), o sistema não faz a cópia cega: emite alerta de **Adaptação Curricular Obrigatória**, abrindo tela de equivalência para o coordenador pedagógico.

### 3.5 Remanejamento Interno de Turma (`relocate`)
- Quando o aluno apenas muda de turma dentro da mesma escola (ex: Turma A para Turma B do 4º Ano):
- A matrícula original (`educa_registrations`) **permanece ativa e inalterada**.
- A enturmação antiga em `educa_enrollments` é finalizada (`active = false`, `exit_date = data_remanejamento`).
- Uma nova enturmação é aberta na turma de destino (`active = true`, `entry_date = data_remanejamento`).
- As notas e faltas permanecem vinculadas à matrícula original, adaptando-se apenas a eventual troca de professor.

---

## 4. Schema Proposto no SYSGOV (`SYS-Educa`)

### 4.1 Tabela `educa_registrations` (Matrículas)
```sql
CREATE TABLE educa_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES sysgov_tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES educa_students(id) ON DELETE RESTRICT,
    school_id UUID NOT NULL REFERENCES educa_schools(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES educa_academic_years(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL REFERENCES educa_courses(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES educa_grades(id) ON DELETE RESTRICT,
    
    registration_number VARCHAR(50) NOT NULL, -- Código único de matrícula gerado pelo sistema
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    departure_date DATE,
    
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- PRE_ENROLLED, ACTIVE, APPROVED, REPROVED, IN_EXAM, APPROVED_AFTER_EXAM, APPROVED_DEPENDENCY, APPROVED_COUNCIL, REPROVED_ABSENCE, TRANSFERRED, RECLASSIFIED, DROPOUT, DECEASED, CANCELLED
    
    requires_special_education BOOLEAN NOT NULL DEFAULT FALSE,
    repeater BOOLEAN NOT NULL DEFAULT FALSE, -- Aluno repetente na série
    dropout_reason_id UUID REFERENCES educa_dropout_reasons(id),
    dropout_observations TEXT,
    
    cancellation_date DATE,
    cancellation_reason TEXT,
    cancelled_by_user_id UUID REFERENCES sysgov_users(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_student_year_grade UNIQUE (tenant_id, student_id, academic_year_id, grade_id, deleted_at)
);

CREATE INDEX idx_educa_reg_tenant_school_year ON educa_registrations(tenant_id, school_id, academic_year_id);
CREATE INDEX idx_educa_reg_student ON educa_registrations(student_id);
CREATE INDEX idx_educa_reg_status ON educa_registrations(status);
```

### 4.2 Tabela `educa_enrollments` (Enturmações Físicas)
```sql
CREATE TABLE educa_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES sysgov_tenants(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES educa_registrations(id) ON DELETE CASCADE,
    school_class_id UUID NOT NULL REFERENCES educa_school_classes(id) ON DELETE RESTRICT,
    
    call_number INT, -- Número de chamada do diário de classe
    entry_date DATE NOT NULL,
    exit_date DATE,
    
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_aee BOOLEAN NOT NULL DEFAULT FALSE, -- Atendimento Educacional Especializado (Contraturno)
    
    relocated_from_enrollment_id UUID REFERENCES educa_enrollments(id),
    relocation_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_educa_enroll_class_active ON educa_enrollments(school_class_id, active);
CREATE INDEX idx_educa_enroll_reg ON educa_enrollments(registration_id);
```

### 4.3 Tabela `educa_transfer_requests` (Solicitações e Guias de Transferência)
```sql
CREATE TABLE educa_transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES sysgov_tenants(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES educa_registrations(id) ON DELETE RESTRICT,
    
    origin_school_id UUID NOT NULL REFERENCES educa_schools(id) ON DELETE RESTRICT,
    destination_school_id UUID REFERENCES educa_schools(id) ON DELETE SET NULL, -- Nulo se externa à rede
    destination_school_name VARCHAR(255), -- Preenchido se transferência externa
    destination_city VARCHAR(100),
    destination_state VARCHAR(2),
    
    transfer_type_id UUID NOT NULL REFERENCES educa_transfer_types(id),
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_date DATE,
    
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, CANCELLED
    cancellation_reason TEXT,
    observations TEXT,
    
    requested_by_user_id UUID NOT NULL REFERENCES sysgov_users(id),
    accepted_by_user_id UUID REFERENCES sysgov_users(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_educa_transfers_tenant ON educa_transfer_requests(tenant_id, status);
CREATE INDEX idx_educa_transfers_reg ON educa_transfer_requests(registration_id);
```

### 4.4 Tabelas de Domínio e Apoio
```sql
-- Motivos de Transferência
CREATE TABLE educa_transfer_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES sysgov_tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Motivos de Evasão / Abandono
CREATE TABLE educa_dropout_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES sysgov_tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Reclassificação
CREATE TABLE educa_reclassifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES sysgov_tenants(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES educa_registrations(id) ON DELETE CASCADE,
    previous_grade_id UUID NOT NULL REFERENCES educa_grades(id),
    new_grade_id UUID NOT NULL REFERENCES educa_grades(id),
    
    reclassification_date DATE NOT NULL DEFAULT CURRENT_DATE,
    opinion_number VARCHAR(100), -- Parecer pedagógico / Ata da comissão
    justification TEXT NOT NULL,
    authorized_by_user_id UUID NOT NULL REFERENCES sysgov_users(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## 5. Contratos de API REST (Laravel 13 — `apps/api`)

| Método | Endpoint | Descrição | Permissão |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/educa/registrations` | Listar matrículas com filtros de escola, ano, série e status | `educa.registrations.read` |
| `POST` | `/api/v1/educa/registrations` | Criar nova matrícula de estudante | `educa.registrations.create` |
| `GET` | `/api/v1/educa/registrations/{id}` | Detalhes completos da matrícula e histórico de enturmações | `educa.registrations.read` |
| `PUT` | `/api/v1/educa/registrations/{id}/status` | Alterar situação pedagógica manualmente (Conselho/Admin) | `educa.registrations.manage` |
| `POST` | `/api/v1/educa/registrations/{id}/cancel` | Cancelar matrícula com registro de justificativa | `educa.registrations.cancel` |
| `POST` | `/api/v1/educa/enrollments` | Enturmar estudante em turma física com validação de vaga | `educa.enrollments.manage` |
| `DELETE` | `/api/v1/educa/enrollments/{id}` | Desenturmar estudante de turma física | `educa.enrollments.manage` |
| `POST` | `/api/v1/educa/enrollments/{id}/relocate` | Remanejar estudante para outra turma da mesma série/escola | `educa.enrollments.manage` |
| `POST` | `/api/v1/educa/enrollments/school-classes/{classId}/reorder` | Recalcular números de chamada alfabéticos da turma | `educa.enrollments.manage` |
| `POST` | `/api/v1/educa/transfers/requests` | Solicitar emissão de guia de transferência | `educa.transfers.request` |
| `POST` | `/api/v1/educa/transfers/requests/{id}/accept` | Aceitar transferência com portabilidade automática de notas | `educa.transfers.accept` |
| `POST` | `/api/v1/educa/registrations/{id}/reclassify` | Registrar reclassificação de série do aluno | `educa.registrations.reclassify` |

---

## 6. Especificações de UI/UX no SYSGOV (`@sysgov/ui` / React 19)

1. **Quadro de Enturmação Visual (Drag-and-Drop ou Listas de Seleção):**
   - Na tela da turma, visualização em tempo real de `Vagas Ocupadas / Capacidade Máxima` com barra de progresso do `@sysgov/ui`.
   - Lista de estudantes não enturmados da série com busca rápida e botão de enturmação em lote.
2. **Histórico da Trajetória do Aluno (Timeline Component):**
   - No prontuário do estudante, exibe uma linha do tempo cronológica com cada evento:
     - *"10/02/2026: Matrícula iniciada no 4º Ano A"*
     - *"15/04/2026: Remanejado para o 4º Ano B (Profª Regina)"*
     - *"12/08/2026: Transferência solicitada para Escola EMEF Darcy Ribeiro"*
3. **Assistente de Portabilidade de Transferência:**
   - Ao receber aluno transferido, o assistente compara as matrizes curriculares e disciplinas cursadas, destacando as notas migradas em verde e disciplinas pendentes de adaptação curricular em amarelo.
