# Tasks

## 1. Tokens compartilhados e login
- [x] 1.1 Extrair tokens e tema Gov.br do portal para `packages/ui/src/styles/` (`govbr-tokens.css`, `govbr-theme.css`, `govbr-base.css`) e importar no portal; o CSS final do portal saiu byte a byte idêntico ao anterior.
- [x] 1.2 Importar tokens e tema no admin; remover do `index.css` as variáveis shadcn em esmeralda/Navy, os presets de tema (`data-theme`) e as definições de `@theme` que o tema compartilhado já fornece. Fica para depois (ondas 2 a 5): `govbr-base.css` no admin, os estilos legados `.sgf-*`/`.mod-*`, a paleta `navy` e a dependência de `@govbr-ds/core`.
- [x] 1.3 Refazer `AdminLoginPage` no padrão do portal e verificar no navegador (e com `axe`).

## 2. Layout
- Adiantado na onda 1: tema escuro removido (botão do cabeçalho, estado no `AppRouter`, chave `admin_dark_mode` apagada) e o seletor "Tema do Admin (Accent Theme)" de Configurações removido junto com `config/adminThemes.ts` e `themeId`. A cor primária guardada (`#10b981`) é descartada no carregamento; o padrão passou a `#1351B4`.
- Pendente: as ~310 classes `dark:` (inertes, pois `.dark` nunca mais é aplicada) saem junto com cada tela migrada.
- [x] 2.1 Refazer `Header` (cabeçalho claro, seletor de órgão, usuário) com tokens.
- [x] 2.2 Refazer `SidebarNav` com `--sidebar*` e estados ativos Gov.br.
- [x] 2.3 Refazer `Toast` e rodapé institucional.
- [x] 2.4 (feito na onda 1) Remover o tema escuro (D3): botão do cabeçalho, `isDarkMode` no `AppRouter`, chave `admin_dark_mode` (apagar no primeiro carregamento) e as classes `dark:`.

## 3. Componentes compartilhados
- [x] 3.1 Promover `DataTable`, `Field`, `PageHeader`, `ScreenState`, `ConfirmDialog` e `ValidationErrorModal` (+ hook) para `@sysgov/ui` e apontar portal e admin para eles; ajustar `DataTable.test.tsx` e `ConfirmDialog.test.tsx`.
- [x] 3.2 Remover as cópias de `apps/web/src/components/ui`.

## 4. Telas do admin (um PR por onda, verificação visual a cada uma)
- [x] 4.1 `AdminTenantManagement` (dividir em partes) e `AdminDashboardOverview`.
- [x] 4.2 Acessos: `UserManagement`, `RoleManagement`, `PermissionManagement`, `AnalystManagement`, `InvitationsPage`, `UserAccessModule`.
- [x] 4.3 `AdminAuditLogs`, `AdminSettings`, `AdminAiSettings`, `AdminApiIntegrations`.
- [x] 4.4 `AdminFinancialBilling`, `AdminAnalyticsView`, `AdminUserProfile`, `ModuleCatalogPage`, `MenuManager`.
- [x] 4.5 Grades no padrão (exportação, paginação, ações em dropdown) e validação em modal em todas as telas acima.

## 5. Fechamento
- [x] 5.1 Auditoria final: zero ocorrências de `slate-`, `emerald-`, `navy`, `bg-white` e hex fora dos tokens no admin; `index.css` enxuto.
- [x] 5.2 Atualizar `docs/` (nova seção do admin).
- [ ] 5.3 Arquivar a change com `openspec archive` depois do merge e da validação visual.

## Notas de execução
- `govbr-base.css` já está importado no admin (html a 16px, títulos e foco do portal); o `index.css` do admin tem só os imports do pacote.
- O menu lateral do portal é branco (texto `#0c326f`, item ativo `#e8f0fe` com filete azul), não azul-escuro: os tokens `--sidebar*` de `govbr-theme.css` passaram a esse visual, e o menu do admin o herda.
- `DataTable`, `Field`, `PageHeader`, `ScreenState`, `ConfirmDialog`, `ValidationErrorModal` e o hook/host de validação foram para `@sysgov/ui`; o portal mantém arquivos finos que reexportam. O `DataTable` ganhou paginação e ordenação remotas (`paginationState`, `sorting`) para as grades paginadas no servidor (Tenants, Usuários, Auditoria).
- O admin mantém um adaptador de `ScreenState` (assinatura antiga) e o `Field` composto (campo + rótulo + ajuda), ambos sobre os componentes compartilhados.
- O pacote `@govbr-ds/core` saiu do CSS do admin (suas variáveis sem camada sobrepunham as do tema e deixavam modais transparentes); a dependência ainda consta no `package.json` e sai junto com a próxima atualização do `package-lock.json`.
- Erros HTTP do admin agora usam `ApiRequestError` (`src/api/errors.ts`), com o formato que a modal de validação entende.
