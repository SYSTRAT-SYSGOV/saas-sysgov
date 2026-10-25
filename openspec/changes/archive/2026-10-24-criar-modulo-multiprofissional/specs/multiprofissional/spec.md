## ADDED Requirements

### Requirement: Cadastros do módulo
O sistema DEVE (MUST) permitir a quem tem `multiprofissional.manage` manter cargos (descrição e objetivos), condições (descrição e CID) e tipos de atendimento. Item já usado DEVE (MUST) ser desativado em vez de excluído.

#### Scenario: Carga dos itens padrão
- **WHEN** o gestor aciona "Carregar itens padrão" duas vezes
- **THEN** os cargos e tipos de atendimento usuais existem uma única vez cada

#### Scenario: Item em uso
- **GIVEN** o tipo "Avaliação" foi usado em um atendimento
- **WHEN** o gestor tenta excluí-lo
- **THEN** o tipo é desativado e continua aparecendo nos atendimentos antigos

### Requirement: Profissional ligado ao Cadastro de Pessoas
Todo profissional DEVE (MUST) ter CPF válido e ser ligado a uma pessoa do Cadastro de Pessoas (criada quando não existir). Pode ser ligado a um usuário do tenant. O mesmo CPF não pode ter dois profissionais no tenant.

#### Scenario: CPF já cadastrado em Pessoas
- **GIVEN** a pessoa de CPF 529.982.247-25 já existe no Cadastro de Pessoas
- **WHEN** o gestor cadastra um profissional com esse CPF
- **THEN** o profissional é ligado à pessoa existente, sem duplicá-la

#### Scenario: CPF repetido
- **WHEN** o gestor cadastra um segundo profissional com o mesmo CPF
- **THEN** o servidor responde 422

### Requirement: Equipes
O sistema DEVE (MUST) permitir cadastrar equipes com nome, turno, profissionais e escolas atendidas.

#### Scenario: Equipe com escolas
- **WHEN** o gestor cria a equipe "Equipe Norte" com dois profissionais e duas escolas
- **THEN** a equipe aparece com os dois profissionais e as duas escolas

### Requirement: Estudante acompanhado e dados sensíveis
O sistema DEVE (MUST) permitir registrar um estudante (aluno do módulo Escola) como acompanhado, com condições (CID), profissionais de referência e laudos em arquivo privado. Condições e laudos DEVEM (MUST) ser restritos a `multiprofissional.acompanhar` ou `multiprofissional.manage`, e todo download de laudo DEVE (MUST) ser auditado.

#### Scenario: Consulta sem permissão clínica
- **GIVEN** um usuário só com `multiprofissional.view`
- **WHEN** ele abre um estudante acompanhado
- **THEN** vê o estudante e os profissionais de referência, mas não as condições nem os laudos

#### Scenario: Laudo protegido
- **GIVEN** um usuário só com `multiprofissional.view`
- **WHEN** ele pede o arquivo de um laudo
- **THEN** o servidor responde 403

#### Scenario: Um acompanhamento por estudante
- **WHEN** alguém tenta registrar de novo um estudante já acompanhado
- **THEN** o servidor responde 422

### Requirement: Registro de atendimento
Quem tem `multiprofissional.atender` DEVE (MUST) poder registrar atendimentos com data e hora, turno, escola, equipe (opcional), tipos, profissionais, estudantes e relato. O autor edita e exclui os próprios atendimentos; `multiprofissional.manage` edita e exclui qualquer um. A exclusão é lógica.

#### Scenario: Atendimento registrado
- **WHEN** um profissional registra um atendimento com dois estudantes e o tipo "Avaliação"
- **THEN** o atendimento aparece no histórico de cada um dos dois estudantes

#### Scenario: Edição por outro usuário
- **GIVEN** um atendimento criado pelo usuário A
- **WHEN** o usuário B, sem `multiprofissional.manage`, tenta alterá-lo
- **THEN** o servidor responde 403

### Requirement: Atendimento sigiloso
Num atendimento sigiloso, o relato DEVE (MUST) ser devolvido apenas ao autor, aos profissionais do atendimento que têm usuário e a quem tem `multiprofissional.manage`. Para os demais, o atendimento aparece com o relato mascarado.

#### Scenario: Relato mascarado
- **GIVEN** um atendimento sigiloso registrado pelo usuário A
- **WHEN** o usuário C, que não participa do atendimento e não é gestor, lista os atendimentos
- **THEN** ele vê o atendimento sem o relato e com a indicação "Registro sigiloso"

#### Scenario: Profissional participante
- **GIVEN** um atendimento sigiloso em que o profissional ligado ao usuário D participa
- **WHEN** D abre o atendimento
- **THEN** ele vê o relato completo

### Requirement: Isolamento e auditoria
Os dados do módulo DEVEM (MUST) ficar isolados por tenant e toda mutação DEVE (MUST) ser registrada no `audit_logs` com módulo `multiprofissional`, consultável por quem tem `multiprofissional.audit`.

#### Scenario: Tenants não se cruzam
- **GIVEN** atendimentos e profissionais nos tenants A e B
- **WHEN** um usuário do tenant B lista ou tenta abrir um atendimento do tenant A
- **THEN** não vê os dados do tenant A e recebe 404 ao abrir
