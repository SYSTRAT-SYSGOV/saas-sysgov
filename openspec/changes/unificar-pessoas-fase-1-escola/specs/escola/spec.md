# Spec Delta

## ADDED Requirements

### Requirement: Aluno vinculado ao cadastro central de pessoas
O sistema SHALL vincular todo aluno a uma pessoa do cadastro central, resolvendo a pessoa pelo CPF quando informado ou criando pessoa com documento pendente quando não houver CPF, e SHALL ler nome, nascimento, filiação e contatos do aluno a partir dessa pessoa.

#### Scenario: Aluno com CPF de pessoa já cadastrada
- **WHEN** um aluno é cadastrado com CPF que já existe no cadastro central
- **THEN** o aluno é vinculado à pessoa existente e o sistema não cria outra pessoa

#### Scenario: Aluno sem CPF
- **WHEN** um aluno é cadastrado sem CPF
- **THEN** o sistema cria uma pessoa com documento pendente, exige o responsável e vincula o aluno a essa pessoa

#### Scenario: Aluno sem responsável
- **WHEN** um aluno menor de idade sem CPF é cadastrado sem responsável
- **THEN** o sistema rejeita o cadastro informando que o responsável é obrigatório

### Requirement: Edição de dado civil do aluno grava no cadastro central
O sistema SHALL gravar na pessoa do cadastro central qualquer alteração de nome, nascimento, filiação ou contato feita na tela do aluno, registrando a origem `escola` na auditoria, e SHALL refletir a alteração em todos os módulos que referenciam a pessoa.

#### Scenario: Alteração do nascimento pelo módulo escolar
- **WHEN** o usuário corrige a data de nascimento de um aluno
- **THEN** a pessoa do cadastro central é atualizada e a auditoria registra a origem `escola`

### Requirement: Sugestão de pessoa existente no cadastro e na importação de alunos
O sistema SHALL, antes de criar uma pessoa para um aluno sem CPF, sugerir pessoas existentes com mesmo nome e data de nascimento, e SHALL tratar na importação por CSV como possível duplicidade os alunos sem CPF que coincidem com pessoa existente, exigindo confirmação.

#### Scenario: Importação com possível duplicidade
- **WHEN** uma linha do CSV sem CPF coincide em nome e nascimento com uma pessoa existente
- **THEN** a linha não cria pessoa automaticamente e é listada no relatório da importação para confirmação
