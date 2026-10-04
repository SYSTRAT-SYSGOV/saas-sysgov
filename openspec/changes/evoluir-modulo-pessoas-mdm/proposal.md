# Proposta: Evolução do Módulo de Cadastro de Pessoas (MDM Central do SYSGOV)

## Por que (Why)

O módulo de Cadastro de Pessoas é o núcleo de dados mestres (Master Data Management - MDM) do SYSGOV, devendo ser compartilhado por todos os módulos atuais e futuros do ecossistema municipal (Requerimentos, Protocolo, RH, Cemitérios, Financeiro, Licitações, CAPD, Cursos, etc.), da mesma forma que o módulo de Usuários centraliza a autenticação e credenciais. Atualmente, a experiência do módulo necessita de evolução técnica e visual: os modais necessitam de maior completude e fluidez, dados cadastrais longos sofrem com quebras ou transbordamento de texto em telas menores, e há necessidade de implementar a política estrita de privacidade da LGPD onde a visualização completa de dados sensíveis (CPF desmascarado, filiação, NIS, histórico civil) seja restrita a perfis com privilégios de administrador ou autorização explícita, mantendo a visualização segura e mascarada para os demais usuários.

## O que muda (What Changes)

- **Controle de Visualização de Dados Sensíveis por Perfil**:
  - Implementação de controle de privacidade granular onde usuários comuns visualizam dados mascarados (`***.456.789-**`), enquanto administradores com a permissão `cadastros.pessoas.view_sensitive` têm a capacidade de visualizar e auditar o desmascaramento dos dados completos sob demanda.
  - No backend, adequação de `PessoaResource` e `PessoaController` para condicionar o retorno dos atributos sensíveis à permissão/perfil do usuário autenticado, registrando auditoria de acesso a dados pessoais no `audit_logs`.
- **Evolução e Completude dos Modais**:
  - Refatoração dos modais (`NovaPessoaWizard`, `PessoaDetailView`, `PromoverPessoaModal`, e modais de sub-entidades) utilizando exclusivamente os primitivos do `@sysgov/ui`.
  - Melhoria no wizard de cadastro e nos formulários para incluir todas as informações essenciais (dados civis completos, múltiplos documentos com UF e órgão emissor, endereço com autocompletar de CEP e coordenadas, múltiplos contatos com flags de principal e autorização de notificações, vínculos detalhados).
- **Blindagem Visual e Prevenção de Quebra de Texto**:
  - Aplicação rigorosa de regras tipográficas e de layout: uso de `JetBrains Mono` (`font-mono tabular-nums`) em CPF, RG, CEP, datas e matrículas.
  - Tratamento de overflow (`truncate`, `break-words`, `min-w-0`, tooltips em títulos e e-mails longos) garantindo que nenhum campo ou modal quebre o layout em resoluções desktop ou mobile.
- **Consolidação do Hub Central MDM no Frontend**:
  - Fortalecimento e enriquecimento dos componentes de integração exportados para outros módulos (`PessoaPicker`, `usePessoaPicker`, `PessoaCard`, `PessoaSummaryCard`), permitindo seleção rápida, busca com debounce e cadastro rápido inline sem perda do fluxo em outros módulos.

## Capacidades (Capabilities)

### Capacidades Modificadas (Modified Capabilities)
- `pessoas`: Adição de requisitos para visualização diferenciada de dados sensíveis para perfis administrativos com auditoria de acesso LGPD, prevenção de quebra de layout e enriquecimento dos modais de gestão e cadastro central.

## Impacto (Impact)

- **Backend (`apps/api/Modules/Pessoas`)**:
  - `PessoaResource`: Suporte à exposição condicional de dados desmascarados para usuários com permissão `cadastros.pessoas.view_sensitive` ou administradores.
  - `PessoaPolicy`: Novo método e permissão de verificação `viewSensitive`.
  - `AuditLogger`: Registro de evento de visualização/desmascaramento de dados sensíveis para conformidade LGPD.
- **Frontend (`apps/web-client/src/modules/pessoas`)**:
  - `PessoaDetailView.tsx`: Redesenho dos cards, abas e modais, botão de alternância para exibição de dados sensíveis para administradores, layout responsivo blindado contra quebra de texto.
  - `NovaPessoaWizard.tsx`: Wizard aprimorado, etapas claras com feedback visual, integração aprimorada de CEP e validação em tempo real.
  - `SubEntidadesManager.tsx`: Modais de documentos, endereços e contatos mais completos e ergonômicos.
  - `PessoasListView.tsx`: Tabela com colunas protegidas contra quebra de linha inadequada, paginação e filtros refinados.
- **Design System / Componentes Compartilhados (`packages/ui`)**:
  - Garantia de que `PessoaPicker`, `PessoaCard` e componentes relacionados atendam aos requisitos de responsividade, dados monoespaçados e suporte nativo ao consumo pelos módulos satélites.
