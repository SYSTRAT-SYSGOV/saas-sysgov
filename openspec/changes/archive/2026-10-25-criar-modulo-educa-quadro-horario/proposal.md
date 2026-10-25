# Proposta: Submódulo Quadro de Horários e Grade Semanal no SYS-Educa

## Por que (Why)

A distribuição e gestão da grade horária semanal de aulas é um dos elementos centrais da organização pedagógica e administrativa de uma rede de ensino. 
No sistema legado (i-Educar), a gestão de horários (`pmieducar.quadro_horario` e rotinas de mais de 800 linhas em scripts legados) sofria com:
1. Concorrência frágil e ausência de bloqueios em alocações de professores em múltiplas turmas ou turnos, ocasionando choque de horários (dois registros simultâneos para o mesmo docente no mesmo dia/horário).
2. Desconexão entre a alocação de horários e o Diário de Classe, exigindo que o professor selecione manualmente turmas e disciplinas a cada aula em vez de carregar a aula prevista para o horário atual.
3. Rastreabilidade precária de substituições temporárias de docentes (licenças e afastamentos), onde o substituto sobrescrevia o registro do titular perdendo o histórico de regência.

A modernização deste submódulo no SYSGOV entrega um motor multi-tenant robusto de grade semanal com:
- Definição atômica de turnos, matriz de tempos de aula e intervalos de recreio.
- Alocação de slots (componente curricular + docente titular/substituto) com validação matemática estrita anti-choque de horários.
- Rastreabilidade de vigência da substituição docente vinculada aos afastamentos de servidores.
- Visualização e montagem interativa da grade no frontend web-client com exportação e integração direta ao diário de classe.

## O que muda (What Changes)

- **Matriz de Tempos e Turnos da Turma**: Configuração de horários de início e término de cada período de aula (ex: 1º horário: 07:30 - 08:20, 2º horário: 08:20 - 09:10, Recreio: 09:10 - 09:30, etc.), adaptável a turnos matutino, vespertino, noturno ou integral.
- **Alocação de Slots com Trava Anti-Choque**: Alocação de componente curricular e professor em slots específicos de dias da semana (Segunda a Sábado). Validação transacional que impede alocação concorrente de um mesmo docente no mesmo horário em qualquer turma ou escola da rede.
- **Substituição Docente Histórica**: Registro formal de professor substituto com período de vigência e motivo vinculado ao afastamento do titular, preservando o histórico de quem ministrou cada aula no diário.
- **Integração com o Diário de Classe**: O diário de classe passa a sugerir automaticamente o horário e o componente curricular da aula baseado no quadro de horários oficial da turma para o dia letivo corrente.
- **Frontend Interativo no Web-Client**: Visualizador e construtor de grade horária semanal no portal do cliente, permitindo visualização por turma e visualização por professor.

## Capacidades (Capabilities)

### Novas Capacidades (New Capabilities)
- `educa-quadro-horario-grade`: Grade semanal, configuração de matriz de tempos de aula, turnos e intervalos por turma e ano letivo.
- `educa-quadro-horario-slots`: Alocação de aulas por componente e docente com validação estrita anti-choque de horário em nível de tenant.
- `educa-quadro-horario-diario`: Sincronização do quadro com o diário de classe e gestão histórica de substituições temporárias.

### Capacidades Modificadas (Modified Capabilities)
Nenhuma especificação prévia teve seus requisitos alterados.

## Impacto (Impact)

- **Backend (`apps/api/Modules/Educa`)**:
  - Novas migrations para `educa_timetables` (cabeçalho da grade da turma), `educa_timetable_slots` (horários/tempos de aula) e `educa_timetable_lessons` (vínculo componente + professor + substituto).
  - Novos Models Eloquent com `TenantAware`, `HasUuids` e `SoftDeletes`.
  - Novos Services: `TimetableService` e `TimetableCollisionService` (motor de detecção de choque de horários).
  - FormRequests para validação estrita de horários e regras de negócio.
  - Controllers e rotas REST sob `/api/educa/core/turmas/{turmaId}/horarios` e `/api/educa/quadro-horarios`.
- **Frontend (`apps/web-client`)**:
  - Nova visualização e aba de grade horária semanal integrada ao módulo Educa.
  - Componente de grade visual semanal (segunda a sábado) com badges de componentes e professores em `JetBrains Mono`.
