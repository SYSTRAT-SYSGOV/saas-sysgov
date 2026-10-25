# Spec: Enturmação e Controle de Vagas (SYS-Educa Secretaria)

## Purpose
Controla a alocação física do estudante em turmas, aplicando validações rígidas de disponibilidade de vagas, choque de horários e numeração de chamada.

## Requirements

### Requirement: Alocação física na turma com trava de vagas
O sistema SHALL alocar o estudante em uma turma (`educa_school_classes`) vinculada à sua matrícula. Se a série na escola tiver a trava `bloquear_enturmacao_sem_vaga` ativada e a turma atingir sua lotação máxima, a enturmação SHALL ser recusada com erro 422 (`code=NO_VACANCIES_AVAILABLE`).

#### Scenario: Enturmação em turma com vagas
- **WHEN** o gestor enturma o aluno em uma turma com vagas disponíveis
- **THEN** a enturmação é registrada, a lotação efetiva da turma é incrementada em 1 e as vagas disponíveis recalculadas

#### Scenario: Enturmação bloqueada por falta de vaga
- **WHEN** a turma atingiu sua lotação máxima de 30 alunos e a trava está ativa
- **THEN** a operação é recusada com 422 informando que não há vagas na turma

### Requirement: Validação de conflito de horário
O sistema SHALL impedir a enturmação simultânea de um aluno em turmas com sobreposição de turno e horários presenciais de escolarização regular. Turmas de Atendimento Educacional Especializado (AEE) ou contraturno complementar SHALL ser permitidas.

#### Scenario: Conflito de horário no mesmo turno
- **WHEN** o gestor tenta enturmar um aluno do turno matutino em outra turma matutina de escolarização
- **THEN** a operação é recusada com 422 por choque de horários

#### Scenario: Matrícula regular com contraturno AEE
- **WHEN** o aluno possui turma regular matutina e é enturmado em turma complementar de AEE vespertina
- **THEN** a enturmação é autorizada com sucesso

### Requirement: Ordenação e número de chamada
O sistema SHALL manter o número de chamada (`numero_ordem`) sequencial na turma, permitindo ordenação alfabética inicial ou numeração cronológica conforme parametrização da rede.

#### Scenario: Atribuição de número de chamada
- **WHEN** o aluno é enturmado na turma
- **THEN** recebe o próximo número de ordem vago ou ordenado alfabeticamente
