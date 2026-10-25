# Notifications (i-Educar legado) — Contratos

> Superfícies observáveis das notificações/comunicados. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.
> Transversais por referência: unit `SupportModules`.

---

## Tabelas (contrato fonte)

### `public.notifications`

| Coluna | Tipo | Uso |
|---|---|---|
| `id` | bigIncrements (PK) | — |
| `text` | text | corpo da notificação |
| `link` | string nullable | URL de destino (presignada p/ tipos 3/4) |
| `read_at` | dateTime nullable | leitura individual |
| `user_id` | integer | destinatário |
| `type_id` | integer | FK `public.notification_type` (sem FK declarada no DDL) |
| índices | `user_id`, `read_at` | centro de notificações (2022) |

🟢 DDL `2020_01_01_110000_create_notifications_table.php` + `2022_08_01_133650`

### `public.notification_type`

| id | name |
|---|---|
| 1 | Transferência (`TRANSFER`) |
| 2 | Outros (`OTHER`) |
| 3 | Export estudante (`EXPORT_STUDENT`) |
| 4 | Export professor (`EXPORT_TEACHER`) |
| 5 | Busca Ativa (`ACTIVE_LOOKING`, 2025-07) |

🟢 `NotificationType.php`

### `announcements`

| Coluna | Tipo | Uso |
|---|---|---|
| `id` | smallIncrements (PK) | — |
| `name` | string | título |
| `description` | text (HTML sanitizado) | conteúdo |
| `repeat_on_login` | boolean default false | reexibir e resetar ciência a cada login |
| `show_confirmation` | boolean default false | barreira de ciência |
| `show_vacancy` | boolean default false | exibir vagas na tela |
| `created_by_user_id` | unsignedInteger nullable FK `pmieducar.usuario` (cascade) | autor |
| softDeletes + timestamps | — | exclusão lógica |

🟢 DDL `2024_08_12_223334`

### `announcement_user_types` / `announcement_users`

| Tabela | Colunas | Papel |
|---|---|---|
| `announcement_user_types` | PK (announcement_id, user_type_id) | público por tipo de usuário |
| `announcement_users` | PK (announcement_id, user_id) + `confirmed_at`, `read_at` | ciência (e leitura?) por usuário |

🟢 DDL; `read_at` sem fluxo identificado 🔴

### `messages`

| Coluna | Tipo | Uso |
|---|---|---|
| `messageable_type`/`messageable_id` | morphs | registro de domínio vinculado |
| `user_id` | unsignedBigInteger nullable FK `pmieducar.usuario` (set null) | autor |
| `description` | text | conteúdo |
| timestamps + softDeletes | — | — |

🟢 DDL `2025_07_18`

### `school_notices`

| Coluna | Papel |
|---|---|
| `institution_id`, `school_id`, `user_id` | contexto (escola/autor) |
| `title`, `description` | conteúdo |
| `date`, `hour`, `local` | quando/onde |
| softDeletes | — |

🟢 DDL `2025_01_12`; constante `SchoolNotice::PROCESS` para telas legacy

## API interna (contratos)

```php
// App\Services\NotificationService
public createByUser(int $userId, string $text, ?string $link, int $type): Notification
public createByPermission(int $permissionId, string $text, ?string $link, int $type): void
public createByUserLevel(int $level, string $text, ?string $link, int $type): void

// App\Events\NotificationEvent (ShouldBroadcast)
broadcastOn(): Channel  // "{tenant}-notification-{md5(user_id)}"

// App\Models\Notification
needsPresignerUrl(): bool  // type_id em {3, 4}

// App\Services\NotificationUrlPresigner
presign(Notification $notification): ?string

// App\Services\CacheService
rememberAnnouncementByUserType(int $userTypeId, Closure $cb): mixed  // TTL 604800
clearAnnouncements(): void  // invalida por tipo de usuário

// App\Services\MessageService
create(string $type, int $id, int $userId, string $description): Message  // transaction
update/delete: exigem autoria (AuthorizationException)
```
🟢

## Endpoint HTTP

| Rota | Ação | Uso |
|---|---|---|
| `GET /notificacoes` | `NotificationController@index` | centro de notificações 🟢 |
| `GET /notificacoes/retorna-notificacoes-usuario` | por usuário logado (sem middleware de aviso) | polling do frontend 🟢 |
| `GET /notificacoes/quantidade-nao-lidas` | contador | badge 🟢 |
| `POST /notificacoes/marca-como-lida` | marca uma | leitura 🟢 |
| `POST /notificacoes/marca-todas-como-lidas` | marca todas | leitura 🟢 |
| `GET /avisos/publicacao(/criar|/editar/...)` | CRUD de comunicados, `can:*:{Process::ANNOUNCEMENT}` | gestores 🟢 |
| `GET/POST /avisos` (user show/confirm) | ciência do aviso | barreira 🟢 |

Rota de polling e de aviso registradas com `withoutMiddleware(AnnouncementMiddleware)`. 🟢 `routes/web.php:136-156`

## Alvo (bastão — tabelas 92–94)

```sql
core_notifications: id UUID, tenant_id, user_id, category enum, priority enum,
  title, body, action_url, channels json, read_at, timestamps (+ índices)
core_announcements: id UUID, tenant_id, title, body (sanitizado), audience por
  perfil, require_ack, repeat_on_login, publish windows, created_by
core_announcement_reads: id UUID, announcement_id, user_id, acked_at, ack_ip,
  UNIQUE (announcement_id, user_id)
```
🟢 `_reversa_sdd/SupportModules/legacy-mapping.md`; `NotificationHubService` omnichannel (In-App, Push, Email, WhatsApp) com retentativas é objetivo do alvo. 🟢 bastão

## Integrações

| Integração | Uso | Confiança |
|---|---|---|
| `Navigation` / `Usuario` | público das notificações por menu/pivot e níveis | 🟢 |
| Broadcast driver (Pusher/Redis) | tempo real (opcional; default null) | 🟢 |
| Exportadores (Reports) | notificações com link presignado | 🟢 |
| Login (autenticação) | reset de ciência com `repeat_on_login` | 🟢 |
| Middleware stack web | barreira em GETs | 🟢 |
