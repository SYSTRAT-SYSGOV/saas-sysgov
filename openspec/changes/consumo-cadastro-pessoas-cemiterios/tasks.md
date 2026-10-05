# Tasks: Consumo do cadastro central de pessoas no web-client (Fase 2 — piloto Cemitérios)

## 1. Componentes Reutilizáveis Controlados no @sysgov/ui

- [x] 1.1 Refinar o componente `PessoaPicker` em `packages/ui/src/components/PessoaPicker.tsx` para operar de forma puramente controlada por props (`pessoas: Pessoa[]`, `value`, `onSearch`, `onSelect`, `loading`, `onQuickCreate`, `canCreate`), exibindo nome e `cpf_mascarado`, verificando a renderização limpa e acessível via testes de unidade
- [x] 1.2 Refinar o componente `PessoaCard` em `packages/ui/src/components/PessoaCard.tsx` para exibir o resumo civil compacto (nome, CPF mascarado e vínculos funcionais) com link opcional para o módulo pessoas, sem expor dados não autorizados sob LGPD, validando via snapshot/teste de renderização
- [x] 1.3 Refinar o componente `PessoaFormModal` em `packages/ui/src/components/PessoaFormModal.tsx` para cadastro rápido inline com validação estrita dos campos essenciais (nome, CPF válido, data de nascimento e contato) e emissão do evento `onCreated(pessoa)`, verificando com teste de submissão
- [x] 1.4 Garantir a exportação canônica de `PessoaPicker`, `PessoaCard` e `PessoaFormModal` no barrel `packages/ui/src/index.ts`, verificando que o build e importação externa em outros pacotes ocorram sem erros
- [x] 1.5 Escrever e executar a suíte de testes de componente em Vitest para os componentes de pessoa em `packages/ui/src/components/__tests__/`, verificando 100% de aprovação nos testes

## 2. Hook de Orquestração no Web-Client

- [x] 2.1 Padronizar o hook `usePessoas` em `apps/web-client/src/modules/pessoas/hooks/usePessoas.ts` com busca debounceada (300ms), paginação (`page`, `per_page: 20`, `totalPages`), estados de `loading` e `erro`, consumindo o `PessoasClient` existente de `src/modules/pessoas/api.ts` sem duplicar instâncias HTTP
- [x] 2.2 Escrever testes unitários para o hook `usePessoas` com Vitest em `apps/web-client/src/modules/pessoas/hooks/__tests__/usePessoas.test.ts`, validando o disparo do debounce, cancelamento de buscas anteriores, tratamento de erro de rede e paginação

## 3. Adoção Piloto no Módulo Cemitérios (Operadores e Empreiteiros)

- [x] 3.1 Atualizar o formulário de cadastro de operador em `apps/web-client/src/modules/cemiterios/views/OperadoresView.tsx` para utilizar `PessoaPicker` e `usePessoas`, exibindo `PessoaCard` quando vinculado e gravando `pessoa_id` no payload de persistência sem duplicar campos legados de nome/CPF
- [x] 3.2 Implementar suporte ao cadastro rápido inline no formulário de operadores via `PessoaFormModal` condicionado à permissão `cadastros.pessoas.create`, selecionando automaticamente a pessoa recém-criada
- [x] 3.3 Garantir que a listagem e o detalhe de operadores em `OperadoresView.tsx` mantenham fallback transparente para os campos legados (`nome`, `documento_mascarado`) quando `pessoa_id` for nulo, garantindo compatibilidade com registros históricos
- [x] 3.4 Atualizar o formulário de cadastro de empreiteiro em `apps/web-client/src/modules/cemiterios/views/EmpreiteirosView.tsx` para permitir vincular `pessoa_id` via `PessoaPicker` e `usePessoas` quando pessoa física, exibindo o `PessoaCard` e gravando a chave estrangeira
- [x] 3.5 Garantir que a listagem de empreiteiros em `EmpreiteirosView.tsx` renderize os dados de registros legados sem exigir backfill prévio

## 4. Validação, Qualidade e Não-Regressão

- [x] 4.1 Executar a verificação estática de tipos TypeScript com `tsc --noEmit` em `packages/ui` e `apps/web-client`, garantindo zero erros de compilação
- [x] 4.2 Executar `node scripts/generate-module-registry.js` e verificar que o arquivo `src/config/moduleRegistry.generated.ts` permanece íntegro e sincronizado
- [x] 4.3 Executar a suíte de testes existente do módulo Cemitérios (`npm test` no `web-client`), confirmando que `CemiteriosModule.test.tsx` e demais testes de views continuam passando
- [x] 4.4 Realizar verificação visual/manual no ambiente de desenvolvimento local cadastrando um novo operador vinculado a uma pessoa existente e via cadastro rápido inline, confirmando a persistência correta de `pessoa_id`
