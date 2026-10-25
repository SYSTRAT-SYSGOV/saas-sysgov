# SupportModules (i-Educar legado) — Contracts (capa transversal)

> Contratos de dados, serviços e interfaces compartilhados pelos módulos de suporte.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contratos de dados

### 1.1 `public.menus`

| Coluna | Tipo | Semântica | Confiança |
|---|---|---|---|
| `id` | increments | Identificador do nó | 🟢 |
| `parent_id` | int null | Pai (lista de adjacência) | 🟢 |
| `title`, `description` | string | Rótulo e descrição (usada também como caminho no breadcrumb de permissões) | 🟢 |
| `link` | string null | URL do recurso (null = pasta) | 🟢 |
| `icon`, `order`, `type` | ranges | Ícone e ordenação | 🟢 |
| `process` | int null | Processo de permissão (nulo para pastas) | 🟢 |
| `old`, `parent_old` | int null | IDs do menu legado original (chave de migração) | 🟢 |
| `active` | boolean | Visibilidade | 🟢 |

Fonte: `database/migrations/table/2020_01_01_110000_create_menus_table.php`; sem FK de self-reference declarada e sem unique; `order` default 99.

### 1.2 `pmieducar.menu_tipo_usuario` (pivô, legado intrínseco)

| Coluna | Semântica | Confiança |
|---|---|---|
| `menu_id` | Nó do menu | 🟢 |
| `ref_cod_tipo_usuario` | Tipo de usuário | 🟢 |
| `visualiza` | 1 = tipo vê o menu (e recebe notificações do processo) | 🟢 |

### 1.3 `public.notifications` e `public.notification_type`

| Coluna | Semântica | Confiança |
|---|---|---|
| `text` | Corpo da mensagem | 🟢 |
| `link` | URL de destino (presignada nos tipos de exportação) | 🟢 |
| `read_at` | Nulo = não lida | 🟢 |
| `user_id`, `type_id` | Destinatário e tipo | 🟢 |
| type | 1 transferência, 2 outros, 3 exportação aluno, 4 exportação professor, 5 busca ativa | 🟢 |

Sem índice de dedup, sem prioridade/categoria, sem payload estruturado (linha `2022_08_01_133650_create_index_in_notifications.php` cria índices de consulta). 🟢

### 1.4 `announcements`, `announcement_user_types`, `announcement_users`

| Coluna/entidade | Semântica | Confiança |
|---|---|---|
| `name`, `description` | Título e corpo (descrição sanitizada por `strip_tags` com lista de tags permitidas) | 🟢 |
| `repeat_on_login` | Repete a cada login | 🟢 |
| `show_confirmation` | Exige ciência (barreira do middleware) | 🟢 |
| `show_vacancy` | Mostra quadro de vagas por escola/turma | 🟢 |
| `created_by_user_id` | Autor (FK `pmieducar.usuario`) | 🟢 |
| pivot users | `read_at` (exibição) e `confirmed_at` (ciência) | 🟢 |
| SoftDeletes | Em `announcements`, `announcement_users` e `message` | 🟢 |

### 1.5 `school_notices` e `messages`

| Entidade | Colunas-chave | Confiança |
|---|---|---|
| `school_notices` (process 1027) | `institution_id`, `school_id`, `user_id`, `title`, `description`, `date`, `hour`, `local` | 🟢 |
| `messages` | `messageable_type/id` (morph), `user_id`, `description` | 🟢 |

### 1.6 Contratos alvo (novos, sem paridade)

`core_system_errors`, `core_audit_logs`, `core_navigation_nodes`, `core_user_navigation_favorites`, `core_notifications`, `core_announcements`, `core_announcement_reads`. 🔴 bastão `:46-221`

---

## 2. Contratos de serviço

### 2.1 Tracker

```php
interface Tracker { public function notify(Throwable $exception, $data = []); }
TrackerFactory::getTracker('HONEY_BADGER' | 'EMAIL'): Tracker
```
Bind do container: `Tracker::class → HoneyBadgerTracker::class`. 🟢

### 2.2 Menu

```php
Menu::user(User): Collection              // admin: todas as raízes; comum: árvore filtrada por tipo
Menu::findByUser(User, $search): Collection|15 // busca ilike por title/description
MenuCacheService::getMenuByUser(User): Collection  // cache tags menus/{client}/{user}, TTL 86400
MenuCacheService::getProcessMenuData(?int): array|false // TTL 604800
```
🟢 `Menu.php`, `MenuCacheService.php`

### 2.3 Notificações

```php
NotificationService::createByUser(int, string, string, int)
NotificationService::createByPermission(int $process, string, string, int)  // destinatários via pivô do menu
NotificationService::createByUserLevel(int $level, string, string, int)
Notification::needsPresignerUrl(): bool  // types 3 e 4 → URL presignada
NotificationUrlPresigner::getNotificationUrl(Notification): string
```
🟢

### 2.4 Evento de broadcast

```php
NotificationEvent implements ShouldBroadcast {
    broadcastOn(): Channel("{tenant}-notification-{md5(user_id)}")  // Channel público
    tags(): [tenant, 'notification', type->name]
}
```
`tenant` do construtor é `DB::getDefaultConnection()` no ponto de chamada. 🟢 `NotificationService.php:46`, `NotificationEvent.php:41-57`

### 2.5 Comunicados

```php
AnnouncementMiddleware (grupo web, só GET HTML não-JSON/PJAX)
CacheService::rememberAnnouncementByUserType(tipo, fn)  // último aviso do tipo
AnnouncementUserController::show()   // sync read_at + tela
AnnouncementUserController::confirm() // sync confirmed_at → redirect '/'
AnnouncementPublishController::store/update (sync tipo de usuário, restore/delete por flag active)
```
🟢

### 2.6 Rotas/Views

| Rota/tela | Papel | Confiança |
|---|---|---|
| `notification.index` (menu Process::SCHEDULE) | Listagem por usuário com filtros tipo/status/texto | 🟢 |
| `announcement.user.show` / `announcement.publish.*` | Tela do aviso e gestão de publicação | 🟢 |
| Bloqueio: `redirect()->route('announcement.user.show')` | Barreira | 🟢 |

---

## 3. Contratos cruzados com outras units

| Unit | Contrato | Direção | Confiança |
|------|----------|---------|-----------|
| `Usuario` | Pivô menu-tipo e níveis de usuário (admin/all) | Entrada | 🟢 |
| `Reports` / `FileExport` | Notificações de exportação pronta com URL presignada (types 3/4) e tracker de falha de render | Saída antiga → nova | 🟢 |
| Enrollments (`matricula`) | Listener de transferência cria notificações | Entrada | 🟢 |
| People/Busca Ativa | Listener de busca ativa e `messages` polimórficas | Entrada | 🟢 |
| `Configuracao` | `school_notices` por instituição; menus de configuração | Entrada | 🟢 |
| `ErrorTracking`/`Navigation`/`Notifications` (units próprias) | Detalhamento fina por pilar | Referência | 🟢 |

---

## 4. Configurações

| Flag | Papel | Confiança |
|---|---|---|
| `APP_TRACK_ERROR` | Liga rastreio de exceções (default false) | 🟢 `config/app.php:227` |
| `legacy.modules.error.honeybadger_key` | API key do tracker | 🟢 `config/legacy.php:142` |
| `legacy.modules.error.email_recipient` | Destinatário do e-mail de erro | 🟢 `:143` |
| `BROADCAST_DRIVER` | pusher/ably/redis/log/null (default null) | 🟢 `config/broadcasting.php` |
| `app.debug`/`legacy.display_errors` | Verbosidade de erro exibida ao usuário | 🟢 |

---

## 5. Lacunas de contrato

- Sem trace_id/correlation id em qualquer log. 🔴
- Sem agregação local de erros (sem tabela de incidentes). 🔴
- Canal de broadcast composto e público, sem autenticação de canal. 🟡
- Comunicado: trilha sem IP/UA; "último aviso" só — sem janela de vigência (`starts_at/ends_at` são net-new). 🟢/🔴
- `school_notices` sem vínculo com o centro de notificações (exibição independente). 🟡
