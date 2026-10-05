# Spec Delta: pessoas/mdm-consumo

## MODIFIED Requirements

### Requirement: Componentes reutilizáveis de seleção e exibição de pessoa no @sysgov/ui
O sistema SHALL disponibilizar no `@sysgov/ui` componentes de interface puramente controlados (`PessoaPicker`, `PessoaCard`, `PessoaFormModal`), desacoplados de clientes HTTP e do contexto de tenant, consumíveis por qualquer módulo do web-client, exibindo exclusivamente o nome e o CPF mascarado (`cpf_mascarado`) da pessoa e garantindo total conformidade com a LGPD sem nunca expor o CPF em texto puro nem `cpf_hash`.

#### Scenario: Picker sem exposição de dados
- **WHEN** um módulo consumidor abre o seletor `PessoaPicker` e digita parte do nome ou CPF
- **THEN** a lista de opções exibe exclusivamente o nome civil/social e o CPF com máscara padrão, sem incluir o CPF literal, hash interno ou dados sensíveis adicionais

#### Scenario: Fallback para cadastro quando pessoa não for encontrada
- **WHEN** o usuário busca por uma pessoa no `PessoaPicker` e nenhum registro é localizado
- **THEN** o componente oferece uma ação acessível para acionar o cadastro rápido inline, caso o usuário possua permissão de criação (`cadastros.pessoas.create`) e a propriedade `onQuickCreate` seja fornecida

### Requirement: Cadastro rápido inline de pessoa física via modal com validação estrita
O sistema SHALL disponibilizar o componente `PessoaFormModal` no `@sysgov/ui`, permitindo o cadastro simplificado de uma nova pessoa física diretamente de dentro de formulários de módulos consumidores, exigindo apenas os atributos essenciais (nome, CPF, nome social opcional, data de nascimento e contato inicial) e validando os dados no backend por meio do `StorePessoaRequest`, emitindo o evento `onCreated(pessoa)` após a persistência bem-sucedida.

#### Scenario: Cadastro rápido com dados mínimos
- **WHEN** o usuário preenche nome, CPF matematicamente válido e data de nascimento no `PessoaFormModal` e confirma
- **THEN** a pessoa é persistida no tenant, o seletor `PessoaPicker` é automaticamente preenchido com a nova pessoa selecionada e o modal é fechado com notificação de sucesso

#### Scenario: Permissão insuficiente para cadastro rápido
- **WHEN** um usuário sem a permissão `cadastros.pessoas.create` tenta acionar o cadastro rápido inline
- **THEN** o sistema oculta ou desabilita o botão de criação rápida e rejeita qualquer tentativa de submissão com erro HTTP 403

## ADDED Requirements

### Requirement: Hook de consulta e busca controlada de pessoas no web-client
O sistema SHALL fornecer no web-client o hook `usePessoas`, encapsulando a busca de pessoas por nome ou CPF com debounce configurado (300ms), controle de paginação (`page`, `per_page` padrão 20), estados reativos de carregamento e tratamento de erro amigável, consumindo exclusivamente o cliente `PessoasClient` já instanciado no `api.ts` do módulo pessoas, sem instanciar novo cliente HTTP.

#### Scenario: Busca controlada com debounce
- **WHEN** o usuário digita termos sucessivos de busca no seletor
- **THEN** a requisição ao backend é disparada somente após 300ms de inatividade do teclado, atualizando a listagem de pessoas e os metadados de paginação

#### Scenario: Tratamento de erro resiliente
- **WHEN** ocorre uma falha temporária de rede ou de comunicação na busca de pessoas
- **THEN** o hook define o estado de erro com uma mensagem clara para o usuário sem travar a interface nem expor detalhes internos de infraestrutura

### Requirement: Manutenção de testes automatizados dos componentes e do hook
O sistema SHALL manter cobertura de testes automatizados com Vitest e Testing Library para os componentes `PessoaPicker`, `PessoaCard` e `PessoaFormModal` no `@sysgov/ui` e para o hook `usePessoas` no `apps/web-client`, garantindo que renderização, busca controlada, mascaramento de CPF e seleção funcionem conforme os contratos estabelecidos.

#### Scenario: Execução bem-sucedida da suíte de testes
- **WHEN** a suíte de testes unitários e de componente é executada
- **THEN** todos os testes de `PessoaPicker`, `PessoaCard`, `PessoaFormModal` e `usePessoas` passam com sucesso e sem advertências de tipagem TypeScript
