# Mapeamento Legado — Módulo School (Escolas, Cursos, Séries e Matriz de Oferta)

> **Módulo:** `School` (Unidades Escolares e Estrutura Pedagógica)  
> **Sistema Destino:** `SYS-Educa` (`apps/api` - Laravel 13 / `apps/web-client` - React 19)  
> **Status:** Concluído / Pronto para Implementação

---

## 1. Visão Geral e Integração com SYSGOV Core

No i-Educar legado, a escola é tratada de forma híbrida: possui registro em `pmieducar.escola`, amarrada a uma pessoa jurídica em `cadastro.pessoa` (`ref_idpes`), além de dados complementares espalhados em `pmieducar.escola_complemento`, `modules.educacenso_cod_escola` e `pmieducar.escola_ano_letivo`.

No **SYSGOV**, adota-se o padrão corporativo de **Unidades Organizacionais (`OrgUnit`)**:
1. Toda escola municipal é uma `OrgUnit` com `type = 'SCHOOL'`, vinculada hierarquicamente à Secretaria Municipal de Educação (`OrgUnit` com `type = 'SECRETARIAT'`).
2. O módulo **SYS-Educa** estende a unidade com a entidade `educa_schools` via chave estrangeira `org_unit_id` (1:1), centralizando parâmetros educacionais, Censo Escolar/INEP, credenciamento, gestor escolar e secretário escolar.
3. A oferta curricular é modular: Cursos (`educa_courses`) e Séries (`educa_grades`) são parametrizados pela Rede de Ensino (SME), e cada escola habilita sua matriz de oferta em `educa_school_courses` e `educa_school_grades`.

---

## 2. Tabelas Legadas do i-Educar

| Tabela Legada | Descrição no Legado | Destino no SYSGOV |
| :--- | :--- | :--- |
| `pmieducar.escola` | Dados cadastrais e institucionais da escola | `educa_schools` (vinculada a `org_units`) |
| `modules.educacenso_cod_escola` | Código INEP da escola no Censo Escolar | `educa_school_inep` / atributo em `educa_schools` |
| `pmieducar.curso` | Cursos ofertados pela rede municipal (ex: Fundamental regular, EJA) | `educa_courses` |
| `pmieducar.serie` | Séries/Anos escolares vinculados ao curso | `educa_grades` |
| `pmieducar.escola_curso` | Habilitação de cursos em cada unidade escolar | `educa_school_courses` |
| `pmieducar.escola_serie` | Habilitação de séries por escola e parametrização de regras de vagas | `educa_school_grades` |
| `pmieducar.escola_ano_letivo` | Status do ano letivo por unidade escolar | `educa_school_academic_years` |
| `modules.escola_espaco` | Infraestrutura e salas físicas da unidade | `educa_school_spaces` |
| `modules.escola_gestor` | Diretores, vices e gestores escolares da unidade | `educa_school_managers` |

---

## 3. Atributos e Campos Legados Relevantes

### 3.1 `pmieducar.escola`
- `cod_escola` (PK): Inteiro identificador.
- `ref_idpes` (FK): Pessoa jurídica da escola.
- `ref_cod_instituicao` (FK): Instituição mantenedora.
- `sigla`: Sigla da unidade escolar.
- `situacao_funcionamento`: Em atividade, paralisada, extinta (Censo INEP).
- `zona_localizacao`: 1 = Urbana, 2 = Rural.
- `localizacao_diferenciada`: Área assentamento, terra indígena, comunidade quilombola.
- `dependencia_administrativa`: Municipal, estadual, federal, privada.
- `ref_idpes_gestor` (FK): Diretor/Gestor escolar (`cadastro.pessoa`).
- `ref_idpes_secretario_escolar` (FK): Secretário da escola.
- `latitude`, `longitude`: Coordenadas geográficas da unidade.
- `predio_compartilhado_outra_escola`: Booleano para Censo Escolar.

### 3.2 `pmieducar.curso`
- `cod_curso` (PK): Inteiro identificador.
- `nm_curso`: Nome oficial do curso (ex: "Ensino Fundamental - 9 Anos").
- `sgl_curso`: Sigla do curso.
- `qtd_etapas`: Quantidade de etapas do curso (geralmente 4 bimestres ou 3 trimestres).
- `carga_horaria`: Carga horária total mínima anual.
- `hora_falta`: Fração de hora para cômputo de faltas.
- `padrao_ano_escolar`: Se segue o calendário letivo padrão da rede (`true`) ou se tem calendário próprio por turma (`false`).
- `multi_seriado`: Se admite turmas multisseriadas.
- `modalidade_curso`: Regular, EJA, Especial, Profissionalizante.

### 3.3 `pmieducar.serie`
- `cod_serie` (PK): Inteiro identificador.
- `ref_cod_curso` (FK): Curso pai da série.
- `nm_serie`: Nome da série/ano (ex: "1º Ano", "2º Ano").
- `etapa_curso`: Sequencial no curso (1, 2, 3...).
- `concluinte`: Se a conclusão da série confere certificado/conclusão de etapa.
- `dias_letivos`: Mínimo de dias letivos (ex: 200).
- `idade_inicial`, `idade_final`, `idade_ideal`: Faixa etária para matrícula.
- `bloquear_matricula_faixa_etaria`: Trava que impede matrícula fora da idade limite.
- `regra_avaliacao_id` (FK): Regra padrão de avaliação e notas.
- `regra_avaliacao_diferenciada_id` (FK): Regra para alunos com AEE/adaptação.

### 3.4 `pmieducar.escola_serie`
- `ref_cod_escola` (FK), `ref_cod_serie` (FK): Chave composta da série na escola.
- `bloquear_enturmacao_sem_vagas`: Se ativo (`1`), impede enturmar aluno além de `max_aluno` da turma.
- `bloquear_cadastro_turma_para_serie_com_vagas`: Se ativo (`1`), impede abrir nova turma no mesmo turno enquanto houver vagas em aberto nas turmas já existentes.
- `hora_inicial`, `hora_final`: Horários de funcionamento padrão da série na unidade.

---

## 4. Models e Services Analisados

- `App\Models\LegacySchool`: Mapeamento de `pmieducar.escola`, relacionamentos com `courses`, `grades`, `schoolClasses`, `inep`, `addresses`.
- `App\Models\LegacyCourse`: Mapeamento de `pmieducar.curso`, validação de `padrao_ano_escolar` e etapas.
- `App\Models\LegacyGrade`: Mapeamento de `pmieducar.serie`, vínculos com regras de avaliação anual (`LegacyEvaluationRule`).
- `App\Models\LegacySchoolCourse`: Pivot `pmieducar.escola_curso`.
- `App\Models\LegacySchoolGrade`: Pivot `pmieducar.escola_serie` com as regras cruciais de contenção de vagas.
- `App\Models\SchoolInep`: Código INEP escolar para o Censo.
- `App\Models\SchoolSpace`: Salas e infraestrutura da unidade.

---

## 5. Schema Proposto no SYSGOV (`SYS-Educa`)

```sql
-- Extensão acadêmica da Unidade Organizacional (Escola)
CREATE TABLE educa_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    org_unit_id UUID NOT NULL UNIQUE REFERENCES org_units(id) ON DELETE RESTRICT,
    inep_code VARCHAR(8) UNIQUE,
    school_name VARCHAR(255) NOT NULL,
    acronym VARCHAR(20),
    operating_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PARALYZED, EXTINCT
    location_zone VARCHAR(10) NOT NULL DEFAULT 'URBAN', -- URBAN, RURAL
    differentiated_location VARCHAR(30), -- INDIGENOUS, QUILOMBOLA, SETTLEMENT, NONE
    admin_dependency VARCHAR(20) NOT NULL DEFAULT 'MUNICIPAL', -- MUNICIPAL, STATE, FEDERAL, PRIVATE
    director_person_id UUID REFERENCES people(id),
    secretary_person_id UUID REFERENCES people(id),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    shared_building BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_educa_schools_tenant ON educa_schools(tenant_id);
CREATE INDEX idx_educa_schools_inep ON educa_schools(inep_code);

-- Cursos oferecidos pela Rede Municipal
CREATE TABLE educa_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    acronym VARCHAR(20),
    description TEXT,
    education_level_id UUID REFERENCES educa_education_levels(id),
    education_type_id UUID REFERENCES educa_education_types(id),
    stages_count INT NOT NULL DEFAULT 4, -- 4 bimestres ou 3 trimestres
    total_workload INT NOT NULL, -- em horas
    hour_absence_fraction NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    is_standard_calendar BOOLEAN NOT NULL DEFAULT TRUE,
    allows_multigrade BOOLEAN NOT NULL DEFAULT FALSE,
    modality VARCHAR(30) NOT NULL DEFAULT 'REGULAR', -- REGULAR, EJA, SPECIAL, VOCATIONAL
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Séries / Anos Escolares
CREATE TABLE educa_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES educa_courses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    stage_order INT NOT NULL, -- 1º Ano = 1, 2º Ano = 2...
    is_concluding BOOLEAN NOT NULL DEFAULT FALSE,
    workload INT NOT NULL,
    school_days INT NOT NULL DEFAULT 200,
    ideal_age INT,
    min_age INT,
    max_age INT,
    block_enrollment_out_of_age BOOLEAN NOT NULL DEFAULT FALSE,
    default_evaluation_rule_id UUID REFERENCES educa_evaluation_rules(id),
    differentiated_evaluation_rule_id UUID REFERENCES educa_evaluation_rules(id),
    educacenso_stage_code VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Oferta de Cursos pela Escola
CREATE TABLE educa_school_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES educa_schools(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES educa_courses(id) ON DELETE CASCADE,
    authorization_resolution VARCHAR(100),
    academic_years INT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_school_course UNIQUE (school_id, course_id)
);

-- Oferta de Séries pela Escola (com regras de vagas)
CREATE TABLE educa_school_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES educa_schools(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES educa_grades(id) ON DELETE CASCADE,
    academic_years INT[] NOT NULL DEFAULT '{}',
    start_time TIME,
    end_time TIME,
    block_enrollment_without_vacancies BOOLEAN NOT NULL DEFAULT TRUE,
    block_class_creation_if_vacancies_exist BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_school_grade UNIQUE (school_id, grade_id)
);
```

---

## 6. Endpoints da API REST (`apps/api` - Laravel 13)

- `GET /api/v1/educa/schools`: Listagem paginada de escolas com busca por nome, INEP, zona e status.
- `GET /api/v1/educa/schools/{id}`: Detalhes da escola, infraestrutura, diretor e matriz ofertada.
- `POST /api/v1/educa/schools`: Cadastro de escola com vínculo à `OrgUnit` corporativa.
- `PUT /api/v1/educa/schools/{id}`: Atualização de parâmetros escolares e gestores.
- `GET /api/v1/educa/schools/{id}/matrix`: Retorna cursos e séries autorizados para a unidade.
- `POST /api/v1/educa/schools/{id}/courses`: Habilitação de curso na unidade.
- `POST /api/v1/educa/schools/{id}/grades`: Habilitação de série e configuração de travas de vagas.
- `GET /api/v1/educa/courses`: Gestão de cursos da rede de ensino.
- `POST /api/v1/educa/courses`: Criação de curso com definição de etapas e calendário padrão.
- `GET /api/v1/educa/grades`: Gestão de séries/anos curriculares.

---

## 7. Frontend no SYSGOV (`apps/web-client` - React 19)

- **Componentes `@sysgov/ui`:** `Card`, `Table`, `Badge`, `Button`, `Dialog`, `Input`, `Select`, `Switch`.
- **Tela de Matriz Curricular da Escola:**
  - Configuração visual da árvore: Escola $\rightarrow$ Cursos Habilitados $\rightarrow$ Séries $\rightarrow$ Parâmetros de Horário e Travas de Vagas.
  - Alerta informativo quando a trava `bloquear_cadastro_turma_para_serie_com_vagas` estiver ativada, explicando que a direção só poderá criar novas turmas quando as existentes forem lotadas.
- **Tipografia Técnica:** Códigos INEP, horários e identificadores em `JetBrains Mono`.
