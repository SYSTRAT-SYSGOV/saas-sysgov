# Spec Delta

## Purpose

Organiza os passeios pedagógicos dos alunos do cadastro escolar — agenda do passeio, inscrição com autorização
dos responsáveis e pagamento, frota de veículos e mapa de assentos.

## ADDED Requirements

### Requirement: Dependência do cadastro escolar e isolamento
O módulo SHALL depender do módulo Escola, usar os alunos e turmas do cadastro escolar do mesmo tenant e tratar
registros de outro tenant como inexistentes.

#### Scenario: Inscrição de aluno de outro tenant
- **WHEN** a requisição inscreve em um passeio um aluno de outro tenant
- **THEN** o sistema rejeita com erro de validação

### Requirement: Permissões e perfis do módulo Passeio
O módulo SHALL declarar `passeio.view`, `passeio.passeios.manage` e `passeio.frota.manage`, e provisionar os
perfis **Coordenação de Passeios** (todas) e **Apoio** (`view`).

#### Scenario: Apoio não altera passeio
- **WHEN** um usuário com o perfil Apoio tenta alterar a data de um passeio
- **THEN** o sistema responde 403

### Requirement: Cadastro de passeios
O sistema SHALL manter passeios com nome, data, data limite para entrega das autorizações (não posterior à data
do passeio), horários de saída e retorno, local de saída, destino, cidade, valor por aluno em centavos,
responsável, observações e situação (`agendado`, `em_andamento`, `concluido`, `cancelado`). Um passeio
`concluido` ou `cancelado` SHALL NOT aceitar novas inscrições.

#### Scenario: Prazo de autorização depois do passeio
- **WHEN** a data limite das autorizações é posterior à data do passeio
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Inscrição em passeio cancelado
- **WHEN** o usuário inscreve um aluno em um passeio cancelado
- **THEN** o sistema rejeita informando a situação do passeio

### Requirement: Inscrições e autorizações
O sistema SHALL registrar a inscrição de um aluno por passeio (no máximo uma), com os indicadores "vai no
passeio", "autorização entregue" e "pago" e observação, e SHALL permitir inscrever todos os alunos de uma turma
de uma vez sem duplicar inscrições existentes.

#### Scenario: Inscrever turma inteira
- **WHEN** a turma tem 30 alunos, 5 já inscritos, e o usuário inscreve a turma
- **THEN** são criadas 25 inscrições e as 5 existentes permanecem inalteradas

### Requirement: Indicadores do passeio
O sistema SHALL informar, por passeio e no geral: alunos inscritos, autorizações entregues (quantidade e
percentual), total arrecadado e pendente em centavos, quantidade de veículos, capacidade total e assentos
ocupados.

#### Scenario: Arrecadação pendente
- **WHEN** o valor é 5000 centavos e 10 alunos vão ao passeio, 6 pagos
- **THEN** o arrecadado é 30000 e o pendente é 20000 centavos

### Requirement: Veículos
O sistema SHALL manter os veículos de um passeio com identificação, placa, motorista, telefone, capacidade de
lugares (1 a 100) e cor de identificação. Reduzir a capacidade abaixo do número de assentos ocupados SHALL ser
rejeitado.

#### Scenario: Capacidade menor que a ocupação
- **WHEN** o veículo tem 40 assentos ocupados e o usuário altera a capacidade para 30
- **THEN** o sistema rejeita informando a ocupação atual

### Requirement: Mapa de assentos
O sistema SHALL permitir atribuir um aluno inscrito no passeio (com "vai no passeio" marcado) a um assento de um
veículo do mesmo passeio, com número entre 1 e a capacidade. Cada assento SHALL ter no máximo um aluno e cada
aluno SHALL ocupar no máximo um assento por passeio. SHALL permitir liberar um assento.

#### Scenario: Assento ocupado
- **WHEN** o usuário atribui um aluno ao assento 12, já ocupado por outro aluno
- **THEN** o sistema rejeita informando que o assento está ocupado

#### Scenario: Aluno em dois veículos
- **WHEN** o aluno já tem assento no ônibus 1 e é atribuído a um assento do ônibus 2 do mesmo passeio
- **THEN** o sistema rejeita informando que o aluno já tem assento

### Requirement: Auditoria do módulo Passeio
Toda criação, alteração e exclusão no módulo SHALL gerar registro de auditoria e evento de domínio na outbox na
mesma transação, e exclusões de passeios, veículos e inscrições SHALL ser lógicas.

#### Scenario: Passeio cancelado auditado
- **WHEN** a situação de um passeio muda para `cancelado`
- **THEN** existe registro de auditoria com as duas situações e um evento `passeio.passeio.atualizado` na outbox
