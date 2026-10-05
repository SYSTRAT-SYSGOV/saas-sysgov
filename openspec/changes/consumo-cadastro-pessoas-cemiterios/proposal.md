# Proposta: Consumo do cadastro central de pessoas no web-client (Fase 2 — piloto Cemitérios)

## Por que (Why)
O ecossistema SYSGOV opera como um SaaS de gestão pública municipal multi-tenant onde a entidade `Pessoa` representa o master data civil dos cidadãos. Atualmente, telas como o cadastro de operadores (coveiros e pedreiros) e empreiteiros no módulo de Cemitérios mantêm campos civis paralelos (nome e CPF), duplicando informações cadastrais, violando a integridade do cadastro único e dificultando a rastreabilidade e governança sob a LGPD.

Esta mudança conclui no frontend (`apps/web-client` e `packages/ui`) a camada de consumo reutilizável do cadastro central de pessoas (Fase 2), implementando componentes controlados no Design System (`@sysgov/ui`), um hook com busca debounceada e paginação no cliente, e adotando o módulo de Cemitérios como piloto prático, vinculando novos cadastros diretamente por `pessoa_id` sem duplicar dados civis nem alterar o backend existente.

## O que muda (What Changes)
- **Componentes Reutilizáveis Controlados (`@sysgov/ui`)**:
  - `PessoaPicker`: combobox controlado (Popover + Command) recebendo dados (`pessoas: Pessoa[]`, `value`, `loading`) e eventos (`onSearch`, `onSelect`, `onQuickCreate`) via props. Não conhece HTTP nem tenant. Exibe apenas nome e CPF mascarado (`cpf_mascarado`). Se a busca não retornar resultados e `onQuickCreate` for fornecido, disponibiliza botão para cadastro rápido.
  - `PessoaCard`: resumo compacto com nome, `cpf_mascarado`, vínculos funcionais ativos e link opcional de navegação para a ficha completa no módulo de pessoas.
  - `PessoaFormModal`: modal inline de cadastro rápido com validação estrita (nome, CPF, nome social, data de nascimento, contato principal), emitindo `onCreated(pessoa)` após criação bem-sucedida.
  - Exportação oficial no barrel de `packages/ui/src/index.ts`.
- **Hook de Orquestração no Frontend (`apps/web-client`)**:
  - `usePessoas`: hook em `apps/web-client/src/modules/pessoas/hooks/usePessoas.ts` com busca debounceada (300ms conservador), controle de paginação (`page`, `per_page` padrão 20), estados de carregamento (`loading`) e erro amigável, consumindo diretamente o `PessoasClient` já instanciado no `api.ts` do módulo pessoas, sem duplicar clientes HTTP.
- **Adoção Piloto no Módulo Cemitérios (`apps/web-client/src/modules/cemiterios`)**:
  - `OperadoresView.tsx`: formulário de novo operador (coveiro/pedreiro) passa a utilizar `PessoaPicker` e `usePessoas` para selecionar a pessoa física; exibe `PessoaCard` quando vinculada; submete `pessoa_id` para o backend; dispensa o preenchimento duplicado de nome/CPF em novos registros.
  - `EmpreiteirosView.tsx`: formulário de novo empreiteiro passa a permitir a seleção via `PessoaPicker` quando pessoa física, exibindo o `PessoaCard` e gravando `pessoa_id`.
  - **Preservação de Registros Legados**: operadores e empreiteiros históricos (sem `pessoa_id`) continuam sendo exibidos com seus dados existentes via fallback dos campos legados, sem backfill forçado nesta versão.
- **Validação e Testes**:
  - Testes unitários/componente com Vitest e React Testing Library para `PessoaPicker`, `PessoaCard`, `PessoaFormModal` e para o hook `usePessoas`.
  - Verificação de tipos TypeScript (`tsc --noEmit`) limpa e manutenção da suíte de testes existente do módulo Cemitérios.

## Capacidades (Capabilities)

### Novas Capacidades
*(Nenhuma nova capacidade base; a mudança estende e refina capacidades existentes do sistema).*

### Capacidades Modificadas
- `pessoas/mdm-consumo`: refina os requisitos dos componentes de interface reutilizáveis controlados (`PessoaPicker`, `PessoaCard`, `PessoaFormModal`) no `@sysgov/ui`, a orquestração via hook `usePessoas` no web-client e a governança de dados sensíveis sob LGPD.
- `cemiterio/cadastro-operadores`: detalha o comportamento do formulário de novos operadores e empreiteiros utilizando `PessoaPicker`, a gravação de `pessoa_id`, a eliminação da duplicação de dados civis em novos cadastros e a manutenção do suporte a registros legados sem backfill.

## Impacto
- **Código Frontend**:
  - `packages/ui/src/components/`: refinamento/criação dos componentes `PessoaPicker.tsx`, `PessoaCard.tsx` e `PessoaFormModal.tsx`.
  - `packages/ui/src/index.ts`: exportação canônica dos componentes.
  - `apps/web-client/src/modules/pessoas/hooks/usePessoas.ts`: padronização do hook de busca e paginação.
  - `apps/web-client/src/modules/cemiterios/views/OperadoresView.tsx`: integração do `PessoaPicker` + `PessoaCard` no cadastro de operadores.
  - `apps/web-client/src/modules/cemiterios/views/EmpreiteirosView.tsx`: integração no cadastro de empreiteiros.
- **APIs e Backend**:
  - Nenhuma alteração backend necessária. Os endpoints de pessoas (`/api/pessoas`) e cemitérios (`/api/cemiterios/operadores`, `/api/cemiterios/empreiteiros`) já possuem as migrations com a coluna `pessoa_id`.
- **Dependências e Contratos**:
  - `@sysgov/ui`: componentes puramente controlados e desacoplados de rede/HTTP.
  - `@sysgov/sdk`: contrato existente do `PessoasClient` mantido integralmente.
- **Segurança e LGPD**:
  - Nenhum componente reutilizável expõe CPF em claro nem `cpf_hash`; apenas `cpf_mascarado`.
  - Permissão `cadastros.pessoas.create` exigida para disponibilizar ação de cadastro rápido.
