# Fluxos de Controle — Módulo AcademicYear (Ano Letivo)

> Gerado pelo Reversa Archaeologist (doc_level: completo) em 2026-10-12

---

## 1. Ciclo de Vida e Transições de Estado do Ano Letivo

O ano letivo possui 3 estados fundamentais definidos em `app/Services/AcademicYearService.php`:
- `0`: Não iniciado (`STATUS_NOT_STARTED`)
- `1`: Em andamento (`STATUS_IN_PROGRESS`)
- `2`: Finalizado (`STATUS_FINISHED`)

```mermaid
stateDiagram-v2
    [*] --> NaoIniciado: Criação do Ano Letivo (create)
    
    NaoIniciado --> EmAndamento: Abertura / Iniciar Ano (open)
    note right of EmAndamento
        Valida se há etapas definidas
        Bloqueia se já estiver em andamento ou finalizado
    end note
    
    EmAndamento --> Finalizado: Fechamento / Finalizar Ano (close)
    note right of Finalizado
        Bloqueia se houver matrículas ativas
        com status 'em andamento' (aprovado = 3)
    end note
    
    NaoIniciado --> [*]: Exclusão (delete)
    note left of NaoIniciado
        Bloqueia se houver dados vinculados
        (turmas, matrículas, notas)
    end note
```

---

## 2. Fluxo de Criação e Cópia de Dados do Ano Anterior

Quando um novo ano letivo é criado com a opção `copiar_dados = true`, o método `performDataCopy` (ou `executeCopyAcademicYears`) executa um fluxo transacional complexo:

```mermaid
sequenceDiagram
    autonumber
    actor Gestor as Gestor Escolar / Admin
    participant Service as AcademicYearService
    participant Stage as Etapas / Módulos
    participant Course as Cursos e Séries
    participant Discipline as Matrizes e Disciplinas
    participant Class as Turmas
    participant Alloc as Alocações e Servidores
    participant DB as PostgreSQL

    Gestor->>Service: create(escola, ano, etapas, copiar_dados=true, ano_origem)
    activate Service
    
    Service->>DB: Inicia Transação (DB::beginTransaction)
    Service->>DB: INSERT escola_ano_letivo (status=0)
    
    Service->>Stage: Cria etapas (escola_ano_letivo_modulo)
    Service->>Stage: Valida conflito de datas de etapas
    
    alt copiar_dados == true
        Service->>Course: Copia Cursos e Séries (append anos_letivos[])
        Service->>Discipline: Copia Matrizes Curriculares e Regras de Avaliação
        Service->>Class: Clona Turmas do Ano Anterior (replicateSchoolClass)
        Service->>Alloc: Clona Alocações de Servidores e Professores nas Turmas
    end
    
    Service->>DB: DB::commit()
    Service-->>Gestor: Ano Letivo Criado com Sucesso
    deactivate Service
```

---

## 3. Validação de Fechamento do Ano Letivo (`close`)

Regras rígidas impedem o encerramento indevido do ano:

```mermaid
flowchart TD
    Start([Início do Fechamento do Ano]) --> CheckStatus{Status atual == 1 (Em andamento)?}
    CheckStatus -- Não --> ErrStatus[Lança Exceção: Ano não está em andamento]
    CheckStatus -- Sim --> CheckEnrollments{Existem matrículas com aprovado == 3?}
    
    CheckEnrollments -- Sim --> CheckActivity{É apenas atividade complementar?}
    CheckActivity -- Não --> ErrEnrollments[Lança Exceção: Existem alunos com situação indefinida/em andamento]
    CheckActivity -- Sim --> UpdateStatus[Atualiza status = 2 (Finalizado)]
    
    CheckEnrollments -- Não --> UpdateStatus
    UpdateStatus --> TriggerEvents[Dispara eventos de encerramento]
    TriggerEvents --> End([Ano Finalizado com Sucesso])
```
