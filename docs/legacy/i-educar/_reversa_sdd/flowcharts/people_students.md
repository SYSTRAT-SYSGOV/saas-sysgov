# Fluxograma de Dados e Entidades: Pessoas, Estudantes e Servidores (SYS-Educa vs SYSGOV Core)

> Mapeamento de Transição do I-Educar para o SaaS SYSGOV
> Módulos Legados: `Cadastro`, `People`, `Servidores`, `Unification`
> Padrão: Mermaid + JetBrains Mono

---

## 1. Topologia de Entidades: Unificação com os Módulos Comuns do SYSGOV

```mermaid
graph TD
    subgraph "SYSGOV Core (Módulos Corporativos Transversais)"
        P["App\\Models\\Person\n(id, tenant_id, name, social_name,\ncpf, rg, birthdate, gender, created_at)"]
        U["App\\Models\\User\n(id, tenant_id, email, password_hash,\nstatus, role_id, sanctum_tokens)"]
        OU["App\\Models\\OrgUnit\n(id, tenant_id, parent_id, name, code,\nlevel: Secretaria, Escola, Departamento)"]
    end

    subgraph "Módulo Especializado: SYS-Educa"
        STU["educa_students\n(id, tenant_id, person_id, inep_code,\nnis, birth_certificate, blood_type,\nsus_number, nationality, active)"]
        
        GUA["educa_student_guardians\n(id, tenant_id, student_id, guardian_person_id,\nrelationship_type: mae, pai, responsavel_legal,\nis_primary_contact, legal_custody)"]
        
        AEE["educa_student_special_needs\n(id, tenant_id, student_id, deficiency_type,\nneeds_companion, medical_report_url)"]
        
        SOC["educa_student_social_benefits\n(id, tenant_id, student_id, benefit_name,\nnis_registered, food_restrictions)"]
        
        TEA["educa_teachers\n(id, tenant_id, person_id, inep_code,\nhighest_degree, graduation_discipline)"]
        
        ALOC["educa_teacher_allocations\n(id, tenant_id, teacher_id, school_unit_id,\nacademic_year, weekday, start_time, end_time,\nclassroom_hours, activity_hours)"]
        
        UNIF["educa_student_unifications\n(id, tenant_id, master_student_id, merged_student_id,\nreason, merged_by_user_id, status: merged / undone,\nbackup_snapshot_json)"]
    end

    P -->|1:1 Extensão de Educando| STU
    P -->|1:N Responsáveis do Educando| GUA
    GUA -->|N:1 Vinculado ao Aluno| STU
    STU -->|1:N Necessidades Especiais| AEE
    STU -->|1:N Benefícios Sociais| SOC
    
    P -->|1:1 Extensão Docente| TEA
    TEA -->|1:N Alocações em Aulas| ALOC
    OU -->|Lotação Escolar| ALOC
    
    U -->|Operador do Registro| UNIF
    STU -->|Fusão de Alunos| UNIF
```

---

## 2. Máquina de Estados e Regras da Fusão/Unificação de Alunos (`StudentUnification`)

```mermaid
stateDiagram-v2
    [*] --> DetectadoDuplicado: Aluno cadastrado duas vezes na rede
    DetectadoDuplicado --> AnaliseConflito: Secretaria/Admin analisa registros (A e B)
    
    state AnaliseConflito {
        [*] --> ValidarHistorico: Verifica matrículas em anos simultâneos
        ValidarHistorico --> Bloqueado: Conflito em mesmo ano e escola ativa
        ValidarHistorico --> Elegivel: Sem choque de frequência/notas
    }
    
    Bloqueado --> [*]: Rejeitado (Necessário cancelamento manual prévio)
    Elegivel --> SnapshotGerado: Cria cópia segura (backup_snapshot_json)
    SnapshotGerado --> FusaoExecutada: Migra FKs de notas, matrículas e faltas para Aluno Mestre (A)
    FusaoExecutada --> DesativadoSecundario: Marca Aluno B como 'unificado_inativo'
    
    DesativadoSecundario --> ReversaoSolicitada: Erro detectado pela secretaria
    ReversaoSolicitada --> ReversaoConcluida: Restaura FKs originais via snapshot com auditoria AuditLogger
    ReversaoConcluida --> [*]
    DesativadoSecundario --> [*]: Unificação definitiva
```

---

## 3. Matriz de Atribuições Pedagógicas do Docente (Lotação LDB)

```mermaid
flowchart TD
    Docente[Servidor Público Municipal com Função Docente] --> Alocacao[Alocação Escolar no Ano Letivo]
    Alocacao --> SplitHoras{Divisão de Carga Horária Lei 11.738}
    SplitHoras --> SalaAula[Horas em Sala de Aula: Max 2/3 da Carga]
    SplitHoras --> HoraAtividade[Horas-Atividade: Min 1/3 para Planejamento/Correção]
    
    SalaAula --> AtribuicaoTurma[Vinculação Turma x Componente Curricular]
    AtribuicaoTurma --> AcessoDiario[Habilitação Automática no Diário de Classe Digital]
```
