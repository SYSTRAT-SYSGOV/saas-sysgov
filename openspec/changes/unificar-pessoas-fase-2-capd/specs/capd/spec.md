# Spec Delta

## ADDED Requirements

### Requirement: Servidor avaliado vinculado ao cadastro central de pessoas
O sistema SHALL vincular cada servidor do CAPD a uma pessoa do cadastro central e SHALL manter no CAPD apenas os dados do domínio da avaliação (matrícula, cargo, grupo funcional, hierarquia e afastamentos), lendo nome, nascimento e contatos da pessoa.

#### Scenario: Servidor com CPF já cadastrado como pessoa
- **WHEN** a sincronização de RH traz um servidor cujo CPF já existe no cadastro central
- **THEN** o servidor é vinculado à pessoa existente, sem criar outra pessoa e sem sobrescrever dados já cadastrados

#### Scenario: Servidor sem CPF válido
- **WHEN** a sincronização de RH traz um servidor sem CPF válido
- **THEN** o sistema cria uma pessoa com documento pendente, vincula o servidor a ela e não descarta o registro nem interrompe o lote

### Requirement: Integridade das avaliações seladas na troca da fonte dos dados civis
O sistema SHALL preservar, sem alteração, as avaliações seladas e os ciclos homologados quando os dados civis do servidor passarem a ser lidos do cadastro central.

#### Scenario: Avaliação selada após a conciliação
- **WHEN** a conciliação vincula servidores às pessoas do cadastro central
- **THEN** a nota final, o hash e os dados de qualquer avaliação já selada permanecem idênticos aos anteriores
