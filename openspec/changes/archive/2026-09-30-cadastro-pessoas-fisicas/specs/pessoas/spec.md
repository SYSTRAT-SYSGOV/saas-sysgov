# Spec Delta

## Purpose

Mantém um cadastro único de pessoa física por tenant, separado da conta de acesso ao SYSGOV, servindo de base (master data) para servidores públicos e munícipes consumida por outros módulos do ecossistema.

## ADDED Requirements

### Requirement: Cadastro único de pessoa física por tenant
O sistema SHALL manter um cadastro de pessoas físicas por tenant, com o CPF como chave de negócio única dentro do tenant.

#### Scenario: Cadastro único por tenant
- **WHEN** uma pessoa é cadastrada com CPF já existente no tenant
- **THEN** o sistema rejeita a duplicação e retorna erro de unicidade

### Requirement: Separação entre identidade civil e conta de acesso
O sistema SHALL representar a identidade civil da pessoa (cadastro) e a conta de acesso ao SYSGOV (usuário) como entidades distintas, em que uma pessoa possui zero ou um usuário vinculado e todo usuário corresponde a exatamente uma pessoa.

#### Scenario: Pessoa sem usuário
- **WHEN** uma pessoa é importada do sistema da prefeitura
- **THEN** ela fica disponível no cadastro sem conta de acesso ao SYSGOV

### Requirement: Vínculos de papel modelados em tabela própria
O sistema SHALL modelar cada papel que uma pessoa exerce (servidor de carreira, estagiário, comissionado, CLT, munícipe, contribuinte, aluno, paciente) como um vínculo em tabela própria, associado à pessoa, e não como um atributo fixo do cadastro da pessoa.

#### Scenario: Múltiplos vínculos
- **WHEN** uma pessoa é cadastrada como servidor de carreira e depois vinculada como munícipe
- **THEN** o sistema mantém um único cadastro de pessoa com dois vínculos, sem duplicar a pessoa

#### Scenario: Vínculo com vigência
- **WHEN** um vínculo é encerrado (ex.: exoneração de cargo comissionado)
- **THEN** o sistema registra a data de término do vínculo sem excluir o histórico nem a pessoa

### Requirement: Documentos, endereços e contatos multivalorados
O sistema SHALL permitir que uma pessoa tenha múltiplos documentos (RG, CNH, título de eleitor), múltiplos endereços e múltiplos contatos (celular, e-mail, telefone), cada um associado à pessoa; entre os contatos de um mesmo tipo, no máximo um SHALL ser marcado como principal.

#### Scenario: Contato principal único por tipo
- **WHEN** um segundo e-mail é marcado como principal para uma pessoa que já tinha um e-mail principal
- **THEN** o sistema desmarca o e-mail principal anterior e mantém apenas o novo como principal

### Requirement: Busca e listagem de pessoas
O sistema SHALL permitir localizar pessoas por nome ou CPF e filtrar a listagem por tipo de vínculo e por status da pessoa.

#### Scenario: Busca por CPF
- **WHEN** o usuário busca por um CPF válido cadastrado no tenant
- **THEN** o sistema retorna a pessoa correspondente, mesmo que o CPF tenha sido digitado com máscara ou pontuação

#### Scenario: Filtro por tipo de vínculo
- **WHEN** o usuário filtra a listagem pelo vínculo "municipe"
- **THEN** o sistema retorna apenas pessoas com um vínculo desse tipo, incluindo as que também têm outros vínculos

### Requirement: Promoção a usuário por ação explícita e auditada
O sistema SHALL promover uma pessoa a usuário apenas por ação explícita de um administrador com a permissão `cadastros.pessoas.promote`, nunca automaticamente a partir de cadastro ou importação.

#### Scenario: Promoção a usuário
- **WHEN** um administrador promove uma pessoa existente a usuário
- **THEN** o sistema cria a conta de acesso vinculada à pessoa por CPF, registra a ação em audit_logs e não cria uma segunda pessoa

#### Scenario: Promoção sem permissão
- **WHEN** um usuário sem a permissão `cadastros.pessoas.promote` tenta promover uma pessoa a usuário
- **THEN** o sistema rejeita a ação com erro de autorização e nenhuma conta é criada

#### Scenario: Pessoa já promovida
- **WHEN** um administrador tenta promover a usuário uma pessoa que já possui conta de acesso vinculada
- **THEN** o sistema rejeita a ação informando que a pessoa já possui usuário

### Requirement: Importação de pessoa com deduplicação por CPF
O sistema SHALL importar pessoas de sistemas de gestão da prefeitura de forma assíncrona, buscando por CPF no tenant: se a pessoa já existir, o sistema SHALL atualizar/vincular o registro existente; se não existir, o sistema SHALL criar um novo registro. A importação SHALL NOT promover a pessoa a usuário.

#### Scenario: Importação com deduplicação
- **WHEN** uma pessoa chega da integração com CPF já existente no tenant
- **THEN** o sistema atualiza/vincula o registro existente em vez de criar duplicado

#### Scenario: Importação de pessoa nova
- **WHEN** uma pessoa chega da integração com CPF não cadastrado no tenant
- **THEN** o sistema cria um novo registro de pessoa sem conta de acesso associada

### Requirement: Integração externa resiliente
O sistema SHALL isolar cada integração com sistema de gestão da prefeitura em um adapter próprio, consumido de forma assíncrona (fila), com timeout e fallback, de modo que uma integração externa indisponível ou lenta SHALL NOT impedir o uso do cadastro de pessoas nem de qualquer outra funcionalidade do sistema.

#### Scenario: Sistema externo indisponível
- **WHEN** o sistema de gestão da prefeitura está indisponível durante uma tentativa de importação
- **THEN** o sistema registra a falha para nova tentativa posterior e continua respondendo normalmente às demais operações do cadastro de pessoas

### Requirement: Controle de acesso por permissão específica
O sistema SHALL exigir, no backend, a permissão específica correspondente para cada ação sobre o cadastro de pessoas (`cadastros.pessoas.view` para consulta, `cadastros.pessoas.create` para criação, `cadastros.pessoas.update` para edição, `cadastros.pessoas.delete` para exclusão), independentemente do que a interface exibir.

#### Scenario: Edição sem permissão
- **WHEN** um usuário sem a permissão `cadastros.pessoas.update` tenta editar uma pessoa
- **THEN** o sistema rejeita a ação com erro de autorização, mesmo que a requisição chegue direto à API sem passar pela interface

### Requirement: Isolamento por tenant
O sistema SHALL isolar todos os dados do cadastro de pessoas por tenant, com a unicidade do CPF aplicada apenas dentro do mesmo tenant.

#### Scenario: Isolamento por tenant
- **WHEN** duas prefeituras cadastram a mesma pessoa física
- **THEN** cada tenant mantém seu registro independente sem conflito de unicidade
