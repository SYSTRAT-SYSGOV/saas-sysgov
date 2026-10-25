# Spec Delta

## Purpose
Regulamenta a lotação e alocação de servidores nas unidades escolares municipais, controlando a jornada de trabalho semanal e a proporcionalidade obrigatória de 1/3 de hora-atividade estabelecida pela Lei Federal nº 11.738/2008.

## ADDED Requirements

### Requirement: Alocação semanal por unidade escolar e ano letivo
O sistema SHALL alocar o servidor em escolas municipais informando ano letivo, turno, dia da semana, horários de regência de classe e horas dedicadas a atividades extraclasse.

#### Scenario: Alocação docente em escola regular
- **WHEN** o gestor aloca o professor na "Escola Municipal Monteiro Lobato" para o ano de 2026 com 20 horas semanais
- **THEN** a alocação é registrada com sucesso vinculada à escola e ao servidor

### Requirement: Trava da Lei do Piso Nacional do Magistério
O sistema SHALL validar que, na alocação da jornada de trabalho de funções docentes, no máximo 2/3 da carga horária seja destinada à interação com educandos (regência) e no mínimo 1/3 seja destinada a horas-atividade (planejamento, estudos e avaliação), em conformidade com o art. 2º, § 4º da Lei Federal nº 11.738/2008.

#### Scenario: Validação bem-sucedida da proporção da Lei do Piso
- **WHEN** o gestor aloca uma jornada de 30 horas semanais contendo 20 horas de regência de classe e 10 horas de hora-atividade
- **THEN** a alocação é aprovada pois atende ao piso de 1/3 (10/30 = 33,33%) de horas extraclasse

#### Scenario: Bloqueio de alocação que desrespeita o 1/3 de hora-atividade
- **WHEN** o gestor tenta alocar uma jornada de 30 horas semanais com 25 horas de regência e apenas 5 horas de hora-atividade
- **THEN** a operação é rejeitada com erro 422 informando a violação da proporção mínima da Lei do Piso

### Requirement: Limite da carga horária contratual acumulada
O sistema SHALL impedir que a soma das horas alocadas do servidor nas diversas unidades escolares do município ultrapasse a sua carga horária contratual cadastrada.

#### Scenario: Tentativa de alocação com extrapolação de carga
- **WHEN** o servidor possui contrato de 40 horas semanais já totalmente alocado e o gestor tenta cadastrar uma nova alocação de 10 horas
- **THEN** a alocação é rejeitada com erro 422 informando excesso de carga horária contratual

### Requirement: Habilitação curricular docente
O sistema SHALL registrar quais componentes curriculares o professor está habilitado a ministrar na rede municipal, restringindo sua atribuição de turmas a essas matérias.

#### Scenario: Cadastro de habilitação curricular
- **WHEN** a coordenação pedagógica habilita o docente nas disciplinas de "Matemática" e "Ciências"
- **THEN** o professor torna-se elegível para alocação de turmas nesses componentes
