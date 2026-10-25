# educa-transporte-estudantes Specification

## Purpose
Permite vincular estudantes matriculados a rotas, veículos e pontos de parada, com controle estrito de lotação física de assentos.

## Requirements

### Requirement: Alocação Nominal com Trava de Lotação Máxima
O sistema DEVE (MUST) alocar estudantes em rotas e veículos específicos respeitando o limite físico de passageiros sentados do veículo, impedindo qualquer alocação que resulte em sobrelotação.

#### Scenario: Alocação bem-sucedida dentro da capacidade
- **WHEN** o usuário alocar um estudante com transporte público ativo em uma rota cujo veículo possua vagas disponíveis
- **THEN** o sistema conclui a alocação, incrementa a ocupação efetiva do veículo e vincula o ponto de embarque

#### Scenario: Bloqueio de alocação por capacidade esgotada
- **WHEN** o usuário tentar alocar um estudante em um veículo cuja lotação máxima já tenha sido atingida
- **THEN** o sistema recusa a operação com erro HTTP 422 informando indisponibilidade de assentos

### Requirement: Verificação de Vínculo com Perfil do Estudante
O sistema DEVE (MUST) validar se o estudante a ser alocado possui matrícula ativa e indicação expressa de necessidade de transporte público escolar na ficha individual (`EducaStudentProfile`).

#### Scenario: Bloqueio de estudante sem flag de transporte público
- **WHEN** o usuário tentar alocar no transporte um estudante cujo perfil não indique uso de transporte escolar público
- **THEN** o sistema emite alerta exigindo a atualização prévia da ficha cadastral do estudante

### Requirement: Desalocação e Liberação de Assento
O sistema DEVE (MUST) permitir o encerramento da alocação de um estudante no transporte escolar, liberando imediatamente o assento para novas alocações e registrando a data de saída.

#### Scenario: Desalocação voluntária ou por transferência
- **WHEN** o operador encerrar a alocação de um estudante na rota
- **THEN** o sistema atualiza o status da alocação para "encerrada" e decrementa a ocupação efetiva do veículo
