# Navigation (i-Educar legado) — Fluxos

> Fluxos observados no código. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.
> Transversais por referência: unit `SupportModules`.

---

## Fluxo 1 — Carregamento do menu

1. Frontend SPA chama `GET /menus`; intranet legada (`clsBase.inc.php:131`) chama `MenuCacheService.getMenuByUser($user)`. 🟢
2. Cache lookup por tipo de usuário (`menu-{dbname}-{tipo}`, tags `['menus', dbname, tipo]`); hit devolve a árvore. 🟢
3. Miss: `Menu::user($user)` — admin → `roots()` (árvore completa); não-admin → constraint recursiva que inclui nós sem `process` e nós com `process` permitido ao tipo (pivot `visualiza = 1`), exceto `CONFIG`/`SETTINGS`. 🟢
4. Cache por 24h. 🟢
5. Contexto da tela (`processoAp`): `getProcessMenuData(process)` entrega `attributes`/`root_id`/`ancestor_ids` (cache 7 dias) para título/caminho na intranet. 🟢

## Fluxo 2 — Breadcrumb por tela

1. Controller legado chama `$this->breadcrumb(...)` → `iEducar\Modules\Navigation\Breadcrumb::makeBreadcrumb` → singleton `Support\Navigation\Breadcrumb::current(página, [link => rótulo])`. 🟢
2. Template do layout lê `pages()`/`currentPage()`/`hasPages()` e desenha a trilha. 🟡
3. Flag `beta` distingue telas novas no layout. 🟢
4. No alvo: breadcrumbs automáticos a partir da rota (`route_name`/`route_path` do nó) — no legado são manuais por tela. 🟢 (bastão)

## Fluxo 3 — Mutação de menu

1. Migration/CRUD faz `updateOrCreate` por process e `attachMenuIfNotExists` nos tipos de usuário (pivot com visualiza/cadastra/exclui = 1). 🟢
2. Save/delete de qualquer menu dispara `MenuObserver` (afterCommit) → `flushAll()`: todo o cache de menus é invalidado. 🟢
3. `changeMenusToAttestation`/`changeMenusToDeclaration` renomeiam títulos (ilike) com exceções fixas 999229/999812 e limpam o cache. 🟢

## Fluxo 4 — Permissões por processo (tela de tipo de usuário)

1. `Menu::processes($path, $process, $userLevel)` percorre `children` acumulando caminhos "Pai > Filho". 🟢
2. Nós com process (e pai) entram na lista com `allow` = permissão do tipo de usuário naquele processo; `CONFIG`/`SETTINGS` ocultos para não-admin. 🟢
3. A tela grava a pivot `menu_tipo_usuario` (unit `Usuario`). 🟢

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| Processo sem menu cadastrado | `getProcessMenuData` → `false` | 🟢 |
| Usuário sem nenhum vínculo | vê apenas nós agrupadores sem process | 🟢 |
| Cache indisponível | consulta direta (degradação) | 🟡 |
| Busca de menu | API existe, sem rota ativa | 🟡 |
| Mutação concorrente | cache antigo visível até afterCommit | 🟢 |

## Pontos de Fail-silente (coleta para o Revisor)

- `flushAll` global: qualquer edição de menu invalida menus de todos os tipos de usuários/tenants (custo aceitável em mutação rara, mas é total). 🟢
- `getMenusByIds` com profundidade fixa de 5 níveis: árvores mais fundas perdem filhos silenciosamente. 🟡
- `findByUser` código morto: se o alvo precisar de busca, o contrato já existia (max 15, só nós com link). 🟡
- Nó folha sem link e sem filhos clicáveis pode restar como item morto no menu (renderização depende do hasLink). 🟡
