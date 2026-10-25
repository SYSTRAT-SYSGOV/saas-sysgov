# educa-pedagogico-diario-classe Specification

## Purpose
Gerencia o registro pedagógico diário de aulas ministradas pelos docentes, incluindo objetivos de aprendizagem, conteúdos curriculares e validação de dias letivos oficiais.

## Requirements

### Requirement: Registro de aula e conteúdo ministrado
O sistema SHALL permitir que o docente registre a aula ministrada para uma turma e componente curricular, informando a data, a quantidade de aulas dadas, o resumo dos conteúdos trabalhados e as habilidades BNCC correlatas.

#### Scenario: Registro de aula com sucesso
- **WHEN** o docente submete o registro de aula com data, turma e conteúdo em dia letivo válido
- **THEN** o registro é salvo com status "publicado" e vinculado à turma

### Requirement: Validação de dia letivo oficial
O sistema SHALL validar se a data informada para o registro de aula corresponde a um dia letivo oficial ativo no calendário escolar da turma ou escola (`calendar_days.is_school_day = true`). A tentativa de lançar aula em feriado ou dia não letivo SHALL ser recusada com erro 422 (`code=NON_SCHOOL_DAY`).

#### Scenario: Tentativa de lançamento em dia não letivo
- **WHEN** o docente tenta lançar aula em uma data marcada como recesso ou feriado no calendário
- **THEN** a operação é recusada com erro 422 informando que a data não é um dia letivo
