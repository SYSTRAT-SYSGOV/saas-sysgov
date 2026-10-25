# Spec Delta: Alocação de Aulas e Trava Anti-Choque

## Purpose

Alocação de componentes curriculares e docentes nos tempos da grade semanal, com trava matemática contra choque de horários de professores e turmas.

## ADDED Requirements

### Requirement: Alocação de Componente e Docente no Slot
O sistema DEVE (SHALL) permitir vincular a cada dia da semana (Segunda a Sábado) e tempo de aula um componente curricular previsto na matriz da turma e um professor habilitado.

#### Scenario: Alocação bem-sucedida de aula
- **WHEN** a secretaria aloca a disciplina de Matemática com o Professor Titular na Segunda-feira no 1º tempo da turma
- **THEN** o sistema grava o slot associando componente, servidor e turma com sucesso

#### Scenario: Validação de componente pertencente à matriz da turma
- **WHEN** a secretaria tenta alocar um componente que não integra a matriz curricular daquela turma
- **THEN** o sistema rejeita a operação com erro de inconsistência curricular

### Requirement: Prevenção Transacional Anti-Choque de Horários Docente
O sistema DEVE (SHALL) verificar se o docente alocado já possui aula atribuída no mesmo dia da semana e faixa de horário em qualquer turma ou escola do mesmo tenant.

#### Scenario: Bloqueio imediato por colisão de horários de professor
- **WHEN** o operador tenta alocar o Professor João na Turma B na Terça-feira das 08:00 às 08:50, sendo que ele já está alocado na Turma A no mesmo horário
- **THEN** o sistema bloqueia a alocação e retorna erro explicativo identificando a turma e escola conflitante

#### Scenario: Concorrência simultânea com lock pessimista
- **WHEN** dois operadores em abas distintas tentam alocar o mesmo professor no mesmo horário simultaneamente
- **THEN** o sistema utiliza transação atômica e lock pessimista garantindo que apenas a primeira requisição seja gravada e a segunda rejeitada
