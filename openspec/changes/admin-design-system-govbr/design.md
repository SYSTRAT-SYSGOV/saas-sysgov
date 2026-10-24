# Design

## Situação atual
- Portal: `src/styles/tokens.css` (tipografia e paleta Gov.br em CSS) + bloco `@theme` e `:root` de `index.css` (variáveis HSL do shadcn: `--primary: 217 81% 39%` = `#1351B4`, `--sidebar: #071D41`, `--radius: 0.5rem`). `@custom-variant dark` só vale dentro de `.dark`, que ninguém aplica.
- Admin: `index.css` de 808 linhas com paleta Navy (`#0a1128`…), verde esmeralda como cor primária (`--color-primary-default`), `@govbr-ds/core` só para tokens e `@variant dark`.
- `@sysgov/ui` já usa tokens semânticos (`bg-primary`, `border-border`, `bg-card`), portanto troca de tema = troca de variáveis.

## Decisões

### D1. Tokens compartilhados em `packages/ui`
Criar `packages/ui/src/styles/govbr.css` (tokens + `@theme` + variáveis `:root`) e fazer os dois apps importarem. O portal passa a importar o mesmo arquivo (sem mudança visual, validada por comparação das variáveis resolvidas). Evita dois temas divergindo de novo.
*Alternativa descartada*: copiar o CSS para o admin — repete o problema atual.

### D2. Layout do admin refeito, sem compartilhar código com o portal
O portal monta o menu a partir da API por usuário; o admin tem navegação fixa por papel. Compartilhar o `Sidebar` obrigaria a abstrair os dois modelos. Fazemos o admin reproduzir o visual (tokens `--sidebar*`, cabeçalho claro, rodapé) com componentes próprios finos.

### D3. Tema escuro: removido (decidido pelo produto)
O portal não tem tema escuro e o Gov.br DS não o define como padrão. O admin passa a ter só o tema claro: some o botão do cabeçalho, o estado `isDarkMode` do `AppRouter`, a chave `admin_dark_mode` do `localStorage` e as ~310 classes `dark:`. A chave antiga é apagada no primeiro carregamento. Se o escuro voltar no futuro, entra como tokens no pacote compartilhado, para os dois apps.

### D4. Componentes compartilhados
Promover para `@sysgov/ui` o que o portal já tem estável e o admin copiou (`DataTable` com exportação/paginação, `Field`, `PageHeader`, `ScreenState`, `ConfirmDialog`, `ValidationErrorModal` e o hook de validação). O admin deixa de manter cópias.

### D5. Verificação
Sem teste visual automatizado. Cada onda vai a produção (`docker compose up -d --build web`) e é conferida no navegador antes do PR; `axe` (já instalado no admin) roda nas telas migradas para checar contraste dos novos tokens.

### D6. Ordem das ondas
1) tokens + login; 2) layout (Header, Sidebar, Toast); 3) componentes compartilhados; 4) telas por tamanho/uso (Tenants, Acessos, Auditoria, Configurações, Financeiro, demais); 5) limpeza do `index.css` e fechamento.

### D7. Presets de tema do admin: removidos
O seletor "Tema do Admin (Accent Theme)" (navy, indigo, gov-blue, cyan, pearl) contradiz um design system único e deixa de existir. O branding do cliente (nome, logotipo, "Powered by") continua configurável.

### D8. Estilos globais do portal ficam para depois no admin
`govbr-base.css` (corpo, títulos em `#0c326f`, foco, `html` a 16px) só entra no admin quando as telas estiverem migradas, porque aplicá-lo agora quebraria a escala tipográfica das telas ainda antigas. Até lá o admin usa tokens e tema, mas mantém a base legada.

## Riscos
- Contraste: o azul `#1351B4` sobre fundos claros atende AA; conferir estados desabilitados e links no rodapé escuro.
- Regressão em telas grandes: dividir `AdminTenantManagement` em partes ao migrar.
- Cache do PWA do admin, se houver: invalidar com `Ctrl+Shift+R` ou versão do service worker.
