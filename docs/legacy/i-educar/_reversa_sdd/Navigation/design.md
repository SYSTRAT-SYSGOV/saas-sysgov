# Navigation (i-Educar legado) — Design

> Estrutura de dados, contratos, fluxos, dependências e riscos navegação.
> Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Modelo relacional vivo

| Tabela | Chaves | Colunas | Confiança |
|---|---|---|---|
| `public.menus` | id PK (increments) | `parent_id nullable`, `title`, `description nullable`, `link nullable`, `icon nullable`, `order default 99`, `type default 1`, `process nullable`, `old nullable`, `parent_old nullable`, `active default true`, timestamps | 🟢 |
| `pmieducar.menu_tipo_usuario` | pivot (menu_id, ref_cod_tipo_usuario) | `visualiza`, `cadastra`, `exclui` (FKs na migração 2020-01) | 🟢 |

### Classes

| Classe | Papel | Fonte |
|---|---|---|
| `App\Menu` | modelo com `HasRecursiveRelationships` (staudenmeir): `tree()`, `ancestors()`, `children()`, `parent()`, `userTypes()` (pivot visualiza=1); `user()`, `roots()`, `findByUser()`, `processes()`, `changeMenusTo*` | 🟢 |
| `App\Services\MenuCacheService` | cache de árvore (TTL 86400) e de processo (TTL 604800) com tags; `flushAll` por dbname | 🟢 |
| `App\Observers\MenuObserver` | invalidação total em saved/deleted (afterCommit) | 🟢 |
| `iEducar\Support\Navigation\Breadcrumb` | singleton de breadcrumb (current/push/pages/currentPage/hasPages, beta, legacy) | 🟢 |
| `iEducar\Modules\Navigation\Breadcrumb` | wrapper que delega ao singleton | 🟢 |
| `App\Http\Controllers\WebController` | `GET /menus`, `user`, `authorization`(abilities) | 🟢 |

### Contrato do endpoint `GET /menus`

- Resposta: árvore serializada de `Menu` (id, parent_id, title, description, link, icon, order, type, process, active, children). 🟡 (formato por serialização Eloquent default)
- Autenticação: middleware padrão do SPA (usuário logado); filtragem server-side por tipo. 🟢
- `GET /authorization` complementa com abilities `view/modify/remove:{process}`. 🟢 `WebController.authorization`

---

## Fluxo Principal — menu por usuário (SPA + intranet)

1. `GET /menus` (frontend) ou `clsBase.inc.php` (intranet legada) pede `MenuCacheService.getMenuByUser($user)`. 🟢
2. Verifica cache por tipo de usuário (`menu-{client}-{tipo}`), tags `['menus', dbname, tipo]`. 🟢
3. Miss: `Menu::user($user)` — admin: árvore completa; outros: constraint recursiva + `whereHas('userTypes')`. 🟢
4. Armazena por 1 dia. 🟢
5. Renderização: SPA ou `clsBase` (menu vertical da intranet). 🟢
6. Para o contexto da tela (`processoAp`): `getProcessMenuData(process)` (7 dias de cache) devolve atributos do menu, raiz e idades — alimenta título/caminho. 🟢

## Fluxo 2 — edição de permissões por tipo de usuário

1. A tela de tipos de usuário lista processos via `Menu::processes($path, $process, $userLevel)` (caminho descrito "Pai > Filho"). 🟢
2. Cada nó com process expõe `allow = process->get(menu_id, 0)`; gravação pela pivot `menu_tipo_usuario`. 🟢 (unit `Usuario`)
3. `Process::CONFIG`/`SETTINGS` excluídos para não-admin. 🟢

## Fluxo 3 — mutação de menu (migrations/CRUD)

1. Migration `updateOrCreate` por process + `attachMenuIfNotExists` por tipos. 🟢
2. Save/delete dispara `MenuObserver` → `flushAll()` (após commit). 🟢
3. Seeds (`DefaultMenusTableSeeder`) incrementam sequence e criam menus novos via Eloquent. 🟢

## Fluxo 4 — breadcrumb manual (legado)

1. Controller/tela chama `$this->breadcrumb('Título', [url => 'Pai', ...])` → wrapper `Modules\Navigation\Breadcrumb::makeBreadcrumb` → singleton `Support\Navigation\Breadcrumb::current(...)`. 🟢
2. Render final lê `pages()` + `currentPage()` (template da intranet). 🟡 (implementação de template opaca a esta unit)
3. `beta`/`legacy` flags marcam telas novas vs legadas. 🟢

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| `getProcessMenuData` sem menu para o processo | retorna `false` (sem breadcrumb de contexto) | 🟢 |
| Falha no cache (adapter) | degrada para consulta direta | 🟡 |
| Mutação de menu durante fluxo de usuário | cache antigo até `afterCommit` flush | 🟢 |
| Busca (`findByUser`) | sem rota ativa no snapshot (código morto) | 🟡 |
| Nó folha sem nenhum link na subárvore | `hasLink()` falso → não clicável na renderização | 🟢 |

---

## Dependências

| Dependência | Papel | Fonte |
|-------------|-------|-------|
| `Usuario` | tipos de usuário e pivot menu_tipo_usuario | 🟢 |
| `SupportModules` (capa) | cache/observabilidade transversais | 🟢 (referência) |
| `staudenmeir/laravel-adjacency-list` | recursão de árvore | 🟢 |
| Cache (Redis/tags) | MenuCacheService | 🟢 |
| `Configuracao` (`legacy.app.database.dbname`) | chave de tenant no cache | 🟢 |
| Process (`App\Process`) | identidade dos processos de permissão | 🟢 |

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Menu por **tipo de usuário** no cache (não por usuário) | getUserKey | 🟢 |
| Nós agrupadores sem process isentos de permissão | Menu::user | 🟢 |
| `old`/`parent_old` como ponte com o menu legado | DDL + seeds | 🟢 |
| Invalidação **global** em qualquer mutação de menu (simples, custo alto em mutação frequente) | Observer | 🟢 🟡 |
| Breadcrumb como singleton armazenado por request (em vez de por rota) | Support Breadcrumb | 🟢 |
| Wrapper `Modules\Navigation\Breadcrumb` (redundante) | 12 linhas | 🟡 |
| Profundidade fixa (5) no getMenusByIds em vez de recursão SQL | Menu | 🟢 🟡 |
| Alvo separa navegação de permissão (`required_permission` por nó) | bastão DDL 90 | 🟢 |

## Estado interno

- `Menu._tabelaValores`... não: `Breadcrumb.pages/currentPage/beta/legacy` em memória por request; `MenuCacheService` persistente em cache. 🟢
- Cache tags dependem do driver suportar (Redis/memcached). 🟡

---

## Riscos e lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Bastão desatualizado | legado atual usa `public.menus` (não `portal.menu_menu` direto), com ponte old/parent_old | bastão × DDL | 🟡 |
| Busca de menu morta | `Menu::findByUser` sem chamador/rota | grep | 🟡 |
| `flushAll` global | renomeio de menu invalida menus de todos os tipos/tenants | Observer | 🟢 |
| Recursão fixa de 5 níveis | árvore mais funda quebraria o eager-loading manual de `getMenusByIds` | getMenusByIds | 🟡 |
| Formato do `/menus` | serialização default do Eloquent (sem contrato tipado) | WebController | 🟡 |
| Favoritos inexistentes no legado | core_user_navigation_favorites é novidade do alvo (sem origem de migração) | bastão | 🟢 |
