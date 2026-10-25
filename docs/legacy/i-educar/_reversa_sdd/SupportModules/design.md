# SupportModules (i-Educar legado) — Design (capa transversal)

> Estrutura dos três subsistemas de suporte, camadas compartilhadas, dependências e riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Camadas

```
Exception ──▶ Handler::reportable ──▶ Tracker (bind) ──▶ Honeybadger (HTTP síncrono)
                            │                    └────▶ ErrorTrackerMail (SMTP)
Controller ──▶ Breadcrumb (manual) + menu(Process) ──▶ MenuCacheService ──▶ cache tags
Service    ──▶ NotificationService ──▶ public.notifications ──▶ NotificationEvent ──▶ Broadcast (Pusher|null)
Middleware (web group) ──▶ AnnouncementMiddleware ──▶ announcements ──▶ bloqueio/redirect
```

### Componentes

| Componente | Papel | Fonte |
|----------|-------|-------|
| `TrackerFactory` / `Tracker` | Seleção do tracker (HONEY_BADGER ou EMAIL) | 🟢 `src/Modules/ErrorTracking/TrackerFactory.php:10-19` |
| `HoneyBadgerTracker` | Envio síncrono com context/component/action | 🟢 `HoneyBadgerTracker.php:9-27` |
| `EmailTracker` | E-mail com HTML do stack para `legacy.modules.error.email_recipient` | 🟢 `EmailTracker.php:17-40` |
| `App\Menu` | Árvore adjacente com `HasRecursiveRelationships`, pivô `menu_tipo_usuario` | 🟢 `app/Menu.php:14-32`, `:296-307` |
| `MenuCacheService` | Cache por usuário (TTL 86400) e por processo (TTL 604800), tags `menus/{client}` | 🟢 `app/Services/MenuCacheService.php:16-52` |
| `Breadcrumb` | Página atual + páginas anteriores definidas manualmente por controller | 🟢 `src/Support/Navigation/Breadcrumb.php:9-80` |
| `NotificationService` | Criação por usuário, permissão (processo) ou nível; broadcast com URL presignada | 🟢 `app/Services/NotificationService.php:13-61` |
| `NotificationEvent` | `ShouldBroadcast` no canal `{tenant}-notification-{md5(user_id)}` | 🟢 `app/Events/NotificationEvent.php:44-48` |
| `AnnouncementMiddleware` | Barreira de ciência no grupo `web` (só GET HTML) | 🟢 `app/Http/Middleware/AnnouncementMiddleware.php:14-33` |
| `Announcement` / `AnnouncementUser` / `AnnouncementTipoUsuario` | Comunicados com read/confirmed no pivô | 🟢 `app/Models/Announcement.php` |
| `SchoolNotice` (process 1027) | Avisos escolares por escola com data/hora/local | 🟢 `app/Models/SchoolNotice.php:8-50` |
| `Message` | Mensagem polimórfica (`messageable`) ligada a registros de domínio | 🟢 `app/Models/Message.php:6-30` |

---

## Fluxos de referência (resumo)

- **Falha de render/regra:** qualquer `Throwable` reportável → tracker síncrono → exterior; sem persistência local. 🟢 `Handler.php:43-53`
- **Navegação:** `WebController`/base controller pedem árvore ao `MenuCacheService`; usuário comum filtra por tipo com pivô; admin recebe todas as raízes; busca rápida limita a 15 itens com `ilike`. 🟢 `Menu.php:315-353`
- **Notificação:** serviço resolve destinatários (por permissão via pivô de menu, por escola/nível via `HasNotificationUsers`) → grava → evento broadcast para canal do usuário → front som/contagem. 🟢 `NotificationService.php` + `HasNotificationUsers.php`
- **Comunicado:** middleware intercepta qualquer GET HTML do grupo `web`; sem confirmação → redirect para tela do aviso; `sync` marca `read_at` na exibição e `confirmed_at` ao clicar "ciente". 🟢 `AnnouncementMiddleware.php`, `AnnouncementUserController.php:24-32`, `:47-58`

---

## Dependências cruzadas

| Relação | Detalhe | Fonte |
|---------|--------|-------|
| Suporte ← domínio | Listeners de domínio (`TransferNotificationListener`, `ActiveLookingNotificationListener`, `NotificationWhenResetPassword`) alimentam o centro de notificações. | 🟢 `app/Listeners/*` |
| Notificações ← menu x permissão | Destinatário por processo reaproveita o mesmo pivô do menu. | 🟢 `NotificationService.php:13-33` |
| Erros ← configuração | `app.trackerror`, `honeybadger_key` em `legacy.modules.error`. | 🟢 `config/app.php:227`, `config/legacy.php:142-143` |
| Broadcast ← infra | `BROADCAST_DRIVER` default `null`; Pusher como opção. | 🟢 `config/broadcasting.php` |
| Breadcrumb ← units de tela | Cada controller de cada unit chama `breadcrumb()` + `menu(Process)`. | 🟢 padrão em todos os controllers |

---

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Tracker como estratégia com bind único (sem tentativa remota/queue). | `AppServiceProvider.php:112` | 🟢 |
| Menu e permissão como a mesma entidade (`menu_tipo_usuario`) — raiz do acoplamento apontado no bastão. | `Menu.php:296-307` | 🟢 |
| Cache de menu com tags para invalidação em bloco (client/tipo) via `flushAll` em troca de rótulo. | `Menu.php:235-291` | 🟢 |
| Canal de broadcast composto no nome (tx sem auth de canal privado; `Channel` público). | `NotificationEvent.php:41-43` | 🟡 |
| Comunicado com estilo "barreira" implementada em middleware do grupo web. | `Kernel.php:73` | 🟢 |
| Mensagem de domínio em tabela polimórfica separada do centro de notificações. | `Message.php` | 🟢 |

---

## Estado interno

- Caches: `menus/{client}/{user}` (árvore, 86400) e `menu-process-{client}-{process}` (604800). 🟢
- Pivots de comunicado: `announcement_users.read_at/confirmed_at` (com SoftDeletes) e `announcement_user_types`. 🟢 migração
- Flags: `APP_TRACK_ERROR`, `legacy.modules.error.honeybadger_key`, `legacy.modules.error.email_recipient`, `BROADCAST_DRIVER`. 🟢

---

## Riscos transversais

| Risco | Descrição | Confiança |
|-------|-----------|-----------|
| Payload cru no tracker | Request com PII enviada sem máscara para Honeybadger (LGPD). | 🔴 |
| Acoplamento menu x permissão | Renomear/rearranjar menus muda autorização de notificações; migração precisa separar antes. | 🔴 |
| Canal de broadcast público | `Channel` (não `PrivateChannel`) sem verificação de acesso na autenticação da conexão. | 🟡 |
| Bloqueio em middleware global | Comunicado incorreto trava tudo em GET; sem painel de emergência para desativar além do soft delete. | 🟡 |
| Cache de menu por tag do cache store | Requer store que suporte tags (Redis); troca de driver silenciosamente muda TTL/invalidação. | 🟡 |
| Ausência de trace ou agregação local | Erros repetidos não agrupam; incidente histórico não audita por tenant. | 🔴 |
