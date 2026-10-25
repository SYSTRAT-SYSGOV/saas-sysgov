# Notifications (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Notificações in-app (`public.notifications` + broadcast), comunicados institucionais com ciência compulsória (`announcements` + `announcement_user_types` + `announcement_users`), mensagens contextuais (`messages`, morfic) e comunicados escolares (`school_notices`).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.
> Sanitização LGPD, auditoria e barreira de comunicado: capa transversal na unit `SupportModules`.

---

## Recorte (evitar duplicação)

- A **unit `SupportModules`** (capa) cobre a auditoria/comunicado como conceito transversal; esta unit detalha as quatro famílias do legado.
- Listeners de transferência/busca ativa/exportação citados por referência (units `Enrollments`, `FileExport` no escopo de Reports).
- Alvo: tabelas `core_notifications`, `core_announcements`, `core_announcement_reads` (DDL no bastão `_reversa_sdd/SupportModules/legacy-mapping.md`, tabelas 92–94). 🟢

---

## Visão Geral

O legado tem **quatro subsistemas** independentes: (1) notificações 1:1 por usuário (`public.notifications`) com broadcast por evento; (2) avisos institucionais da Secretaria com barreira de ciência (`announcements`); (3) mensagens morfáveis embutidas em registros (`messages`); (4) comunicados escolares por escola/data (`school_notices`, telas legadas `educar_comunicados_escolares_*`). 🟢 DDLs 2020–2025

> ⚠️ O bastão chama `announcements` de "comunicados no login" — no código a barreira de ciência real vive no `AnnouncementMiddleware` (redirect para `/avisos` quando `show_confirmation` pendente) e o `repeat_on_login` reinicia a ciência a cada login. 🟢

---

## Responsabilidades

### Família 1 — Notificações (`NotificationService`)

- Criar notificação por usuário, por **permissão de processo** (`createByPermission`: descobre o menu do processo, pega tipos com `visualiza=1` na pivot, fan-out por usuários ativos) ou por **nível de usuário** (`createByUserLevel`). 🟢 `NotificationService.php:16-73`
- Broadcast em tempo real: `NotificationEvent implements ShouldBroadcast` no canal público `{tenant}-notification-{md5(user_id)}`; URL presignada para exportações (`needsPresignerUrl` para tipos 3/4). 🟢 `NotificationEvent.php`, `NotificationUrlPresigner.php`
- Centro de notificações: listar (`index`), por usuário logado, contador de não-lidas, marcar lida e marcar todas (`/notificacoes/*`). 🟢 `routes/web.php:136-140`
- Tipos fechados: 1 TRANSFER, 2 OTHER, 3 EXPORT_STUDENT, 4 EXPORT_TEACHER, 5 ACTIVE_LOOKING (2025-07 "Busca Ativa"). 🟢 `NotificationType.php`
- Consumidores: listeners de transferência/busca ativa/exportação, jobs (`CheckInstitutionConfigurationsJob`, concern `ShouldNotificate`), controllers de lote/promoção/atualização de data. 🟢 grep

### Família 2 — Comunicados institucionais (`Announcement`)

- Publicação por gestor com permissão `Process::ANNOUNCEMENT` (menu "Publicação de avisos"), público por tipos de usuário (`announcement_user_types`). 🟢 controllers + migration de menu
- Ciência compulsória: `show_confirmation` → middleware bloqueia navegação GET até `confirmed_at` em `announcement_users`; `repeat_on_login` reseta a ciência em cada login; `show_vacancy` sinaliza exibição de vagas na tela do aviso. 🟢 `AnnouncementMiddleware.php`, `LoginController.php:85+`
- Sanitização de conteúdo na gravação (allowlist de tags HTML no mutator `description`). 🟢 `Announcement.php:39-46`
- Cache da última sentença por tipo de usuário (TTL 7 dias, limpeza por `AnnouncementObserver` em saved/deleted/restored). 🟢 `CacheService.php:41-49`

### Família 3 — Mensagens (`Message`, `MessageService`)

- Mensagens morfáveis (`messageable_type`/`messageable_id`) por usuário com `softDeletes`; CRUD transacional com autorização do autor (editar/excluir só do próprio autor? ver gráfico); migração de "observações antigas" para `messages` (2025-07). 🟢 `MessageService.php`, migration

### Família 4 — Comunicados escolares (`SchoolNotice`)

- Avisos por instituição/escola com título, descrição, data, hora e local; telas legadas (listagem/detalhe/cadastro) com permissão `SchoolNotice::PROCESS`. 🟢 DDL + telas

---

## Regras de Negócio

| Regra | Evidência |
|---|---|
| Fan-out de notificação por permissão inclui só usuários `ativo = 1` dos tipos com `visualiza=1` no menu do processo | 🟢 `NotificationService.createByPermission` |
| Canal de broadcast composto `{$tenant}-notification-{md5(user_id)}` — público (Channel, não PrivateChannel) | 🟢 `NotificationEvent.broadcastOn` |
| BROADCAST_DRIVER default `null`: sem configuração de driver, o broadcast **não sai** (notificação só fica no banco) | 🟢 `config/broadcasting.php:18` |
| URL de exportação presignada só para tipos 3 e 4 | 🟢 `Notification.needsPresignerUrl` |
| Barreira: só intercepta requisições GET não-JSON não-PJAX | 🟢 `AnnouncementMiddleware.handle` |
| Confirmada a ciência (`confirmed_at`) o usuário navega; `repeat_on_login` zera a confirmação a cada login | 🟢 middleware + login |
| Rota de aviso/notificações cruza `withoutMiddleware(AnnouncementMiddleware)` (evita recursão da barreira) | 🟢 `routes/web.php:137,155,156` |
| `read_at` individual e marcação em lote | 🟢 rotas 139-140 |
| Aviso mais recente por tipo de usuário (`latest()->first()`) é o único em vigor por vez | 🟢 middleware/cache |

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| NT-01 | Notificação 1:1 com tipo, texto, link e leitura (individual/lote) + contador de não-lidas. | Must | 🟢 modelo + rotas |
| NT-02 | Fan-out por permissão de processo e por nível de usuário (apenas usuários ativos). | Must | 🟢 NotificationService |
| NT-03 | Broadcast em tempo real por canal composto durante os logins abertos; degrada a banco quando driver ausente. | Should | 🟢 |
| NT-04 | URL presignada para exportações (tipos 3/4). | Should | 🟢 presigner |
| NT-05 | Comunicados com público por tipo de usuário, HTML sanitizado, `repeat_on_login`, `show_vacancy`. | Must | 🟢 |
| NT-06 | Barreira de ciência compulsória com confirmar ciência e reset por login. | Must | 🟢 middleware + login |
| NT-07 | Cache de comunicados por tipo de usuário com invalidação em mutação. | Should | 🟢 CacheService + Observer |
| NT-08 | Mensagens contextuais morfáveis com autor e soft delete (migração das observações antigas). | Should | 🟢 |
| NT-09 | Comunicados escolares por escola/data/hora/local com telas legacy e permissão própria. | Should | 🟢 |
| NT-10 | Alvo: hub omnichannel (`core_notifications` com categoria/prioridade/canais) + `core_announcements` com ciência (94) — DDL no bastão. | Must (alvo) | 🟢 bastão |

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Segurança | canal de broadcast **público** (sem PrivateChannel/auth) — apenas md5(user_id) dificulta adivinhação | `NotificationEvent` | 🟡 |
| Performance | fan-out cria notificação + broadcast individual por usuário (N eventos, queries em loop) | `createByPermission` | 🟡 |
| Performance | índices em `user_id` e `read_at` para o centro de notificações | migration 2022 | 🟢 |
| Segurança | descrição do aviso sanitizada por allowlist na entrada (sem revalidação na leitura) | Mutator | 🟢 |
| Consistência | notificação e evento não compartilham transação (evento após o create; se o broadcast falha, a notificação permanece no banco) | NotificationService | 🟡 |

## Critérios de Aceitação

```gherkin
Dado processo de exportação com menu vinculado a 3 tipos de usuário (30 usuários ativos)
Quando notificar createByPermission
Então 30 registros em public.notifications + 30 broadcasts no canal por usuário 🟢

Dado driver de broadcast null
Quando notificar
Então registro criado; nenhum efeito em tempo real 🟢

Dado usuário com notificações não lidas
Quando consultar quantidade-nao-lidas
Então total correto por user_id 🟢

Dado aviso com show_confirmation e usuário sem confirmed_at
Quando acessar qualquer GET
Então redireciona para /avisos com mensagem "Confirme a ciência do aviso antes de prosseguir!" 🟢

Dado aviso com repeat_on_login
Quando usuário re-logar depois de confirmado
Então confirmação reiniciada e barreira volta a atuar 🟢

Dado descrição com tag <script>
Quando publicar aviso
Então tag removida pelo allowlist 🟢

Dado Message de outro autor
Quando usuário tentar editar
Então AuthorizationException "Você não tem permissão para editar esta mensagem" 🟢
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Notificações in-app + leitura | Must | núcleo operacional 🟢 |
| Comunicados + ciência compulsória | Must | conformidade institucional 🟢 |
| Broadcast tempo real | Should | depende de driver externo 🟢 |
| Mensagens morfáveis | Should | migração interna 2025 🟢 |
| Comunicados escolares | Should | legado com telas próprias 🟢 |
| Omnichannel (push/email/whatsapp) | Must (alvo) | DDL/serviços no bastão 🟢 |

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `app/Models/Notification.php`, `NotificationType.php` | entidade + tipos fechados | 🟢 |
| `app/Services/NotificationService.php`, `NotificationUrlPresigner.php` | criação/fan-out/presign | 🟢 |
| `app/Events/NotificationEvent.php` | broadcast por canal composto | 🟢 |
| `app/Http/Controllers/NotificationController.php` | centro de notificações | 🟢 |
| `app/Models/Announcement.php`, `AnnouncementTipoUsuario`, `AnnouncementUser` | comunicados | 🟢 |
| `app/Http/Middleware/AnnouncementMiddleware.php` | barreira de ciência | 🟢 |
| `app/Http/Controllers/AnnouncementPublishController.php`, `AnnouncementUserController.php` | publicação/ciência | 🟢 |
| `app/Services/CacheService.php` (announcements) | cache 7d por tipo | 🟢 |
| `app/Observers/AnnouncementObserver.php` | invalidação | 🟢 |
| `app/Models/Message.php`, `app/Services/MessageService.php` | mensagens morfáveis | 🟢 |
| `app/Models/SchoolNotice.php` + `ieducar/intranet/educar_comunicados_escolares_*.php` | comunicados escolares | 🟢 |
| `database/migrations/*(notifications|announcements|messages|school_notices)*` | DDL | 🟢 |
| `_reversa_sdd/SupportModules/legacy-mapping.md` (tabelas 92–94) | DDL alvo | 🟢 |
