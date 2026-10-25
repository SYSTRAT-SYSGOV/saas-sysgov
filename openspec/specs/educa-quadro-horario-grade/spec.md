# educa-quadro-horario-grade Specification

## Purpose
Gerenciamento da grade semanal de horários da turma, definição de turnos escolares, matriz de tempos de aula e intervalos de recreio.

## Requirements

### Requirement: Parametrização de Turnos e Matriz de Horários
O sistema DEVE (SHALL) permitir definir os turnos de funcionamento da escola e da turma (Matutino, Vespertino, Noturno ou Integral), com horários de início e término de cada tempo de aula e intervalos de recreio.

#### Scenario: Definição de grade regular matutina de 5 tempos
- **WHEN** a secretaria cadastra a matriz de horários do turno matutino para uma turma
- **THEN** o sistema gera os 5 slots de aula (ex: 07:30-08:20, 08:20-09:10, 09:10-10:00, 10:20-11:10, 11:10-12:00) com intervalo de recreio de 20 minutos entre o 3º e 4º tempo

#### Scenario: Rejeição de sobreposição de horários nos tempos
- **WHEN** o operador tenta salvar um tempo de aula com horário inicial anterior ao horário final do tempo precedente
- **THEN** o sistema rejeita a operação com erro de validação HTTP 422 indicando sobreposição de horários

### Requirement: Cabeçalho do Quadro de Horários da Turma
O sistema DEVE (SHALL) registrar o cabeçalho oficial do quadro de horários vinculado à turma, escola e ano letivo, mantendo controle de versão ativa e histórico de alterações.

#### Scenario: Criação de novo quadro de horários anual
- **WHEN** o gestor cria um quadro de horários para a Turma "6º Ano A" no ano letivo vigente
- **THEN** o sistema associa o quadro à turma com status ativo e isolamento por `tenant_id`

#### Scenario: Bloqueio de duplicidade de quadro ativo para a mesma turma
- **WHEN** o gestor tenta criar outro quadro ativo para a mesma turma no mesmo ano letivo
- **THEN** o sistema impede a duplicação e exige desativação do quadro anterior ou edição do existente
