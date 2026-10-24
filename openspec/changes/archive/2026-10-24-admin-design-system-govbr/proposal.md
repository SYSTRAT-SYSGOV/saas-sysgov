# Proposal

## Why

O painel administrativo (`apps/web`) tem identidade visual própria — "Navy Edition", com verde esmeralda como cor de ação, tema escuro e classes de cor soltas (`slate-*`, `emerald-*`, `navy-*`) — enquanto o portal do cliente (`apps/web-client`) segue o Design System Gov.br (UIKIT v3): azul `#1351B4`, escala tipográfica oficial e tokens semânticos (`--primary`, `--sidebar`, `--border`…). Quem usa os dois vê dois produtos diferentes, e o admin não aproveita os componentes de `@sysgov/ui`, que já são tokenizados e ficariam no padrão Gov.br "de graça" com os tokens certos.

Levantamento do `apps/web` (45 arquivos `.tsx`, ~8,9 mil linhas):
- Só 6 componentes de `@sysgov/ui` são importados (Card, Button, Modal, StatusChip, Select, Input); `DataTable`, `Dialog`, `Field`, `PageHeader` e `ScreenState` existem em cópia própria, já divergentes das do portal (a `DataTable` difere em ~590 linhas).
- 351 linhas com `slate-*`, 80 com `emerald-*`, 18 com `navy*`, 28 com `bg-white` e 17 com cores hexadecimais; nenhuma com os tokens `gov-*` do portal.
- Tema escuro por classe `.dark` (310 linhas com `dark:`), alternado no `AppRouter`; o portal não tem tema escuro.
- Concentração: `AdminTenantManagement` (89 ocorrências), `Header` (71), `RoleManagement` (46), `AdminSettings` e `AdminAuditLogs` (31 cada), `PermissionManagement` (30), `AdminLoginPage` (25).

## What Changes

- Extrair os tokens e o tema Gov.br do portal (`styles/tokens.css` + `:root`/`@theme` do `index.css`) para `packages/ui` e importá-los nos dois apps, para o admin passar a ter o mesmo azul, tipografia, raios, sombras e estados de foco.
- Reescrever o layout do admin (`Header`, `SidebarNav`, `Toast`, `AdminLoginPage`) no padrão do `AppShell` do portal (cabeçalho claro, menu lateral `--sidebar` `#071D41`, rodapé institucional), mantendo a navegação própria do admin.
- Trocar as cores soltas (`slate/emerald/navy`, `bg-white`, hex) por tokens semânticos em todas as telas e módulos do admin.
- Substituir as cópias locais (`DataTable`, `Dialog`, `Field`, `PageHeader`, `ScreenState`, `ConfirmDialog`) pelos componentes compartilhados, aplicando o padrão de grades (exportação, paginação, ações em dropdown) e a validação em modal já adotados no portal.
- Remover o tema escuro do admin, por decisão do produto (`design.md`, D3).
- Migrar por ondas, um PR por onda, com verificação visual no ambiente de produção (sem dados reais) a cada uma.

## Capabilities

### New Capabilities
- `admin-design-system`: o painel administrativo usa os tokens, componentes e padrões de interação do Design System Gov.br compartilhado com o portal.

### Modified Capabilities
- Nenhuma de negócio; só apresentação.

## Impact

- **Frontend**: `packages/ui` (novos arquivos de estilo e eventual promoção de componentes do portal), `apps/web` (todas as telas), `apps/web-client` (passa a importar os tokens do pacote; sem mudança visual).
- **Build**: `apps/web/src/index.css` perde ~800 linhas; remove a dependência direta de `@govbr-ds/core` se os tokens do pacote bastarem.
- **Testes**: 14 arquivos de teste no admin; só `ConfirmDialog` e `DataTable` verificam classes ou estrutura e serão ajustados.
- **Risco**: tela do admin muito grande (`AdminTenantManagement`, 1.484 linhas) e regressão visual sem teste automatizado; mitigado por ondas pequenas e verificação no navegador a cada deploy do `web`.
