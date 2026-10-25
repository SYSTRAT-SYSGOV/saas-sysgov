# Design Técnico: Submódulo Quadro de Horários e Grade Semanal

## Contexto (Context)

Ver [proposal.md](proposal.md) para motivação e problemas resolvidos.
O SYS-Educa já possui implementados e aprovados os submódulos fundamentais: Core Acadêmico (escolas, turmas, matriz BNCC), Secretaria (matrículas e enturmações), Pedagógico (diário e avaliações) e Servidores (lotação docente e Lei do Piso).
O Quadro de Horários organiza e governa a distribuição semanal do tempo pedagógico entre os componentes curriculares da matriz e os professores lotados.

Restrições arquiteturais aplicadas:
- Multi-tenancy estrito via `tenant_id` (bigint) e trait `TenantAware`.
- Chaves primárias UUID `CHAR(36)` nas tabelas do módulo (`HasUuids`).
- Prevenção de concorrência e choque de horários via lock pessimista (`SELECT FOR UPDATE`).
- Redação estritamente em Português do Brasil (pt-BR - AGENTS.md §7).
- Tipografia técnica para horários e códigos em `JetBrains Mono`.

## Objetivos e Não-Objetivos (Goals / Non-Goals)

**Objetivos:**
- Prover modelagem relacional para parametrização de turnos, tempos de aula (slots) e alocação de componentes/docentes.
- Implementar algoritmo transacional de detecção e bloqueio de choque de horários de professores em nível de rede municipal (mesmo tenant).
- Permitir vinculação de professores substitutos com intervalo de vigência formal.
- Expor contratos de API REST padronizados para montagem e consulta da grade.
- Desenvolver interface de visualização da grade semanal em tabela interativa no web-client com `@sysgov/ui`.

**Não-Objetivos:**
- Algoritmo genético / IA autônoma para auto-geração heurística de grade ótima (a montagem é assistida pelo operador escolar com validação determinística de regras e choques).
- Roteirização física de transporte (atendida no submódulo de Transporte).

## Decisões Técnicas (Decisions)

### Decisão 1: Estrutura de Modelagem Relacional e Tabelas

1. `educa_timetables` (Cabeçalho do Quadro de Horários):
   - `id` (UUID CHAR(36), PK), `tenant_id` (bigint, FK).
   - `school_class_id` (UUID, FK -> `educa_school_classes.id`), `academic_year_id` (UUID, FK -> `educa_academic_years.id`).
   - `nome` (string: ex "Grade Oficial Matutino 2026"), `turno` (enum: matutino, vespertino, noturno, integral).
   - `ativo` (boolean, default true), `data_inicio_vigencia` (date), `data_fim_vigencia` (date nullable).
   - SoftDeletes, timestamps e índice composto `(tenant_id, school_class_id, ativo)`.

2. `educa_timetable_slots` (Definição dos Tempos de Aula e Intervalos):
   - `id` (UUID CHAR(36), PK), `tenant_id` (bigint, FK).
   - `timetable_id` (UUID, FK -> `educa_timetables.id`).
   - `numero_tempo` (int: 1, 2, 3, etc.).
   - `hora_inicio` (time: "07:30:00"), `hora_fim` (time: "08:20:00").
   - `tipo` (enum: aula, intervalo, almoco, estudo_dirigido).
   - `descricao` (string nullable: "1º Tempo", "Recreio Geral").
   - Índice composto `(tenant_id, timetable_id, numero_tempo)`.

3. `educa_timetable_lessons` (Aulas / Alocação Semanal por Slot):
   - `id` (UUID CHAR(36), PK), `tenant_id` (bigint, FK).
   - `timetable_slot_id` (UUID, FK -> `educa_timetable_slots.id`).
   - `dia_semana` (tinyint: 1=Domingo, 2=Segunda, 3=Terça, 4=Quarta, 5=Quinta, 6=Sexta, 7=Sábado).
   - `curriculum_component_id` (UUID, FK -> `educa_curriculum_components.id`).
   - `teacher_employee_id` (UUID, FK -> `educa_employees.id`).
   - `substitute_employee_id` (UUID nullable, FK -> `educa_employees.id`).
   - `substituicao_inicio` (date nullable), `substituicao_fim` (date nullable), `substituicao_motivo` (string nullable).
   - Índice composto `(tenant_id, teacher_employee_id, dia_semana)`.

- **Justificativa**: Separação clara entre a geometria temporal da grade (`slots`), o cabeçalho (`timetables`) e o conteúdo lecionado (`lessons`), permitindo que turmas compartilhem matrizes de tempos e que substituições temporárias sejam auditadas sem perder o vínculo do titular original.

### Decisão 2: Algoritmo de Validação Anti-Choque (`TimetableCollisionService`)

- Toda gravação ou edição de aula executa `TimetableCollisionService::verificarConflitoDocente()`:
  - Consulta se o `teacher_employee_id` (ou substituto ativo) possui outro registro em `educa_timetable_lessons` para o mesmo `dia_semana`, cujo `timetable_slot` ativo se sobreponha à faixa `[hora_inicio, hora_fim]`.
  - A checagem busca em **todas** as escolas e turmas do `tenant_id`, impedindo que um professor seja alocado às 08:00 na Escola A e às 08:00 na Escola B.
  - Execução dentro de transação com `SELECT FOR UPDATE` nas alocações do docente para prevenir race condition em requisições simultâneas.

### Decisão 3: Integração com o Diário de Classe

- O `ClassDiaryService` passa a receber `timetable_lesson_id` opcionalmente.
- Ao abrir a chamada do dia, o endpoint `/api/educa/pedagogico/diarios/sugestoes-dia` consulta o quadro ativo da turma para o dia da semana correspondente e retorna os horários e disciplinas previstos.

## Riscos e Mitigações (Risks / Trade-offs)

- **[Risco] Professor lecionando em dois turnos contíguos com deslocamento físico**:
  - *Mitigação*: Alerta visual no frontend quando a distância temporal entre aulas em escolas diferentes for inferior a 30 minutos.
- **[Risco] Concorrência em semanas de planejamento pedagógico**:
  - *Mitigação*: Uso de lock pessimista por servidor durante a verificação de choque.
- **[Risco] Turmas de Educação Infantil unidocentes**:
  - *Mitigação*: O sistema permite alocar o mesmo professor de referência para todos os tempos da manhã com o componente polivalente da BNCC.
