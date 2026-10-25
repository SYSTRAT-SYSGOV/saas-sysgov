# Navigation (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Navegação: árvore de menus (`App\Menu` sobre `public.menus`), vínculo com permissões por tipo de usuário, cache de menu, breadcrumbs manuais (`iEducar\Support\Navigation\Breadcrumb`) e o endpoint `/menus` do frontend.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.
> Sanitização LGPD, auditoria e cache transversais: ver unit `SupportModules` (capa), citada por referência.

---

## Recorte (evitar duplicação)

- A **unit `SupportModules`** (capa) cobre os serviços transversais; esta unit detalha somente a navegação.
- A **unit `Usuario`** cobre tipos de usuário e a matriz `menu_tipo_usuario` (visualiza/cadastra/exclui por processo); aqui o vínculo entra só como consumidor.
- A **unit `Navigation`** no alvo mapeia para `core_navigation_nodes` + `core_user_navigation_favorites` (DDL no bastão `_reversa_sdd/SupportModules/legacy-mapping.md`, tabelas 90–91). 🟢

> ⚠️ Contra o bastão: o legado atual **não** usa `portal.menu_menu` diretamente — a tabela viva é `menus` (Eloquent, schema `public`) com as colunas de compatibilidade `old`/`parent_old` apontando para os ids do menu legado. 🟡 bastão × código

---

## Visão Geral

O menu é uma árvore de adjacência (`parent_id`) em `menus` (id, parent_id, title, description, link, icon, order default 99, type default 1, process nullable, old, parent_old, active, timestamps). Nós folha com `link` são telas; nós com `process` referenciam o processo de permissão (`App\Process`) e são filtradas por tipo de usuário via `pmieducar.menu_tipo_usuario`. 🟢 DDL `2020_01_01_110000_create_menus_table.php`, `App\Menu`

38 migrations de conteúdo acrescentam itens via `updateOrCreate` por process e loops `attachMenuIfNotExists` nos tipos de usuário — confirma o acoplamento menu↔permissão descrito no bastão. 🟢 `database/migrations/misc/2025_06_26_221803_update_enturmacao_permissions_order.php`

---

## Responsabilidades

- **Árvore por usuário:** `Menu::user($user)` — admin recebe a árvore inteira (`roots()`); demais usuários recebem a árvore filtrada por tipo (constraint recursiva: nós sem `process` entram; nós com `process` exigem vínculo em `menu_tipo_usuario` com `visualiza = 1`; processos `CONFIG`/`SETTINGS` excluídos para não-admin). 🟢 `Menu.php:38-63, 326-330`
- **Cache:** `MenuCacheService` — árvore por usuário com TTL **86400s** (1 dia) e `getProcessMenuData(process)` (breadcrumb/janela do processo na intranet) com TTL **604800s** (7 dias), tags `['menus', dbname, user]`; invalidação total por `flushAll()` e por `MenuObserver` em save/delete (afterCommit). 🟢 `MenuCacheService.php`, `MenuObserver.php`
- **Eager-loading fixo por profundidade:** `getMenusByIds` encadeia `children` até 5 níveis com `whereNull(process) orWhereIn(ids)` — busca de menus por ids de processo (telas atingíveis por processo). 🟢 `Menu.php:65-112`
- **Metadados de link:** `hasLink()`/`isLink()`/`hasLinkInSubmenu()` controlam nós clicáveis na renderização. 🟢
- **Permissões da UM (lista de processos):** `Menu::processes($path, $process, $userLevel)` percorre a árvore acumulando caminhos "Pai > Filho" e devolve, por nó com process, `allow` da permissão do tipo de usuário (usado na tela de permissões por tipo). 🟢 `Menu.php:176-205`
- **Renomeio de nomenclatura:** `changeMenusToAttestation()` / `changeMenusToDeclaration()` renomeia títulos ilike "Declaração"/"Atestado" (exceções de menu: 999229, 999812), com flush de cache. 🟢 `Menu.php:210-285`
- **Breadcrumb:** `iEducar\Support\Navigation\Breadcrumb` (singleton via container): `current($pagina, $pages)`, `push(label, link)`, `pages()`, `currentPage()`, `hasPages()`, flag `beta` e `legacy`; chamado manualmente por cada controller/tela (`$this->breadcrumb(...)`). `iEducar\Modules\Navigation\Breadcrumb` é wrapper que delega ao singleton; "breadcrumbs automáticos por rota" é **recurso do alvo**, não do legado. 🟢 `src/Support/Navigation/Breadcrumb.php`, `src/Modules/Navigation/Breadcrumb.php`
- **Endpoint do frontend:** `GET /menus` → `WebController.menus()` → `MenuCacheService.getMenuByUser`. 🟢 `routes/web.php:40`

---

## Regras de Negócio

| Regra | Evidência |
|---|---|
| Admin vê a árvore completa; não-admin vê só nós com process vinculado ao seu tipo (pivot `visualiza = 1`) ou nós sem process | 🟢 `Menu.php:326-330, 38-63` |
| Processos `Process::CONFIG` e `Process::SETTINGS` sempre escondidos de não-admin | 🟢 `Menu.php:45-48` |
| `type` default 1; `order` default 99 (orden crescente) | 🟢 DDL/default |
| `old`/`parent_old` preservam os ids do menu legado (`portal.menu_menu`) — chave de compatibilidade em seeds/migrations | 🟢 DDL + seeds (`->where('old', Process::CONSULTAS)`) |
| Nó com process `Process::CONFIG`/`SETTINGS` também sai da listagem de permissões para não-admin | 🟢 `Menu.php:194-200` |
| Cache do menu por **tipo de usuário** (`cod_tipo_usuario`) e cliente dbname, não por usuário físico | 🟢 `MenuCacheService.getUserKey` |
| Mudança em qualquer registro de menu invalida TODO o cache de menus (`flushAll`) | 🟢 `MenuObserver` |
| `changeMenusTo*` é regra regulatória (nomenclatura Declaração/Atestado) com exceções fixas 999229/999812 | 🟢 `Menu.php:219, 257` |
| Busca de menu por texto (`findByUser`) limita 15 e só nós com link | 🟢 `Menu.php:334-346` |

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| NAV-01 | Árvore de menus hierárquica com order, ícones e descrição por instituição/tenant. | Must | 🟢 DDL + modelo |
| NAV-02 | Filtragem da árvore por permissão do tipo de usuário (visualiza) com nós genéricos sempre visíveis. | Must | 🟢 `Menu::user` |
| NAV-03 | Cache de menu por usuário/tipo (1 dia) e por processo (7 dias) com invalidação em mutação. | Must | 🟢 MenuCacheService + Observer |
| NAV-04 | Endpoint JSON de menus para o frontend (`GET /menus`). | Must | 🟢 route |
| NAV-05 | Breadcrumb manual por tela (página atual + caminho com links), estado em singleton. | Must | 🟢 Breadcrumb |
| NAV-06 | Dados de permissão por processo para a tela de tipos de usuário (`processes()` com caminho descritivo e `allow`). | Must | 🟢 |
| NAV-07 | Compatibilidade `old`/`parent_old` com o menu legado. | Should | 🟢 |
| NAV-08 | Renomeio regulatório Declaração/Atestado com flseh de cache. | Should | 🟢 |
| NAV-09 | Busca de menus por texto (máx. 15, com link). | Should | 🟢 (sem rota ativa — ver flows) |
| NAV-10 | Alvo: nós declarativos com `required_permission`, Command Palette e favoritos por usuário (DDL no bastão). | Must (alvo) | 🟢 bastão |

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Performance | cache multi-nível (tags) incl. invalidação após commit | Observer afterCommit | 🟢 |
| Consistência | `getMenusByIds` limita profundidade a 5 níveis fixos (recursão em cascata manual) | `Menu.php:65-112` | 🟡 |
| Compatibilidade | adjacência via pacote `staudenmeir/laravel-adjacency-list` (`ancestors()`, `tree()`) | composer/uso | 🟢 |
| Cache físico | `flushAll` limpa por tag do dbname (multi-tenant legado) | MenuCacheService | 🟢 |
| Transversal | cache e auditoria seguem a capa `SupportModules` | por referência | 🟢 |

## Critérios de Aceitação

```gherkin
Dado usuário não-admin sem vínculo em menu_tipo_usuario para o nó "Lançar Notas" (com process)
Quando carregar o menu
Então o nó não aparece na árvore 🟢

Dado usuário admin
Quando carregar o menu
Então recebe a árvore completa (roots) 🟢

Dado nó sem process (agrupador)
Quando usuário sem permissão alguma
Então o agrupador aparece (regra: whereNull process entra sempre) 🟢

Dado alteração em um registro de menu (save/delete)
Quando afterCommit
Então todo o cache de menus é invalidado (flushAll) 🟢

Dado tela da intranet com processoAp X
Quando renderizar o cabeçalho
Então usa getProcessMenuData(X) para título/caminho (breadcrumb de contexto) 🟢

Dado menu com título "Declarações" (fora das exceções)
Quando rodar changeMenusToAttestation
Então título/descrição viram "Atestados" e cache é limpo 🟢

Dado breadcrumb mantido pela tela via Breadcrumb::current()
Quando renderizar a página
Então exibe página atual + páginas empilhadas com links 🟢
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Árvore + filtro por permissão | Must | coração da navegação 🟢 |
| Cache + invalidação | Must | performance/consistência 🟢 |
| Breadcrumb manual (legado) → automático (alvo) | Must | paridade de UX 🟢 |
| Favoritos/Command Palette | Must (alvo) | DDL/serviços no bastão 🟢 |
| Busca por texto | Should | API sem rota ativa 🟡 |

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `app/Menu.php` | modelo Eloquent com adjacência + consultas de usuário/processo/renomeio | 🟢 |
| `app/Services/MenuCacheService.php` | cache tags TTL 1d/7d + dados de processo | 🟢 |
| `app/Observers/MenuObserver.php` | invalidação total em mutação | 🟢 |
| `app/Http/Controllers/WebController.php` | `GET /menus`, `authorization` (abilidades view:/modify:/remove:) | 🟢 |
| `routes/web.php:40` | endpoint | 🟢 |
| `src/Support/Navigation/Breadcrumb.php`, `src/Modules/Navigation/Breadcrumb.php` | breadcrumb (suporte + wrapper) | 🟢 |
| `ieducar/intranet/include/clsBase.inc.php:131-133` | renderização da intranet via cache | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_menus_table.php` + `create_pmieducar_menu_tipo_usuario_table.php` | DDL | 🟢 |
| `database/migrations/*menu*.php` (38) | conteúdo/ordem/permissões | 🟢 |
| `_reversa_sdd/SupportModules/legacy-mapping.md` (tabelas 90–91) | DDL alvo `core_navigation_nodes`/`core_user_navigation_favorites` | 🟢 |
