# Spec Delta: Pessoas

## MODIFIED Requirements

### Requirement: Serialização estrita via API Resources sem exposição de dados sensíveis
O sistema SHALL serializar todas as respostas da API contendo pessoas, vínculos, documentos, endereços e contatos por meio de API Resources dedicados, garantindo a proteção da privacidade e conformidade com a LGPD. Para usuários padrão e consultas gerais, o sistema SHALL retornar exclusivamente o `cpf_mascarado`, nunca expondo `cpf` ou `cpf_hash` em texto puro. Para usuários com perfil de administrador ou permissão explícita `cadastros.pessoas.view_sensitive`, o sistema SHALL admitir a visualização dos dados civis completos sob demanda (`cpf_desmascarado`), registrando auditoria de acesso.

#### Scenario: CPF nunca serializado
- **WHEN** a API retorna o detalhe ou a listagem de pessoas para requisições comuns sem privilégios administrativos
- **THEN** a resposta JSON contém apenas o campo `cpf_mascarado` (com formato mascarado), sem os campos `cpf` em texto puro ou `cpf_hash`

#### Scenario: Desmascaramento autorizado para administradores
- **WHEN** um usuário com permissão `cadastros.pessoas.view_sensitive` ou perfil de administrador solicita a visualização completa do registro de uma pessoa
- **THEN** a API disponibiliza os campos civis completos e registra no `audit_logs` a visualização do dado sensível

#### Scenario: Serialização consistente de sub-entidades
- **WHEN** a API retorna documentos, endereços ou contatos vinculados a uma pessoa
- **THEN** a resposta é formatada pelos respectivos API Resources garantindo tipos padronizados e omissão de chaves internas desnecessárias

## ADDED Requirements

### Requirement: Visualização completa e desmascaramento sob demanda de dados sensíveis para administradores
O sistema SHALL prover na interface do módulo de pessoas e em seus modais a capacidade de visualizar dados completos (como CPF, filiação e documentos completos) exclusivamente para perfis de administrador ou usuários autorizados, mantendo o mascaramento visual ativo por padrão com botão de revelação/cópia rápida protegido por autorização e auditoria.

#### Scenario: Revelação de CPF restrita a administradores
- **WHEN** um administrador clica para revelar o CPF completo no modal de detalhe da pessoa
- **THEN** o sistema exibe o documento formatado em `JetBrains Mono` com botão de cópia rápida e emite registro de auditoria

#### Scenario: Bloqueio de visualização sensível para operadores comuns
- **WHEN** um usuário comum abre o modal de detalhe ou consulta uma pessoa
- **THEN** o CPF permanece estritamente mascarado (ex: `***.456.789-**`) e o botão de revelação fica indisponível

### Requirement: Modais ergonômicos e completos para o ciclo de vida da pessoa física
O sistema SHALL fornecer modais enriquecidos e ergonômicos construídos exclusivamente a partir dos primitivos do pacote `@sysgov/ui` para todo o ciclo de vida da pessoa: wizard de criação guiada (`NovaPessoaWizard`), modal de detalhe e gestão (`PessoaDetailView`), modal de promoção a usuário (`PromoverPessoaModal`) e modais de sub-entidades (documentos com emissão e UF, endereços com consulta integrada de CEP e contatos com canais e notificações), garantindo fluxo contínuo sem travamentos.

#### Scenario: Cadastro completo no Wizard com preenchimento de CEP
- **WHEN** o usuário informa um CEP válido durante a etapa de endereço do wizard de nova pessoa
- **THEN** o sistema busca e preenche automaticamente logradouro, bairro, cidade e UF, mantendo o foco pronto para o número predial

#### Scenario: Gestão de múltiplos documentos e contatos em modais dedicados
- **WHEN** o operador adiciona ou edita um documento civil no modal de sub-entidades
- **THEN** o sistema valida o tipo de documento, UF de emissão e órgão emissor em formulário tipado com feedback em tempo real

### Requirement: Prevenção de quebra de layout e tipografia técnica consistente
O sistema SHALL aplicar tipografia monoespaçada `JetBrains Mono` (`font-mono tabular-nums`) em todos os dados numéricos e identificadores (CPF, RG, NIS, CEP, datas, telefones e matrículas funcionais) e implementar regras rígidas de contenção de layout (`truncate`, `break-words`, `min-w-0` e tooltips informativos) em colunas de tabelas, cards e modais, prevenindo quebra indesejada de palavras ou estouro visual em qualquer resolução de tela.

#### Scenario: Exibição de nomes ou e-mails extensos sem distorção
- **WHEN** uma pessoa com nome civil longo ou endereço de e-mail corporativo extenso é exibida na tabela ou nos cards do modal
- **THEN** o sistema trunca graciosamente o texto mantendo o alinhamento dos botões e exibe o conteúdo integral ao passar o cursor (tooltip)

#### Scenario: Identificadores técnicos formatados em monoespaçamento
- **WHEN** datas de vigência, CPF, matrícula ou números de documentos são renderizados na interface
- **THEN** os caracteres utilizam `font-mono tabular-nums` assegurando legibilidade e alinhamento vertical perfeito

### Requirement: Hub central de dados mestres de pessoas para consumo compartilhado entre módulos
O sistema SHALL disponibilizar no `@sysgov/ui` e no `web-client` componentes e hooks universais de integração de pessoas (`PessoaPicker`, `usePessoaPicker`, `PessoaCard`, `PessoaBadge`), permitindo que qualquer módulo satélite (Requerimentos, Cemitérios, RH, Protocolo, Financeiro, CAPD, Cursos) realize busca rápida por nome/CPF com debounce, seleção fluida e cadastro rápido inline sem descontinuar a tarefa do operador.

#### Scenario: Seleção rápida e cadastro inline a partir de outro módulo
- **WHEN** um operador está em um formulário de outro módulo (ex.: Requerimento ou Concessão de Cemitério) e a pessoa ainda não existe
- **THEN** o componente permite abrir o modal de cadastro rápido de pessoa, salvar o registro e já selecioná-lo automaticamente no formulário de origem
