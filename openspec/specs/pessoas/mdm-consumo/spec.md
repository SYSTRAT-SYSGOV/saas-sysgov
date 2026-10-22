# pessoas/mdm-consumo Specification

## Purpose
Disponibiliza componentes de interface reutilizáveis no @sysgov/ui, hooks compartilhados e SDK unificado para permitir que todos os módulos do ecossistema SYSGOV consumam o cadastro central de pessoas físicas (MDM) sem duplicar dados civis e em estrita conformidade com a LGPD.

## Requirements

### Requirement: Componentes reutilizáveis de seleção e exibição de pessoa no @sysgov/ui
O sistema SHALL disponibilizar componentes de interface reutilizáveis (`PessoaPicker`, `PessoaSearchInput`, `PessoaCard`, `PessoaSummary`, `PessoaVinculosBadge`) no pacote `@sysgov/ui`, consumíveis por qualquer módulo do painel administrativo e do cliente, exibindo apenas o nome e o CPF mascarado da pessoa, sem nunca expor o CPF em texto puro nem dados civis completos fora do módulo de pessoas.

#### Scenario: Picker sem exposição de dados
- **WHEN** um módulo consumidor abre o seletor `PessoaPicker` e digita parte do nome ou CPF
- **THEN** a lista de opções exibe exclusivamente o nome civil/social e o CPF com máscara padrão, sem incluir o CPF literal, hash interno ou dados sensíveis adicionais

#### Scenario: Fallback para cadastro quando pessoa não for encontrada
- **WHEN** o usuário busca por uma pessoa no `PessoaPicker` e nenhum registro é localizado
- **THEN** o componente oferece uma ação acessível para acionar o cadastro rápido inline, caso o usuário possua permissão de criação

### Requirement: Cadastro rápido inline de pessoa física via modal com validação estrita
O sistema SHALL disponibilizar o componente `PessoaFormModal` no `@sysgov/ui`, permitindo o cadastro simplificado de uma nova pessoa física diretamente de dentro de formulários de módulos consumidores, exigindo apenas os atributos essenciais (nome, CPF, nome social opcional, data de nascimento e contato inicial) e validando os dados no backend por meio do `StorePessoaRequest`.

#### Scenario: Cadastro rápido com dados mínimos
- **WHEN** o usuário preenche nome, CPF matematicamente válido e data de nascimento no `PessoaFormModal` e confirma
- **THEN** a pessoa é persistida no tenant, o seletor `PessoaPicker` é automaticamente preenchido com a nova pessoa selecionada e o modal é fechado com notificação de sucesso

#### Scenario: Permissão insuficiente para cadastro rápido
- **WHEN** um usuário sem a permissão `cadastros.pessoas.create` tenta acionar o cadastro rápido inline
- **THEN** o sistema oculta ou desabilita o botão de criação rápida e rejeita qualquer tentativa de submissão com erro HTTP 403

### Requirement: Resumo e badges de vínculos funcionais da pessoa
O sistema SHALL disponibilizar os componentes `PessoaCard` e `PessoaVinculosBadge` para exibir em módulos consumidores o resumo dos dados públicos da pessoa física (nome, CPF mascarado e vínculos ativos com suas respectivas matrículas e tipos), acompanhado de link contextual de navegação para a ficha completa no módulo de pessoas.

#### Scenario: Exibição de resumo com vínculos
- **WHEN** um módulo consumidor renderiza os detalhes de um registro associado a uma pessoa física
- **THEN** o `PessoaCard` apresenta o nome, CPF mascarado, badges estilizados dos vínculos ativos e um botão que redireciona o usuário para o detalhamento da pessoa no módulo central

### Requirement: Consulta e listagem compacta com proteção LGPD
O sistema SHALL disponibilizar no cliente TypeScript (`@sysgov/sdk`) e na API suporte à busca rápida com projeção enxuta de campos (`id`, `nome`, `cpf_mascarado`), garantindo resposta leve para comboboxes e impedindo categoricamente a serialização de `cpf` ou `cpf_hash`.

#### Scenario: Busca compacta segura
- **WHEN** o `PessoaPicker` consulta a listagem de pessoas informando o parâmetro de busca rápida
- **THEN** a resposta da API retorna uma coleção compacta contendo apenas os atributos públicos autorizados (`id`, `nome`, `cpf_mascarado`), sem expor CPF em claro ou hashes internos

### Requirement: Vínculo visual explícito entre Usuário e Pessoa sem unificação de formulários
O sistema SHALL manter pessoa (identidade civil) e usuário (conta de acesso ao sistema) como entidades modeladas separadamente, permitindo que a interface do módulo de usuários (`apps/web-client/src/modules/users`) exiba o vínculo com a pessoa física correspondente via `PessoaCard`, sem consolidar ou unificar os formulários de cadastro de usuário e pessoa em uma única tela.

#### Scenario: Usuário com pessoa vinculada
- **WHEN** um administrador visualiza o cadastro de um usuário que possui pessoa física associada
- **THEN** o sistema exibe o card de resumo da pessoa associada com link de redirecionamento para o cadastro de pessoas, sem mesclar os campos civis no formulário de usuário

### Requirement: Registro automatizado no Module Registry com proteção por permissão
O sistema SHALL manter o módulo central de pessoas registrado no arquivo `src/config/moduleRegistry.generated.ts` gerado exclusivamente pelo script de automação (`scripts/generate-module-registry.js`), com a rota protegida pelo `ModuleRouteGuard` e exigência da permissão `cadastros.pessoas.view`.

#### Scenario: Registry gerado
- **WHEN** o script de sincronização de módulos do web-client é executado
- **THEN** o módulo `pessoas` é registrado preservando as permissões de acesso e o carregamento tardio (lazy loading) sem exigir edições manuais no arquivo gerado

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
