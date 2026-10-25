# Fluxograma Arquitetural — Estrutura Escolar e Turmas (SYS-Educa / SYSGOV)

> **Módulos:** `School` e `SchoolClass`  
> **Contexto:** Mapeamento da hierarquia escolar, cursos, séries, turnos, matriz de oferta por unidade e enturmação (regular e multisseriada).

---

## 1. Visão Geral da Hierarquia Organizacional e Acadêmica

```mermaid
graph TD
    subgraph SYSGOV_Core["SYSGOV Core (Transversal)"]
        Tenant["Tenant (Município / Órgão)"]
        SME["OrgUnit: Secretaria Municipal de Educação"]
        EscolaOrg["OrgUnit: Escola Municipal (Unidade Administrativa)"]
        Tenant --> SME
        SME --> EscolaOrg
    end

    subgraph SYS_Educa_School["SYS-Educa: Gestão Escolar (School)"]
        EscolaEduca["educa_schools<br/>(Extensão Acadêmica da OrgUnit)"]
        EscolaInep["educa_school_inep<br/>(Censo Escolar / Código INEP)"]
        EscolaEspacos["educa_school_spaces<br/>(Salas e Espaços Físicos)"]
        
        EscolaOrg --> EscolaEduca
        EscolaEduca --> EscolaInep
        EscolaEduca --> EscolaEspacos
    end

    subgraph Matriz_Academica["Matriz Curricular & Pedagógica"]
        Curso["educa_courses<br/>(Ensino Fundamental, Infantil, EJA, etc.)"]
        Serie["educa_grades<br/>(1º Ano, 2º Ano, Etapa I, etc.)"]
        Curso -->|1:N| Serie
        
        EscolaCurso["educa_school_courses<br/>(Cursos Ofertados pela Escola)"]
        EscolaSerie["educa_school_grades<br/>(Séries Habilitadas & Regras de Vagas)"]
        
        EscolaEduca -.-> EscolaCurso
        Curso -.-> EscolaCurso
        EscolaCurso --> EscolaSerie
        Serie -.-> EscolaSerie
    end

    subgraph Turmas_Turnos["SYS-Educa: Turmas e Horários (SchoolClass)"]
        Turno["educa_periods<br/>(Matutino, Vespertino, Noturno, Integral)"]
        Turma["educa_school_classes<br/>(Turma Física / Ano Letivo)"]
        
        EscolaSerie --> Turma
        Turno --> Turma
        
        subgraph Tipos_Turma["Classificação da Turma"]
            TurmaRegular["Turma Regular<br/>(1 Série Única)"]
            TurmaMulti["Turma Multisseriada<br/>(educa_class_grades: N Séries)"]
        end
        
        Turma --> TurmaRegular
        Turma --> TurmaMulti
    end

    subgraph Gestao_Turma["Alocação & Operação da Turma"]
        ProfTurma["educa_class_teachers<br/>(Alocação Docente + Vínculo)"]
        EtapasTurma["educa_school_class_stages<br/>(Etapas / Módulos Não-Padrão)"]
        Enturmacao["educa_enrollments<br/>(Vagas Ocupadas / Alunos)"]
        
        Turma --> ProfTurma
        Turma --> EtapasTurma
        Turma --> Enturmacao
    end

    classDef core fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef school fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef acad fill:#18181b,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    classDef classNode fill:#172554,stroke:#06b6d4,stroke-width:2px,color:#fff;

    class Tenant,SME,EscolaOrg core;
    class EscolaEduca,EscolaInep,EscolaEspacos school;
    class Curso,Serie,EscolaCurso,EscolaSerie acad;
    class Turno,Turma,TurmaRegular,TurmaMulti,ProfTurma,EtapasTurma,Enturmacao classNode;
```

---

## 2. Ciclo de Vida e Regras de Validação de Turmas

```mermaid
sequenceDiagram
    autonumber
    actor Gestor as Secretário / Diretor Escolar
    participant API as SchoolClassService (SYS-Educa API)
    participant Rule1 as CanCreateSchoolClass
    participant Rule2 as CheckSchoolClassExistsByName
    participant Rule3 as AvailableTimeService
    participant DB as Banco de Dados (PostgreSQL)

    Gestor->>API: POST /api/v1/educa/school-classes (Criar Turma)
    
    API->>Rule2: Validar duplicidade de nome (nm_turma, serie, escola, ano)
    alt Nome já existente no ano/escola/série
        Rule2-->>Gestor: 422 Unprocessable Entity ("Nome de turma já utilizado")
    end

    API->>Rule1: Validar trava de capacidade (bloquear_cadastro_turma_para_serie_com_vagas)
    alt EscolaSerie tem trava ativa E existem turmas com vagas abertas no mesmo turno
        Rule1-->>Gestor: 422 Unprocessable Entity ("Não é possível criar nova turma enquanto houver vagas em aberto na turma X")
    end

    API->>DB: Inserir educa_school_classes (dados básicos, horários, capacidade)
    
    opt Se for Multisseriada (multiseriada = true)
        API->>DB: Inserir educa_class_grades (vínculo de cada série com seu respectivo tipo_boletim)
    end

    API->>DB: Criar ou vincular etapas do calendário (Padrão Escola ou Específico Turma)
    API-->>Gestor: 201 Created (Turma criada e pronta para enturmação)

    note over Gestor, API: Momento da Enturmação do Aluno
    Gestor->>API: POST /api/v1/educa/enrollments (Enturmar Aluno)
    API->>Rule3: Validar choque de horário (isAvailable)
    alt Aluno já matriculado no mesmo turno/dias (exceto Regular + AEE contraturno)
        Rule3-->>Gestor: 422 Unprocessable Entity ("Choque de horários com turma Y")
    else Horário livre e turma com vagas
        API->>DB: Inserir enturmação e decrementar vagas disponíveis
        API-->>Gestor: 200 OK (Aluno enturmado)
    end
```

---

## 3. Matriz de Turnos e Regras de Compatibilidade de Horários

| Turno (`educa_periods`) | Horário Padrão | Validação de Conflito no Aluno | Exceção Permitida |
| :--- | :--- | :--- | :--- |
| **Matutino** | 07:00 – 12:00 | Não pode coincidir com outra matrícula no mesmo turno | Pode cursar AEE no Vespertino |
| **Vespertino** | 13:00 – 18:00 | Não pode coincidir com outra matrícula no mesmo turno | Pode cursar AEE no Matutino |
| **Noturno** | 18:30 – 22:30 | Não pode coincidir com outra matrícula regular | Compatível com estágios/trabalho |
| **Integral** | 07:30 – 17:00 | Bloqueia qualquer outra enturmação concomitante | AEE integrado no plano de atendimento |
