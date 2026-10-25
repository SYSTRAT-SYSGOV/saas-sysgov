# Fluxograma: Gestão de Quadro de Horários, Alocação Docente e Prevenção de Choques

> **Módulo:** `Quadro de Horários e Alocação Docente` (`Timetable` / `Servidores / Alocação`)  
> **Sistema Alvo:** `SYSGOV` / `SYS-Educa`  
> **Engine de Banco de Dados:** `MySQL 8.0/8.4+ (InnoDB)`

---

## 1. Ciclo de Vida: Da Alocação Docente à Matriz de Choque de Horários

```mermaid
flowchart TD
    classDef startEnd fill:#1e293b,stroke:#0f172a,stroke-width:2px,color:#fff;
    classDef process fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef decision fill:#d97706,stroke:#b45309,stroke-width:2px,color:#fff;
    classDef conflict fill:#dc2626,stroke:#991b1b,stroke-width:2px,color:#fff;
    classDef success fill:#16a34a,stroke:#15803d,stroke-width:2px,color:#fff;

    Start([Início do Planejamento Escolar]):::startEnd --> SetupStaff[Vincular Servidor / Docente ao Tenant e Órgão]:::process
    SetupStaff --> QualifyStaff[Registrar Habilitações Curriculares do Docente<br/><code>educa_teacher_qualifications</code>]:::process
    QualifyStaff --> AllocStaff[Registrar Alocação Contratual na Escola<br/><code>educa_teacher_allocations</code><br/>Carga Horária, Turno, Hora-Atividade]:::process

    AllocStaff --> OpenTimetable[Criar / Abrir Grade de Horários da Turma<br/><code>educa_timetables</code>]:::process
    OpenTimetable --> DefineSlots[Definir Slots de Aulas por Dia da Semana<br/>Dia 1..7, Hora Início, Hora Fim]:::process

    DefineSlots --> AssignTeacher[Atribuir Disciplina e Professor Titular ao Slot]:::process
    AssignTeacher --> ValidateConflict{Executar Validação de Choques<br/><code>ScheduleConflictDetectorService</code>}:::decision

    ValidateConflict -->|Conflito de Turma:<br/>Sobreposição no mesmo Dia/Hora| RejectClassConflict[Bloquear: Turma já possui aula neste horário!]:::conflict
    ValidateConflict -->|Conflito Docente:<br/>Professor em outra Escola/Turma| RejectTeacherConflict[Bloquear: Professor alocado em outra turma no mesmo dia/horário!]:::conflict
    ValidateConflict -->|Excesso de Carga:<br/>Horas alocadas > Carga Contratual| RejectWorkload[Avisar/Bloquear: Limite de horas semanais excedido]:::conflict

    RejectClassConflict --> AdjustSlot[Ajustar Horário ou Turma]:::process
    RejectTeacherConflict --> AdjustTeacher[Selecionar Outro Docente Habilitado ou Trocar Horário]:::process
    RejectWorkload --> AdjustAllocation[Revisar Carga Horária / Horas Excedentes]:::process
    AdjustSlot --> DefineSlots
    AdjustTeacher --> AssignTeacher
    AdjustAllocation --> AllocStaff

    ValidateConflict -->|Sem Choques e Carga Válida| PersistSlot[Persistir Slot de Grade<br/><code>educa_timetable_slots</code>]:::success
    PersistSlot --> CompleteGrid{Grade Completa da Semana?}:::decision

    CompleteGrid -->|Não| DefineSlots
    CompleteGrid -->|Sim| PublishTimetable[Publicar Quadro de Horários da Turma]:::success

    PublishTimetable --> EventAbsence{Ocorrência de Licença / Afastamento?}:::decision
    EventAbsence -->|Não| OperateNormal([Grade em Operação no Diário de Classe]):::startEnd
    EventAbsence -->|Sim| TeacherSub[Registrar Substituição Docente<br/><code>educa_teacher_substitutions</code><br/>Período Determinado ou Pontual]:::process
    TeacherSub --> ValidateSubConflict{Verificar Choque do Substituto}:::decision
    ValidateSubConflict -->|Choque Detectado| SelectOtherSub[Selecionar Outro Docente Substituto]:::conflict
    SelectOtherSub --> TeacherSub
    ValidateSubConflict -->|Sem Choque| ApplySub[Atualizar Apontamento do Diário com Substituto]:::success
    ApplySub --> OperateNormal
```

---

## 2. Algoritmo de Detecção de Choque de Horários (Overlap Detection)

```mermaid
flowchart LR
    classDef check fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff;
    classDef cond fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff;
    classDef res fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff;
    classDef err fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff;

    Input[Novo Slot Solicitado:<br/>Professor: P, Turma: T, Dia: D<br/>Intervalo: H_ini_novo .. H_fim_novo]:::check --> QueryDB[Consultar Slots Ativos Existentes:<br/>Tenant = ID, Ano Letivo = Ano, Dia = D]:::check

    QueryDB --> ClassOverlap{Existe Slot na mesma Turma T onde:<br/>H_ini_novo < H_fim_existente AND<br/>H_fim_novo > H_ini_existente?}:::cond
    ClassOverlap -->|Sim| ErrClass[ERRO: Choque de Horário na Turma]:::err

    ClassOverlap -->|Não| TeacherOverlap{Existe Slot ativo com Professor P onde:<br/>H_ini_novo < H_fim_existente AND<br/>H_fim_novo > H_ini_existente?}:::cond
    TeacherOverlap -->|Sim| ErrTeacher[ERRO: Choque de Horário do Docente<br/>(Conflito com Turma X na Escola Y)]:::err

    TeacherOverlap -->|Não| WorkloadCheck{Soma Horas-Aula Docente + Slot<br/>> Carga Horária Contratual Escola?}:::cond
    WorkloadCheck -->|Sim| WarnWorkload[ALERTA / BLOQUEIO:<br/>Extrapolação de Carga Horária]:::err
    WorkloadCheck -->|Não| AllowSave[HORÁRIO VÁLIDO:<br/>Gravação Aprovada com Sucesso]:::res
```
