# Fluxograma Arquitetural — Ciclo de Vida da Matrícula e Enturmação (SYS-Educa / SYSGOV)

> **Módulos:** `Registration` e `Enrollments`  
> **Contexto:** Gestão completa do ciclo de vida acadêmico do aluno: ingresso, matrícula ativa, alocação em turmas (`enturmação`), remanejamento interno, transferências (internas e externas), reclassificação, abandono, reordenação de chamada e encerramento anual.

---

## 1. Máquina de Estados da Matrícula (`educa_registrations`)

No i-Educar legado (`pmieducar.matricula`), a situação da matrícula (`MatriculaSituacao`) operava com inteiros mágicos. No **SYS-Educa**, padronizamos com Enums tipados e mapeamento direto ao Censo Escolar/MEC.

```mermaid
stateDiagram-v2
    [*] --> PRE_ENROLLED: Inscrição / Fila de Espera
    PRE_ENROLLED --> ACTIVE: Confirmação & Documentação Validada
    PRE_ENROLLED --> CANCELLED: Cancelamento / Desistência

    state ACTIVE {
        [*] --> NOT_ALLOCATED: Matrícula Aberta (Sem Turma)
        NOT_ALLOCATED --> ENROLLED: Enturmação Efetuada (educa_enrollments)
        ENROLLED --> NOT_ALLOCATED: Desenturmação (Troca de Matriz/Ajuste)
        ENROLLED --> RELOCATED: Remanejamento (Troca de Turma na Mesma Escola)
        RELOCATED --> ENROLLED: Nova Turma Definida
    }

    ACTIVE --> IN_EXAM: Final de Ano (Em Exame / Recuperação Final)
    IN_EXAM --> APPROVED_AFTER_EXAM: Aprovado após Exame
    IN_EXAM --> REPROVED: Reprovado após Exame

    ACTIVE --> APPROVED: Fechamento Anual (Aprovado Direto)
    ACTIVE --> APPROVED_DEPENDENCY: Aprovado com Dependência
    ACTIVE --> APPROVED_COUNCIL: Aprovado pelo Conselho de Classe
    ACTIVE --> REPROVED: Reprovado por Nota
    ACTIVE --> REPROVED_ABSENCE: Reprovado por Faltas (> 25% Ausências)

    ACTIVE --> RECLASSIFIED: Reclassificação (Avanço/Retrocesso de Série)
    ACTIVE --> TRANSFERRED: Transferência (Interna ou Externa Concluída)
    ACTIVE --> DROPOUT: Abandono / Evasão Escolar
    ACTIVE --> DECEASED: Falecimento do Estudante
    ACTIVE --> CANCELLED: Anulação / Cancelamento Administrativo

    APPROVED --> [*]
    APPROVED_AFTER_EXAM --> [*]
    APPROVED_DEPENDENCY --> [*]
    APPROVED_COUNCIL --> [*]
    REPROVED --> [*]
    REPROVED_ABSENCE --> [*]
    RECLASSIFIED --> [*]
    TRANSFERRED --> [*]
    DROPOUT --> [*]
    DECEASED --> [*]
    CANCELLED --> [*]
```

---

## 2. Fluxo Operacional: Matrícula e Alocação Física (`educa_enrollments`)

Distinção fundamental entre **Matrícula** (relação contratual do estudante com a escola/série/ano) e **Enturmação** (alocação do estudante numa turma física com carteira, turno e número de chamada).

```mermaid
graph TD
    subgraph Entrada["1. Recepção do Aluno"]
        Aluno["Pessoa Física: Aluno Cadastrado (educa_students)"]
        AnoLetivo["Ano Letivo Vigente (educa_academic_years)"]
        Escola["Escola Selecionada (educa_schools)"]
        Serie["Curso e Série Pretendidos (educa_grades)"]
    end

    subgraph Matricula["2. Registro de Matrícula (educa_registrations)"]
        CriarMatricula["Criar educa_registrations<br/>(status: ACTIVE, situacao: EM_ANDAMENTO)"]
        ValidaDuplicidade{"Já possui matrícula<br/>ativa no mesmo ano<br/>para ensino regular?"}
        BloqueiaDuplicidade["Erro: 422 Unprocessable<br/>'Aluno já possui matrícula ativa'"]
        
        Aluno --> ValidaDuplicidade
        AnoLetivo --> ValidaDuplicidade
        ValidaDuplicidade -- Sim --> BloqueiaDuplicidade
        ValidaDuplicidade -- Não --> CriarMatricula
    end

    subgraph Enturmacao["3. Algoritmo de Enturmação (educa_enrollments)"]
        SelecionaTurma["Selecionar Turma Física (educa_school_classes)"]
        ValidaCapacidade{"Vagas Restantes > 0<br/>ou Liberação com Sobrecarga?"}
        BloqueiaVaga["Erro: 409 Conflict<br/>'Capacidade física esgotada'"]
        
        ValidaHorario{"Conflito com outra<br/>enturmação ativa?<br/>(Choque de Turno/Horário)"}
        BloqueiaChoque["Erro: 422 Unprocessable<br/>'Conflito de horário detectado'"]
        
        CriarMatricula --> SelecionaTurma
        SelecionaTurma --> ValidaCapacidade
        ValidaCapacidade -- Sem Vaga --> BloqueiaVaga
        ValidaCapacidade -- OK --> ValidaHorario
        ValidaHorario -- Choque --> BloqueiaChoque
        ValidaHorario -- Livre --> GravaEnturmacao["Persistir educa_enrollments<br/>(data_entrada: YYYY-MM-DD)"]
    end

    subgraph Reordenacao["4. Numeração de Chamada Automática"]
        Sequencial["Calcular Sequencial de Fechamento<br/>(Ordenação Alfabética / Cronológica)"]
        AtualizaDiario["Sincronizar Diário de Classe & Lista de Presença"]
        
        GravaEnturmacao --> Sequencial
        Sequencial --> AtualizaDiario
    end
```

---

## 3. Diagrama de Sequência: Transferência com Portabilidade de Avaliações

O processo de transferência interna ou externa requer a preservação do histórico de notas, faltas e pareceres do estudante (`TransferRegistrationDataService`), caso as matrizes e etapas de ensino coincidam.

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Secretário Escolar
    participant UI as apps/web-client (@sysgov/ui)
    participant API as RegistrationController (Laravel 13)
    participant TransferSvc as TransferRegistrationDataService
    participant RegSvc as RegistrationService
    participant ScoreSvc as CopyScoreService / CopyAbsenceService
    participant DB as PostgreSQL 16 (Multi-Tenant)

    Operador->>UI: Solicitar Transferência (Matrícula ID, Destino, Justificativa)
    UI->>API: POST /api/v1/educa/transfers/requests
    API->>DB: Criar educa_transfer_requests (status: PENDING)
    API-->>UI: 201 Created (Guia de Transferência Emitida)

    Note over Operador,UI: Escola de Destino Aceita a Transferência

    Operador->>UI: Efetivar Matrícula por Transferência
    UI->>API: POST /api/v1/educa/transfers/{id}/accept
    API->>TransferSvc: executeTransfer(transferRequest, newSchoolClass)
    
    TransferSvc->>RegSvc: closeOldRegistration(oldRegId, status: TRANSFERRED)
    RegSvc->>DB: UPDATE educa_registrations SET status = 'TRANSFERRED', departure_date = NOW()
    RegSvc->>DB: UPDATE educa_enrollments SET active = FALSE, exit_date = NOW()

    TransferSvc->>RegSvc: createNewRegistration(studentId, newSchool, newGrade)
    RegSvc->>DB: INSERT INTO educa_registrations (status: 'ACTIVE')
    RegSvc->>DB: INSERT INTO educa_enrollments (turma_id, entry_date = NOW())

    TransferSvc->>TransferSvc: verifyStageParity(oldRule, newRule)
    alt Estrutura de Etapas Idêntica (Ex: 4 Bimestres Iguais)
        TransferSvc->>ScoreSvc: copyScoresAndAbsences(oldRegId, newRegId)
        ScoreSvc->>DB: Clona notas de educa_discipline_scores (etapas cursadas)
        ScoreSvc->>DB: Clona faltas de educa_discipline_absences
        ScoreSvc->>DB: Clona pareceres de educa_descriptive_opinions
    else Estrutura Diferente (Trimestre vs Bimestre)
        TransferSvc->>DB: Marca necessidade de 'Adaptação Curricular' no histórico
    end

    TransferSvc->>DB: UPDATE educa_transfer_requests SET status = 'COMPLETED'
    API-->>UI: 200 OK (Transferência Concluída & Histórico Migrado)
```

---

## 4. Matriz de Situações da Matrícula e Equivalências

| ID Legado | Situação Legada (`pmieducar.matricula.aprovado`) | Enum SYS-Educa (`RegistrationStatus`) | Terminal? | Bloqueia Enturmação? | Gera Histórico? |
|:---:|:---|:---|:---:|:---:|:---:|
| `1` | Aprovado | `APPROVED` | Sim | Sim | Sim |
| `2` | Reprovado | `REPROVED` | Sim | Sim | Sim |
| `3` | Em Andamento | `ACTIVE` | Não | Não (Exige Enturmação) | Não |
| `4` | Transferido | `TRANSFERRED` | Sim | Sim | Sim (Parcial) |
| `5` | Reclassificado | `RECLASSIFIED` | Sim | Sim | Sim |
| `6` | Abandono | `DROPOUT` | Sim | Sim | Sim (Interrompido)|
| `7` | Em Exame | `IN_EXAM` | Não | Não | Não |
| `8` | Aprovado após Exame | `APPROVED_AFTER_EXAM` | Sim | Sim | Sim |
| `11` | Pré-Matrícula | `PRE_ENROLLED` | Não | Sim (Até Confirmação) | Não |
| `12` | Aprovado com Dependência | `APPROVED_DEPENDENCY` | Sim | Sim | Sim |
| `13` | Aprovado pelo Conselho | `APPROVED_COUNCIL` | Sim | Sim | Sim |
| `14` | Reprovado por Faltas | `REPROVED_ABSENCE` | Sim | Sim | Sim |
| `15` | Falecido | `DECEASED` | Sim | Sim | Não |
| `-` | Cancelado / Anulado | `CANCELLED` | Sim | Sim | Não |
