# Spec Delta

## ADDED Requirements

### Requirement: Contrato de consumo do cadastro de pessoas pelos módulos
O sistema SHALL exigir que todo módulo que registre uma pessoa (física ou jurídica) a referencie por `pessoa_id`, SHALL proibir que novos registros mantenham cópia própria dos dados civis (documento, nome, nascimento, filiação, contatos e endereço) e SHALL direcionar para o cadastro central qualquer alteração de dado civil feita a partir de um módulo.

#### Scenario: Novo registro referencia a pessoa
- **WHEN** um módulo cria um registro de uma pessoa (aluno, servidor, operador, participante)
- **THEN** o registro guarda a referência à pessoa do cadastro central e os dados civis são lidos dela, sem coluna civil duplicada no módulo

#### Scenario: Edição de dado civil a partir do módulo
- **WHEN** um usuário edita nome, nascimento, filiação ou contato de uma pessoa a partir da tela de um módulo
- **THEN** a alteração é gravada no cadastro central, auditada com a origem do módulo, e passa a valer para todos os módulos que referenciam a pessoa

#### Scenario: Consumidor não sobrescreve o cadastro mestre
- **WHEN** um módulo informa dados civis de uma pessoa que já existe no cadastro central
- **THEN** o sistema apenas completa campos vazios e preserva o que já está cadastrado, registrando o que foi completado

### Requirement: Cadastro rápido de pessoa com documento pendente em módulos consumidores
O sistema SHALL permitir que o cadastro rápido inline dos módulos crie uma pessoa sem CPF (documento pendente), exigindo nome e data de nascimento e, para menor de idade, o responsável, e SHALL devolver a pessoa criada já selecionada no formulário de origem.

#### Scenario: Aluno sem CPF cadastrado a partir do módulo escolar
- **WHEN** o usuário cadastra um aluno sem CPF pelo seletor de pessoa do módulo
- **THEN** o sistema cria a pessoa com documento pendente no cadastro central, vincula o aluno a ela e mostra o indicador de documento pendente

#### Scenario: Sugestão de pessoa existente antes de criar
- **WHEN** o usuário cadastra rapidamente uma pessoa sem CPF cujo nome e data de nascimento coincidem com uma pessoa existente
- **THEN** o sistema sugere a pessoa existente antes de criar um novo cadastro, e a criação só prossegue por confirmação explícita
