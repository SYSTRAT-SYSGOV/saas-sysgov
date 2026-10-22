# Spec Delta

## Purpose
Define como as cópias de dados civis mantidas pelos módulos são conciliadas com o cadastro central de pessoas, sem perda de informação, e como a adoção é acompanhada até a remoção das colunas duplicadas.

## ADDED Requirements

### Requirement: Conciliação das cópias de dados civis com o cadastro central
O sistema SHALL conciliar as cópias de dados civis existentes nos módulos resolvendo cada registro pela pessoa do cadastro central: por documento quando houver, ou criando pessoa com documento pendente quando não houver. A conciliação SHALL ser idempotente, nunca sobrescrever dado já cadastrado no cadastro mestre e poder ser repetida por módulo sem criar duplicidade.

#### Scenario: Registro com documento de pessoa já cadastrada
- **WHEN** a conciliação processa um registro de módulo cujo documento já existe no cadastro central
- **THEN** o registro passa a referenciar essa pessoa e os campos vazios dela podem ser completados, sem alterar os campos já preenchidos

#### Scenario: Registro sem documento
- **WHEN** a conciliação processa um registro de módulo sem documento
- **THEN** o sistema cria uma pessoa com documento pendente e vincula o registro a ela

#### Scenario: Reexecução da conciliação
- **WHEN** a conciliação de um módulo é executada novamente sobre registros já conciliados
- **THEN** nenhuma pessoa nova é criada e nenhum registro é alterado

### Requirement: Registro e revisão de divergências
O sistema SHALL registrar uma divergência quando o dado civil de um módulo conflitar com o do cadastro central (nome, nascimento, filiação, contato) e SHALL mantê-las consultáveis por módulo, permitindo ao usuário com permissão escolher qual valor prevalece, com auditoria.

#### Scenario: Divergência de nome
- **WHEN** o nome do registro do módulo difere do nome da pessoa no cadastro central
- **THEN** o sistema mantém o valor do cadastro central, registra a divergência com os dois valores e a origem, e a lista para revisão

#### Scenario: Resolução de divergência
- **WHEN** um usuário com permissão escolhe o valor que prevalece
- **THEN** o cadastro central é atualizado se o valor escolhido for o do módulo, a divergência é encerrada e a decisão é auditada

### Requirement: Remoção das colunas duplicadas somente após conciliação validada
O sistema SHALL remover as colunas civis duplicadas de um módulo apenas quando todos os registros do módulo estiverem vinculados a uma pessoa, não houver divergência aberta e a leitura de dados civis pelo módulo já ocorrer a partir do cadastro central.

#### Scenario: Módulo com divergências abertas
- **WHEN** a remoção das colunas duplicadas de um módulo é solicitada e ainda há divergência aberta ou registro sem pessoa
- **THEN** a remoção é bloqueada e o motivo é informado

#### Scenario: Módulo conciliado
- **WHEN** todos os registros do módulo estão vinculados e não há divergência aberta
- **THEN** a remoção é permitida e deixa de existir cópia civil no módulo

### Requirement: Relatório de adoção por módulo
O sistema SHALL disponibilizar, para a administração da plataforma, um relatório da adoção do cadastro central por módulo, com a quantidade de registros vinculados, sem vínculo, com documento pendente e com divergência aberta.

#### Scenario: Consulta do relatório
- **WHEN** um administrador consulta o relatório de adoção
- **THEN** o sistema lista cada módulo com os totais de registros vinculados, sem vínculo, com documento pendente e divergências abertas, sem expor dados civis individuais
