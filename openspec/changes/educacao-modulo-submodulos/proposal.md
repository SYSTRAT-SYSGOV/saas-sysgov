# Proposal

## Why

Os módulos da área de educação aparecem hoje soltos no menu e no painel, cada um com um nome e uma rota própria: "Cadastro Escolar" (`/escola`), "Módulo Pedagógico" (`/pedagogico`), "Formatura & Eventos" (`/formatura`), "Passeio" (`/passeio`), "Portfólio Digital" (`/portfolio`) e "Transporte Escolar" (`/transporte`). Quem trabalha na secretaria de educação convive com seis itens espalhados no grupo "Gestão Setorial", sem indicação de que formam um conjunto. Os nomes também variam entre o menu, o registro de módulos e a barra superior ("Gestão Pedagógica" × "Módulo Pedagógico", "Formatura e Eventos" × "Formatura & Eventos").

Os seis módulos já compartilham o mesmo cadastro (a escola ativa e o Cadastro Escolar), então o agrupamento reflete como o sistema já funciona. O objetivo é **um módulo chamado "Educação", com esses seis como submódulos**, para o menu ficar mais curto, o conjunto ficar claro e os nomes ficarem consistentes.

## What Changes

- **Novo módulo "Educação"** no menu e no painel, com seis **submódulos**: Cadastro Escolar, Gestão Pedagógica, Formatura e Eventos, Passeios, Portfólio Digital e Transporte Escolar.
- **Uma página inicial da Educação** (`/educacao`) com os submódulos que o usuário pode abrir, e uma **barra de navegação entre submódulos** em todas as telas deles, para trocar de um para outro sem voltar ao menu.
- **Novas rotas** `/educacao/<submódulo>` e **redirecionamento das rotas antigas** (`/escola`, `/pedagogico`, `/formatura`, `/passeio`, `/portfolio`, `/transporte`) para elas, preservando favoritos, links em e-mails e os atalhos internos (`navigate('/escola')`).
- **Menu em dois níveis**: um item "Educação" que se expande em seis subitens. O item "Educação" é só um agrupador: aparece quando o usuário enxerga ao menos um submódulo e some quando não enxerga nenhum.
- **Nomes padronizados** em todos os lugares (menu, registro de módulos, barra superior, painel, gerenciador de menus).
- **Migração dos itens de menu já gravados**: os seis itens existentes passam a ser filhos do item "Educação", sem perder ordem, ícone nem permissão.
- Fora do escopo: unir os módulos no backend, mudar permissões, mudar prefixos da API, mudar dados.

**Nada muda para o backend de cada módulo**: aliases (`escola`, `pedagogico`, `formatura`, `passeio`, `portfolio`, `transporte`), permissões (`pedagogico.view` etc.), perfis, rotas de API (`/api/escola`, …) e tabelas continuam como estão.

## Capabilities

### New Capabilities

- `educacao`: módulo agrupador da área de educação, com submódulos, página inicial, navegação entre submódulos e redirecionamento das rotas antigas.

### Modified Capabilities

- `client`: o item de menu passa a poder ser um **agrupador sem rota própria** (que só aparece com filhos visíveis), e o registro de módulo (`module:register`) passa a aceitar o módulo-pai declarado no `module.json`.

## Impact

- **Frontend (web-client)**: novo módulo `modules/educacao` (página inicial e *shell* com a barra de submódulos), rotas `/educacao/*` no `AppRouter`, redirecionamentos das rotas antigas, `moduleRegistry` (gerado por `scripts/generate-module-registry.js`) com os submódulos apontando para o novo caminho, nomes na `TopBar`, no `MenuManager` e nos cards do painel, e os `navigate('/escola')` espalhados nos módulos de Formatura, Passeio e Portfólio.
- **Backend (api)**: `module.json` dos seis módulos ganha `menu.parent = "educacao"` e o rótulo padronizado; `RegisterModuleCommand` e `ClientNavigationService` passam a tratar o agrupador; uma migração/seeder reposiciona os itens de menu existentes sob o agrupador (idempotente).
- **Sem mudança** em permissões, perfis, RBAC, tabelas de negócio, APIs dos módulos e cabeçalho `X-Escola-ID`.
- **Dados em produção**: só linhas de `client_menu_items` (reposicionamento). Exige backup antes do deploy.
- **Documentação**: `docs/modules/*` e specs de `client` e `educacao`.
