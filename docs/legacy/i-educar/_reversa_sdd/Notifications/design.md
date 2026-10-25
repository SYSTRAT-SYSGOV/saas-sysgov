# Notifications (i-Educar legado) — Design

> Estrutura de dados, contratos, fluxos, dependências e riscos das notificações/comunicados.
> Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Modelo relacional (legado)

| Tabela | Chaves | Colunas | Confiança |
|---|---|---|---|
| `public.notifications` | id bigIncrements; índices `user_id`, `read_at` | `text`, `link nullable`, `read_at nullable`, `user_id`, `type_id`, timestamps | 🟢 |
| `public.notification_type` | id bigIncrements | `name` (5 tipos: 1 transferência, 2 outros, 3 export estudante, 4 export professor, 5 busca ativa) | 🟢 |
| `announcements` | id smallIncrements; softDeletes | `name`, `description text` (HTML sanitizado), `repeat_on_login false`, `show_confirmation false`, `show_vacancy false`, `created_by_user_id nullable FK usuario` | 🟢 |
| `announcement_user_types` | PK composta (announcement_id, user_type_id) | FKs announcement/tipo_usuario | 🟢 |
| `announcement_users` | PK composta (announcement_id, user_id) | `confirmed_at nullable`, `read_at nullable` | 🟢 |
| `messages` | id; morphs messageable; FK user_id set null | `description text`, timestamps, softDeletes | 🟢 |
| `school_notices` | id | `institution_id`, `user_id`, `school_id`, `title`, `description`, `date`, `hour`, `local`, softDeletes | 🟢 |

### Classes

| Classe | Papel | Fonte |
|---|---|---|
| `App\Models\Notification` | in-app; `needsPresignerUrl()` (tipos 3/4) | 🟢 |
| `App\Services\NotificationService` | createByUser/ByPermission/ByUserLevel + evento | 🟢 |
| `App\Events\NotificationEvent` | ShouldBroadcast no canal público composto; tags tenant/notification/upload | 🟢 |
| `App\Services\NotificationUrlPresigner` | presign de link para exportações | 🟢 |
| `App\Models\Announcement` | comunicado; mutator strip_tags com allowlist | 🟢 |
| `App\Http\Middleware\AnnouncementMiddleware` | barreira de ciência em GETs | 🟢 |
| `App\Observers\AnnouncementObserver` | limpa cache de comunicados | 🟢 |
| `App\Services\CacheService::rememberAnnouncementByUserType` | cache 7d por tipo | 🟢 |
| `App\Models\Message` + `MessageService` | mensagens morfáveis CRUD com autorização | 🟢 |
| `App\Models\SchoolNotice` | comunicado escolar (telas legacy próprias) | 🟢 |

---

## Fluxo Principal — notificação por permissão

1. Serviço de domínio chama `createByPermission(processId, texto, link, tipo)`. 🟢
2. Descobre o menu com `menus.process = processId`; lê `pmieducar.menu_tipo_usuario` (`visualiza = 1`). 🟢
3. Para cada tipo, busca os usuários ativos de `ref_cod_tipo_usuario`; faz fan-out: `createByUser` cria 1 registro em `public.notifications`. 🟡 (N queries)
4. Para cada notificação: presign do link (se export) e `NotificationEvent` broadcast no canal `{dbname}-notification-{md5(user_id)}`. 🟢
5. Frontend (`blade`/SPA) assina o canal e lista no centro de notificações; leitura marca `read_at`. 🟢

## Fluxo 2 — barreira de comunicado (ciência compulsória)

1. Login: `LoginController` pega o comunicado mais recente para o tipo de usuário; se `repeat_on_login` → reinicia confirmação e força `/avisos`. 🟢
2. Qualquer requisição GET passa por `AnnouncementMiddleware`: busca último comunicado do tipo (cache 7d); se `show_confirmation` e sem `confirmed_at` → flash "Confirme a ciência do aviso antes de prosseguir!" + redirect `/avisos`. 🟢
3. `POST /avisos` (`AnnouncementUserController@confirm`) grava `confirmed_at`; rota/class exibição fora do middleware. 🟢
4. Mutação de comunicado limpa o cache (Observer). 🟢

## Fluxo 3 — publicação de comunicado

1. Gestor com `can:view|create|modify:{Process::ANNOUNCEMENT}` usa `/avisos/publicacao`. 🟢
2. `description` sanitizado por allowlist na entrada; público salvo em `announcement_user_types`. 🟢
3. `AnnouncementObserver` limpa cache de comunicados após saved/deleted/restored. 🟢

## Fluxo 4 — mensagens morfáveis

1. `MessageService.create|update|delete` em transaction; update/delete exigem autoria (`AuthorizationException`). 🟢
2. `messageable` aponta para registros de domínio (ex.: histórico de processos); migração 2025-07 moveu "observações antigas" para `messages`. 🟢 🟡

## Fluxo 5 — comunicados escolares

1. Telas legacy `educar_comunicados_escolares_{lst,det,cad}.php` (permissão `SchoolNotice::PROCESS`, nível 7) mantêm CRUD de avisos por escola. 🟢
2. Sem integração com o centro de notificações (`public.notifications`). 🟡

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| Sem driver de broadcast (default `null`) | notificação persiste; sem tempo real | 🟢 |
| Processo sem menu (createByPermission) | `Menu::where(process)->first()` null → erro 500 | 🟢 🟡 |
| Falha no canal | badge não atualiza; banco mantém a notificação | 🟢 🟡 |
| Múltiplos avisos ativos | só o `latest()` do tipo vale por vez | 🟢 |
| Comunicados escolares | isolados (sem barreira, sem evento) | 🟡 |

---

## Dependências

| Dependência | Papel | Fonte |
|-------------|-------|-------|
| `Navigation` (`menus`/pivot) | descoberta de público por processo | 🟢 |
| `Usuario` | tipos/níveis de usuário | 🟢 |
| `SupportModules` (capa) | cache/auditoria/barreira transversal | 🟢 (referência) |
| Broadcast driver (pusher/redis) | tempo real (opcional) | 🟢 |
| `UrlPresigner` | exportações presignadas | 🟢 |
| Middleware web | barreira de GETs | 🟢 |
| `Reports`/exportadores | disparam notificações de exportação | 🟢 |

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Canal de broadcast público composto (md5 do user id) em vez de canal privado autenticado | NotificationEvent | 🟢 |
| Fan-out 1 registro por usuário (estado de leitura individual) em vez de broadcast + tracking | NotificationService | 🟢 |
| Somente 1 comunicado vigente por tipo (latest) — sem fila de comunicados | middleware | 🟢 |
| Sanitização HTML por allowlist no mutator do modelo | Announcement | 🟢 |
| Notificações sem tenant explícito (conn de banco por tenant) | DDL | 🟡 |
| 4 famílias desconectadas (notification/announcement/message/school_notice) sem hub comum | conjunto | 🟢 |
| Alvo unifica em `core_notifications` + `core_announcements` + leitura auditável | bastão | 🟢 |

## Estado interno

- `read_at`/`confirmed_at` são estados do usuário; sem fila de envio nem retentativas no legado (envio é broadcast imediato). 🟢

---

## Riscos e lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Canal público | recebe por md5(user_id): fácil de enumerar em ambientes sem HTTPS; sem autenticação de subscrição | broadcastOn | 🟡 |
| Fan-out N+1 | loops de listeners + criações por usuário (sem bulk insert) | createByPermission | 🟡 |
| Sem retentativas | broadcast síncrono/queue única; nenhum mecanismo de retry/transbordo | conjunto | 🟡 |
| school_notices isolado | não integra centro de notificações nem barreira | grep | 🟡 |
| Aviso único vigente | comunicado novo sobrescreve exibição do anterior para o tipo | latest() | 🟡 |
| `announcement_users` cria linha só na confirmação? | leitura (`read_at`) pivot sem controller de leitura achado — talvez apenas `confirmed_at` em uso | migrations/controllers | 🔴 |
| Bastão omnichannel | push/email/whatsapp/retentativas são objetivos do alvo (inexistentes no legado) | bastão vs código | 🟢 |
