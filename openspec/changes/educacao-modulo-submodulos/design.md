# Design

## Contexto

O web-client monta o menu a partir da API (`ClientNavigationService`), que já aceita **dois níveis** (item raiz e `children`) e filtra cada item por módulo ativo no tenant, permissão e liberação por unidade organizacional. O `Sidebar` já desenha filhos. As rotas do web-client saem do `MODULE_REGISTRY`, gerado por `scripts/generate-module-registry.js` a partir dos `module.json` dos módulos de backend.

Hoje cada um dos seis módulos é independente: tem rota própria (`/escola`, `/pedagogico`, …), item de menu no grupo "Gestão Setorial" e permissões próprias. Eles compartilham a "escola de trabalho" (`X-Escola-ID`, ver `core/escola/escolaAtiva.ts`).

## Decisões

### D1. Agrupar na camada de apresentação; o backend dos módulos não muda

A Educação é um **módulo de navegação**, não um módulo de negócio. Os seis módulos continuam sendo módulos Laravel independentes (alias, permissões, API, tabelas, testes). Só o menu, as rotas do web-client e os nomes mudam.

- **Por quê:** a fusão no backend (um módulo `Educacao` com tudo dentro) renomearia permissões, perfis, prefixos de API e namespaces. Seria uma mudança enorme e arriscada em produção, sem ganho para o usuário.
- **Alternativa descartada:** só aninhar os itens no menu, mantendo as rotas. É mais simples, mas não cria um lugar "Educação" (página inicial, barra entre submódulos) e deixa os nomes e URLs soltos.

### D2. Rotas `/educacao/<submódulo>` com redirecionamento das antigas

| Submódulo | Alias (backend) | Rota nova | Rota antiga (redireciona) | Rótulo |
|---|---|---|---|---|
| Cadastro Escolar | `escola` | `/educacao/cadastro-escolar` | `/escola` | Cadastro Escolar |
| Gestão Pedagógica | `pedagogico` | `/educacao/pedagogico` | `/pedagogico` | Gestão Pedagógica |
| Formatura e Eventos | `formatura` | `/educacao/formatura` | `/formatura` | Formatura e Eventos |
| Passeios | `passeio` | `/educacao/passeio` | `/passeio` | Passeios |
| Portfólio Digital | `portfolio` | `/educacao/portfolio` | `/portfolio` | Portfólio Digital |
| Transporte Escolar | `transporte` | `/educacao/transporte` | `/transporte` | Transporte Escolar |

- O redirecionamento preserva o *query string* (`?aba=custos`) e o *hash*, porque o Transporte guarda a aba em `?aba=`.
- Os caminhos antigos **não são removidos**: ficam como `Navigate replace`. Isso protege favoritos e links de e-mail.
- `/educacao` mostra a página inicial.

### D3. Registro de módulos com módulo-pai

O `module.json` de cada submódulo declara `"menu": { "parent": "educacao", ... }`. O gerador do registro passa a gerar `routePath: 'educacao/<slug>'` para eles e uma entrada `educacao` (agrupadora, sem componente de negócio, com o componente da página inicial). O `RegisterModuleCommand` cria o item "Educação" (agrupador) se não existir e coloca o item do submódulo como filho.

O `slug` de cada submódulo sai de `menu.slug` do `module.json` (com *fallback* no alias), para `escola` virar `cadastro-escolar` sem renomear o alias.

### D4. Item de menu agrupador

O item "Educação" é um `ClientMenuItem` raiz **sem módulo (`module_alias` nulo), sem permissão e com rota `/educacao`**. Ele aparece só se tiver ao menos um filho visível, depois de aplicados os filtros normais (módulo ativo, permissão, liberação por unidade). Um agrupador sem filhos visíveis é omitido, do mesmo modo que o grupo sem itens visíveis já é omitido.

- **Efeito:** quem hoje só enxerga Transporte vê "Educação ▸ Transporte Escolar". Quem não enxerga nenhum dos seis não vê "Educação". Não há permissão nova nem liberação nova a configurar.
- O requisito atual diz que `route` é obrigatório no item; o agrupador usa `/educacao` (a página inicial), então a regra continua valendo.

### D5. Permissões e granularidade ficam nos submódulos

Não existe `educacao.view`. A página inicial da Educação lista os submódulos que o usuário já pode abrir (mesma regra do menu). A liberação por unidade organizacional continua sendo configurada por submódulo (módulo `escola`, `pedagogico`, etc.), na tela atual de granularidade.

- **Por quê:** uma permissão nova obrigaria a revisar todos os perfis em todos os tenants e criaria duas portas de acesso para o mesmo dado.
- **Efeito colateral aceito:** quem tem permissão em um submódulo e abre `/educacao` vê só os submódulos que lhe cabem.

### D6. Barra de navegação entre submódulos (*shell*)

Cada rota `/educacao/<submódulo>` é renderizada dentro de um `EducacaoShell`, que mostra no topo a barra de submódulos (com o ativo destacado, só os permitidos) e abaixo o componente do submódulo, sem alterá-lo. A barra usa links, é navegável por teclado e é rolável em tela estreita.

- Os componentes existentes (`PedagogicoModule`, `EscolaModule`, …) continuam intactos. O *shell* só os envolve.
- A **escola de trabalho** segue por submódulo (cada um já tem `ComEscola`). Mostrar o seletor uma vez só no *shell* fica como melhoria futura, para não mexer em seis telas nesta mudança.

### D7. Migração dos itens de menu já gravados

Uma migração idempotente:
1. cria o item raiz "Educação" no grupo "Gestão Setorial" (global, `tenant_id` nulo) se não existir;
2. para cada um dos seis `module_alias`, atualiza o item existente: `parent_id` = agrupador, `route` = rota nova, `label` padronizado, mantendo `permission`, `order` e `is_active`;
3. não cria item novo quando o tenant já personalizou o menu: o item personalizado é reposicionado; se o administrador do tenant apagou o item, ele **não é recriado**.

A migração não apaga linhas e pode rodar mais de uma vez. O `RegisterModuleCommand`, que roda a cada boot do container, passa a respeitar o pai e não recria o item solto.

## Riscos e mitigação

- **Links antigos** (e-mail, favoritos, `navigate('/escola')`): mitigados pelo redirecionamento e pela troca dos `navigate` por constantes de rota.
- **Itens de menu personalizados por tenant**: o estado em produção precisa ser conferido antes (a consulta ao banco não foi feita na elaboração desta proposta; ver tarefa 1.1). A migração só reposiciona, nunca apaga.
- **Cache de navegação por sessão**: o menu é versionado e invalidado por alteração do menu; a migração deve incrementar a versão para ninguém ficar com o menu velho.
- **Atalhos de teclado do menu** (`shortcut`): o item "Educação" não tem atalho; os filhos mantêm os seus. Conferir conflitos.
- **Nenhuma regressão de dados**: não há migração de tabelas de negócio.

## Perguntas em aberto

1. **Decidido:** o Passeio entra como submódulo (rota `/educacao/passeio`, rótulo "Passeios", entre Formatura e Eventos e Portfólio Digital).
2. **Multiprofissional**, **Requerimentos** e **Cursos** também têm relação com educação, mas ficam fora (não pedidos).
3. **Ícone e ordem** do item "Educação" e dos subitens: proposta `GraduationCap`, ordem do menu de hoje do módulo Pedagógico, e subitens na ordem Cadastro Escolar, Gestão Pedagógica, Formatura e Eventos, Passeios, Portfólio Digital, Transporte Escolar.
4. **Seletor de escola único** no *shell*: fica para uma mudança posterior.
