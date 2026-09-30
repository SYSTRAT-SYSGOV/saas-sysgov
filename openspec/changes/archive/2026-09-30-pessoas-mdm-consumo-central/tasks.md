# Tasks

## 1. SDK e Contratos de Consumo (@sysgov/sdk)

- [x] 1.1 Adicionar suporte e métodos de consulta compacta no `PessoasClient` (`packages/sdk/src/modules/pessoas/client.ts` e `types.ts`), suportando projeção enxuta (`id`, `nome`, `nome_social`, `cpf_mascarado`), verificando com `npm run build` no workspace do SDK.
- [x] 1.2 Garantir suporte à flag `compact=true` no método de listagem de pessoas do controller (`apps/api/Modules/Pessoas/Http/Controllers/PessoaController.php`) projetando apenas campos públicos via `PessoaResource`, verificando com teste automatizado no PHPUnit.


## 2. Componentes Reutilizáveis de Domínio no @sysgov/ui

- [x] 2.1 Criar o componente `PessoaSearchInput` no `@sysgov/ui` (`packages/ui/src/components/PessoaSearchInput.tsx`) com estado controlado, debounce e ações de limpeza, verificando com teste de renderização.
- [x] 2.2 Criar o componente `PessoaPicker` no `@sysgov/ui` (`packages/ui/src/components/PessoaPicker.tsx`) com combobox acessível (Radix/CVA), listagem com busca por nome/CPF mascarado e botão de ação para cadastro rápido inline.
- [x] 2.3 Criar os componentes `PessoaCard` e `PessoaSummary` no `@sysgov/ui` (`packages/ui/src/components/PessoaCard.tsx`) com exibição compacta de nome, CPF mascarado e botão de navegação para a ficha completa.
- [x] 2.4 Criar o componente `PessoaVinculosBadge` no `@sysgov/ui` (`packages/ui/src/components/PessoaVinculosBadge.tsx`) para exibição semântica de vínculos ativos (servidor, estagiário, munícipe) com cores oficiais do design system.
- [x] 2.5 Criar o componente `PessoaFormModal` no `@sysgov/ui` (`packages/ui/src/components/PessoaFormModal.tsx`) com formulário ágil para criação rápida (nome, CPF, nome social, data de nascimento e contato principal), validado e acessível.
- [x] 2.6 Exportar os novos componentes de domínio em `packages/ui/src/index.ts` e verificar a compilação com `npm run build` no workspace `@sysgov/ui`.


## 3. Hooks Compartilhados e Testes de UI (apps/web-client)

- [x] 3.1 Implementar os custom hooks compartilhados `usePessoas` e `usePessoaPicker` em `apps/web-client/src/modules/pessoas/hooks/` provendo busca com debounce, cache leve e controle de abertura do modal de cadastro rápido.
- [x] 3.2 Exportar os hooks através de `apps/web-client/src/modules/pessoas/hooks/index.ts` e documentar tipos consumíveis por outros módulos.
- [x] 3.3 Implementar testes de componente com Vitest e Testing Library cobrindo `PessoaPicker`, `PessoaCard` e `PessoaFormModal` garantindo validações de acessibilidade e ausência de exposição de CPF literal.


## 4. Backend e Migrations do Módulo Cemitérios (apps/api)

- [x] 4.1 Criar a migration `add_pessoa_id_to_cemetery_contractors` no módulo `Cemiterios` adicionando `pessoa_id` nulo com índice composto `[tenant_id, pessoa_id]`, verificando com `php artisan migrate`.
- [x] 4.2 Atualizar o model `Contractor` e os Form Requests de Empreiteiro (`CadastrarEmpreiteiroRequest`, `AtualizarEmpreiteiroRequest`) para receber e persistir `pessoa_id` opcional, validando com testes de feature de cemitérios.


## 5. Adoção Piloto no Módulo Cemitérios (apps/web-client)

- [x] 5.1 Atualizar `OperadoresView.tsx` no módulo `cemiterios` para utilizar o `PessoaPicker` na seleção/cadastro de coveiros e pedreiros, associando `pessoa_id` e renderizando resumo cadastral via `PessoaCard`.
- [x] 5.2 Atualizar `EmpreiteirosView.tsx` no módulo `cemiterios` para utilizar o `PessoaPicker` no cadastro de novos empreiteiros pessoa física, gravando `pessoa_id` e eliminando duplicidade de dados civis.
- [x] 5.3 Validar a visualização de operadores e empreiteiros legados (sem `pessoa_id`), assegurando compatibilidade retroativa e renderização graciosa dos campos locais pré-existentes.


## 6. Integração no Módulo Users e Verificação Geral

- [x] 6.1 Atualizar a visualização de detalhes de usuário no módulo `users` (`apps/web-client/src/modules/users`) para exibir o componente `PessoaCard` quando houver pessoa física vinculada, com link contextual sem mesclar telas.
- [x] 6.2 Executar o script `node scripts/generate-module-registry.js` e verificar que o arquivo `src/config/moduleRegistry.generated.ts` preserva o registro do módulo `pessoas` e suas permissões.
- [x] 6.3 Executar verificação estática de tipos com `npx tsc --noEmit` no `apps/web-client` e rodar a suíte de testes de isolamento de tenant no backend, garantindo conformidade com o padrão SYSGOV.
