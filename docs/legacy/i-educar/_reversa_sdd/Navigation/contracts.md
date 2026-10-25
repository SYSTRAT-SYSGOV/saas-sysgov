# Navigation (i-Educar legado) — Contratos

> Superfícies observáveis da navegação. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.
> Transversais por referência: unit `SupportModules`.

---

## Tabela `public.menus` (contrato fonte)

| Coluna | Tipo | Default | Uso |
|---|---|---|---|
| `id` | increments (PK) | — | id do nó |
| `parent_id` | integer nullable | — | hierarquia (adjacência) |
| `title` | string NOT NULL | — | rótulo |
| `description` | string nullable | — | descrição (caminho em `processes()`) |
| `link` | string nullable | — | URL da tela (nó folha) |
| `icon` | string nullable | — | ícone |
| `order` | integer | 99 | ordem |
| `type` | integer | 1 | tipo de item |
| `process` | integer nullable | — | processo de permissão (`App\Process`) |
| `old` / `parent_old` | integer nullable | — | ids do menu legado (compatibilidade) |
| `active` | boolean | true | visibilidade lógica |
| `created_at`/`updated_at` | timestamps | — | — |

🟢 DDL `2020_01_01_110000_create_menus_table.php`

## Tabela `pmieducar.menu_tipo_usuario` (pivot)

| Coluna | Papel |
|---|---|
| `menu_id` | FK `menus.id` |
| `ref_cod_tipo_usuario` | FK tipo de usuário |
| `visualiza` / `cadastra` / `exclui` | nível de acesso ao processo |

Filtros de leitura usam `visualiza = 1` (`wherePivot`); `cadastra/exclui` alimentam abilities (`view:/modify:/remove:{process}`). 🟢

## API interna (contratos)

```php
// App\Menu
public static user(User $user): Collection          // árvore filtrada por tipo (admin = roots())
public static roots(): Collection                   // árvore completa para admin
public static findByUser(User $user, $search)       // busca por texto (max 15) — sem rota no snapshot 🟡
public processes($path, $process, $userLevel)       // lista de nós com process p/ tela de permissões
public hasLink()/isLink()/hasLinkInSubmenu()/root() // metadados de árvore
public static changeMenusToAttestation()/changeMenusToDeclaration() // renomeio regulatório

// App\Services\MenuCacheService
public getMenuByUser(User $user)                    // cache TTL 86400 tags ['menus', dbname, tipo]
public getProcessMenuData(int|string|null $process): array|false // TTL 604800: attributes/root_id/ancestor_ids
public flushAll(): void
public flushMenuTag($tagMenu): void

// iEducar\Support\Navigation\Breadcrumb
public current($currentPage, $pages = []): $this
public push($label, $link): $this
public pages(): array
public currentPage(): string
public hasPages(): bool
public setLegacy(string $legacy) / addBetaFlag()
```
🟢

## Endpoint HTTP

| Rota | Retorno | Uso |
|---|---|---|
| `GET /menus` | árvore do menu do usuário (JSON, cacheada) | frontend SPA 🟢 |
| `GET /authorization` | lista de abilities `view:{p}`/`modify:{p}`/`remove:{p}` | frontend (separado de navegação) 🟢 |

- Não existe endpoint de busca de menu ativo (`findByUser` sem rota). 🟡
- Não existe XML de menus (o XML da unit `TabelaArredondamento` é de tabelas de arredondamento, não navegação). 🟢

## Dados default

- `DefaultMenusTableSeeder`: insere `public.menus.sql` + criações Eloquent (ex. "Consulta de dispensas" sob CONSULTAS), com `incrementSequence` da sequence. 🟢
- 38 migrations de menu guardam conteúdo: `updateOrCreate` por `process`, ordem e permissões (`attachMenuIfNotExists` por tipo de usuário). 🟢
- Sementes citam menus por `old` (menu legado): `->where('old', Process::CONSULTAS)`. 🟢

## Alvo (bastão — tabela 90/91)

```sql
core_navigation_nodes: id UUID, parent_id UUID nullable (FK cascade), code UNIQUE varchar(60),
  title varchar(100), description varchar(255), route_name varchar(100), route_path varchar(255),
  icon_name varchar(50), order_index int default 0, required_permission varchar(100),
  badge_expression varchar(100), is_visible/is_active tinyint(1), timestamps

core_user_navigation_favorites: id UUID, tenant_id, user_id, navigation_node_id,
  order_index int, created_at; UNIQUE (user_id, navigation_node_id)
```
🟢 `_reversa_sdd/SupportModules/legacy-mapping.md`; serviços alvo: `NavigationTreeService` (filtro `required_permission`, cache Redis 3600s por tenant/user) e componente `CommandPaletteModal`.

## Integrações

| Integração | Uso | Confiança |
|---|---|---|
| `Usuario` (tipos de usuário) | filtragem via pivot | 🟢 |
| `App\Process` | identifica processo além do id do menu | 🟢 |
| `clsBase.inc.php` (intranet) | usa MenuCacheService para renderizar menu e contexto do processo | 🟢 |
| Frontend SPA | consome `/menus` e `/authorization` | 🟢 |
