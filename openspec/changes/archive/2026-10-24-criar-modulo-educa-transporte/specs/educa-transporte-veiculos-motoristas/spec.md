# Spec Delta: Veículos, Vistorias e Condutores de Transporte Escolar

## Purpose

Permite cadastrar e fiscalizar a frota de veículos escolares, vistorias semestrais do DETRAN e o credenciamento legal de condutores e monitores.

## ADDED Requirements

### Requirement: Cadastro de Frota de Veículos Escolares
O sistema DEVE (MUST) cadastrar veículos de transporte escolar próprios ou terceirizados registrando placa, marca/modelo, ano de fabricação, tipologia veicular, número de chassi/RENAVAM e capacidade máxima oficial de passageiros sentados.

#### Scenario: Registro de veículo com capacidade e tipologia oficial
- **WHEN** o usuário cadastrar um veículo informando placa e capacidade máxima de assentos
- **THEN** o sistema cadastra o veículo com status "regular" e trava a capacidade máxima para alocações

#### Scenario: Bloqueio de veículo com capacidade zerada
- **WHEN** o usuário tentar cadastrar um veículo com capacidade máxima de passageiros menor ou igual a zero
- **THEN** o sistema rejeita a operação com erro de validação

### Requirement: Controle de Vistorias Obrigatórias do DETRAN
O sistema DEVE (MUST) registrar laudos periódicos de vistoria veicular obrigatória do órgão de trânsito (DETRAN), com data de realização, número do termo, data de validade semestral e resultado (aprovado ou reprovado).

#### Scenario: Lançamento de vistoria aprovada
- **WHEN** o usuário registrar uma vistoria com resultado "aprovado" e data de validade vigente
- **THEN** o sistema atualiza o status de circulação do veículo para "autorizado"

#### Scenario: Bloqueio de veículo com vistoria vencida
- **WHEN** a data de validade da última vistoria de um veículo expirar
- **THEN** o sistema sinaliza pendência regulatória e impede a alocação de novos estudantes no veículo

### Requirement: Credenciamento de Condutores e Monitores
O sistema DEVE (MUST) credenciar motoristas e monitores escolares vinculados à base de `Pessoas`, exigindo CNH categorias D ou E vigentes, certidões negativas e comprovante de curso especializado de condutor de escolares.

#### Scenario: Cadastro de condutor habilitado
- **WHEN** o usuário cadastrar um condutor com CNH válida categoria D ou E e curso de transporte escolar
- **THEN** o sistema habilita o condutor para escalação em rotas de transporte

#### Scenario: Rejeição de condutor sem categoria mínima exigida
- **WHEN** o usuário tentar cadastrar como condutor uma pessoa com CNH categoria inferior a D
- **THEN** o sistema rejeita a habilitação informando incompatibilidade com a legislação de trânsito
