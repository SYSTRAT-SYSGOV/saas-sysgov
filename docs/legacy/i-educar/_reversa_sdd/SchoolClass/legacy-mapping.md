# Mapeamento Legado — Módulo SchoolClass (Turmas, Turnos, Multiseriadas e Docentes)

> **Módulo:** `SchoolClass` (Turmas, Turnos, Matriz de Enturmação e Alocação Docente)  
> **Sistema Destino:** `SYS-Educa` (`apps/api` - Laravel 13 / `apps/web-client` - React 19)  
> **Status:** Concluído / Pronto para Implementação

---

## 1. Visão Geral e Arquitetura no SYSGOV

A **Turma** (`educa_school_classes`) é a unidade física, espacial e temporal onde ocorre o processo pedagógico. Ela amarra:
1. Uma **Escola** (`educa_schools`).
2. Um **Ano Letivo** (`academic_year`).
3. Um **Curso** e uma ou mais **Séries** (em caso de turmas multisseriadas).
4. Um **Turno** (`educa_periods`) e seus horários (início, fim e intervalos).
5. Uma **Capacidade Máxima de Alunos** (`max_students`).
6. O **Corpo Docente Alocado** (`educa_class_teachers`), com suas respectivas disciplinas e autorizações de diário de classe.

---

## 2. Tabelas Legadas do i-Educar

| Tabela Legada | Descrição no Legado | Destino no SYSGOV |
| :--- | :--- | :--- |
| `pmieducar.turma` | Entidade central da turma física no ano | `educa_school_classes` |
| `pmieducar.turma_turno` | Cadastro dos turnos de funcionamento (Matutino, Vespertino, etc.) | `educa_periods` |
| `pmieducar.turma_serie` | Vínculo de séries à turma (imprescindível para multisseriadas) | `educa_class_grades` |
| `modules.professor_turma` | Alocação de professores na turma com tipo de vínculo | `educa_class_teachers` |
| `modules.professor_turma_disciplina` | Disciplinas específicas ministradas pelo professor na turma | `educa_class_teacher_subjects` |
| `modules.educacenso_cod_turma` | Código INEP da turma gerado ou migrado pelo Censo Escolar | `educa_class_inep` / atributo em `educa_school_classes` |
| `pmieducar.turma_modulo` | Etapas do calendário letivo específicas da turma (se não padrão) | `educa_school_class_stages` |

---

## 3. Regras de Negócio Críticas e Algoritmos Legados

### 3.1 Algoritmo de Detecção de Choque de Horários (`AvailableTimeService`)
O aluno não pode estar enturmado em horários coincidentes. O algoritmo legado implementa a seguinte lógica estrita:
1. **Exceção Legal de AEE:** Se uma turma for de **Escolarização Regular** e a outra for de **Atendimento Educacional Especializado (AEE)** no contraturno, a coexistência de matrículas é permitida.
2. **Dias da Semana:** Verifica a intersecção entre `dias_semana` da Turma A e da Turma B. Se não compartilharem nenhum dia útil, não há conflito.
3. **Vigência do Calendário:** Compara se as datas de início e término do ano letivo das duas turmas se sobrepõem (`between`).
4. **Sobreposição de Horários:**
   - Compara se `hora_inicial_A <= hora_final_B` e `hora_final_A >= hora_inicial_B`.
   - Se uma das turmas for de **Turno Integral** (`Period::FULLTIME`) e a outra de turno parcial, o sistema desdobra o horário integral nos subperíodos matutino (`hora_inicial_matutino` a `hora_final_matutino`) ou vespertino para validar se o aluno está alocado apenas em um turno parcial.

### 3.2 Trava de Criação de Turmas com Vagas Ociosas (`CanCreateSchoolClass`)
- Se a série da escola possuir o parâmetro `bloquear_cadastro_turma_para_serie_com_vagas == 1`:
- O sistema varre todas as turmas ativas da mesma série, escola, ano letivo e turno.
- Para cada turma, calcula: `vagas = max_aluno - total_matriculas_ativas`.
- Se qualquer turma existente ainda possuir $vagas > 0$, **a criação de uma nova turma é bloqueada**, retornando erro amigável ao gestor:
  > *"Não é possível cadastrar turmas, pois ainda existem X vagas em aberto na turma 'Y' desta série e turno."*

### 3.3 Trava de Exclusão de Turma (`CanDeleteTurma`)
- Turmas que possuam enturmações ativas (`getActiveEnrollments()->count() > 0`) não podem ser excluídas.
- A exclusão no legado é lógica: `ativo = 0`, `visivel = 0`, `data_exclusao = now()`.

### 3.4 Turmas Multisseriadas (`pmieducar.turma_serie`)
- Uma turma física (`multiseriada = true`) pode agregar alunos de diferentes séries (ex: 1º e 2º ano do Ensino Fundamental na zona rural).
- Cada série vinculada possui sua própria linha em `pmieducar.turma_serie`, podendo inclusive ter modelos de avaliação/boletins diferentes (`boletim_id` e `boletim_diferenciado_id`).
- Na enturmação do aluno, a matrícula aponta para a turma física e identifica a série correspondente daquele aluno.

### 3.5 Alocação Docente e Diário de Classe (`modules.professor_turma`)
- O vínculo do servidor docente com a turma registra:
  - `tipo_vinculo`: Efetivo (1), Temporário (2), Terceirizado (3), CLT (4).
  - `funcao_exercida`: Docente titular, docente auxiliar, monitor, intérprete de Libras.
  - `permite_lancar_faltas_componente`: Booleano que delega permissão de lançamento de faltas/notas no diário eletrônico por disciplina.

---

## 4. Schema Proposto no SYSGOV (`SYS-Educa`)

```sql
-- Turnos escolares (Matutino, Vespertino, Noturno, Integral)
CREATE TABLE educa_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- Matutino, Vespertino, Noturno, Integral
    default_start_time TIME NOT NULL,
    default_end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Turmas
CREATE TABLE educa_school_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES educa_schools(id) ON DELETE CASCADE,
    academic_year INT NOT NULL,
    course_id UUID NOT NULL REFERENCES educa_courses(id) ON DELETE RESTRICT,
    grade_id UUID REFERENCES educa_grades(id) ON DELETE RESTRICT, -- Nulo ou série principal se multisseriada
    period_id UUID NOT NULL REFERENCES educa_periods(id) ON DELETE RESTRICT,
    inep_code VARCHAR(15),
    name VARCHAR(100) NOT NULL,
    acronym VARCHAR(20),
    max_students INT NOT NULL DEFAULT 30,
    is_multigrade BOOLEAN NOT NULL DEFAULT FALSE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start_time TIME,
    break_end_time TIME,
    weekdays INT[] NOT NULL DEFAULT '{2,3,4,5,6}', -- 2=Segunda ... 6=Sexta
    attendance_type VARCHAR(30) NOT NULL DEFAULT 'REGULAR', -- REGULAR, AEE, COMPLEMENTARY
    didactic_mediation VARCHAR(30) NOT NULL DEFAULT 'PRESENTIAL', -- PRESENTIAL, EAD
    report_card_type_id UUID REFERENCES educa_report_card_types(id),
    differentiated_report_card_type_id UUID REFERENCES educa_report_card_types(id),
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_school_class_name UNIQUE (school_id, academic_year, course_id, grade_id, name)
);

CREATE INDEX idx_educa_classes_tenant_year ON educa_school_classes(tenant_id, academic_year);
CREATE INDEX idx_educa_classes_school ON educa_school_classes(school_id);

-- Séries vinculadas à Turma (Multisseriada ou configuração específica)
CREATE TABLE educa_class_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_class_id UUID NOT NULL REFERENCES educa_school_classes(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES educa_grades(id) ON DELETE CASCADE,
    report_card_type_id UUID REFERENCES educa_report_card_types(id),
    differentiated_report_card_type_id UUID REFERENCES educa_report_card_types(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_class_grade UNIQUE (school_class_id, grade_id)
);

-- Alocação Docente na Turma
CREATE TABLE educa_class_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_class_id UUID NOT NULL REFERENCES educa_school_classes(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES educa_employees(id) ON DELETE RESTRICT,
    academic_year INT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'TEACHER', -- TEACHER, ASSISTANT, MONITOR, LIBRAS_INTERPRETER
    employment_type VARCHAR(20) NOT NULL DEFAULT 'PERMANENT', -- PERMANENT, TEMPORARY, OUTSOURCED, CLT
    can_post_grades_and_absences BOOLEAN NOT NULL DEFAULT TRUE,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disciplinas alocadas ao professor na turma
CREATE TABLE educa_class_teacher_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_teacher_id UUID NOT NULL REFERENCES educa_class_teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES educa_subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_teacher_subject UNIQUE (class_teacher_id, subject_id)
);
```

---

## 5. Endpoints REST da API (`apps/api` - Laravel 13)

- `GET /api/v1/educa/school-classes`: Listagem com filtros por escola, ano letivo, curso, série, turno e multisseriada.
- `GET /api/v1/educa/school-classes/{id}`: Detalhes da turma, vagas disponíveis, docentes e séries vinculadas.
- `POST /api/v1/educa/school-classes`: Cadastro de turma com validação de travas de vagas (`CanCreateSchoolClass`).
- `PUT /api/v1/educa/school-classes/{id}`: Edição de turma, horários e capacidade máxima.
- `DELETE /api/v1/educa/school-classes/{id}`: Exclusão lógica com checagem de enturmações ativas (`CanDeleteTurma`).
- `GET /api/v1/educa/school-classes/{id}/vacancies`: Cálculo em tempo real de vagas (capacidade total, enturmados e saldo).
- `POST /api/v1/educa/school-classes/{id}/teachers`: Alocação de docente na turma com definição de disciplinas e permissões de lançamento.
- `DELETE /api/v1/educa/school-classes/{id}/teachers/{teacherId}`: Desalocação docente.
- `POST /api/v1/educa/school-classes/check-availability`: Endpoint que executa a checagem do `AvailableTimeService` antes de confirmar enturmação de aluno.

---

## 6. Frontend no SYSGOV (`apps/web-client` - React 19)

- **Componentes `@sysgov/ui`:** `Card`, `Badge`, `Progress`, `Table`, `Dialog`, `Select`, `Input`, `Tabs`.
- **Painel de Ocupação de Vagas:**
  - Barra de progresso visual (`Progress`) para cada turma, indicando: verde (< 80% ocupado), amarelo (80-99%), vermelho (100% lotado).
  - Badge destacando se a turma é `Regular` ou `Multisseriada`.
- **Assistente de Alocação de Professores:**
  - Modal onde o gestor seleciona o servidor, o vínculo (`Efetivo`, `Temporário`, etc.) e marca checkboxes com as disciplinas que ele lecionará naquela turma.
- **Formatação de Dados:**
  - Horários e código INEP em `JetBrains Mono`.
