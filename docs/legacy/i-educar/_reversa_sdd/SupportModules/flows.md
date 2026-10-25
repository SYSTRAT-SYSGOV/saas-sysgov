# SupportModules (i-Educar legado) — Flows (capa transversal)

> Fluxos observados no código. Detalhamento por pilar nas units `ErrorTracking`, `Navigation` e `Notifications`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## F-01: Falha de exceção rastreada

**Ator:** aplicação (Handler global) 🟢 `app/Exceptions/Handler.php:41-54`

1. Exceção não listada em `dontReport` (`ValidationException`, `App_Model_Exception`, exceções de domínio de disciplinas).
2. Com `APP_TRACK_ERROR=1`, `reportable` monta contexto: request completa sem sanitização + controller + action.
3. `app(Tracker::class)` → Honeybadger (bind padrão) envia HTTP síncrono com context/component/action.
4. Falha do envio não é tratada; sem fila, sem registro local, sem retry. 🔴
5. Variante e-mail: `ErrorTrackerMail` com HTML do stack gerado por `FlattenException`/`ExceptionHandler` para o destinatário configurado; envio silenciosado em caso de falha. 🟢 `EmailTracker.php:17-35`

## F-02: Árvore de menus do usuário

**Ator:** front após login 🟢 `app/Menu.php:315-353`, `MenuCacheService.php`

1. Admin: todas as raízes (`tree()` ordenada por `order`). Usuário comum: consulta recursiva com filtro por pivô `menu_tipo_usuario` (`visualiza=1`), excluindo menus de processos `CONFIG`/`SETTINGS`.
2. Cache por usuário com tags `menus/{client}/{userKey}` e TTL 86400.
3. Tela principal renderiza ramais; nós com `link` são clicáveis; pastas com pelo menos um link em subsombras aparecem (`hasLink`).
4. Busca rápida: `findByUser` com `ilike` em title/description, limite 15. 🟢
5. Dados de processo (breadcrumb de permissões do usuário) com cache próprio de 7 dias. 🟢

## F-03: Notificação criada e distribuída

**Ator:** serviço de domínio 🟢 `NotificationService.php` + `HasNotificationUsers.php`

1. Modos de destinatário: por usuário; por permissão (processo → menu → tipos que visualizam → usuários ativos); por nível hierárquico (`nivel`).
2. Ou por query de domínio: escola do usuário OU nível institucional; admin recebe tudo; exige menu do processo para não-admin.
3. Grava em `public.notifications` (text/link/type).
4. URL de exportações (types 3/4) sai presignada via `NotificationUrlPresigner`.
5. `NotificationEvent` broadcast no canal `{tenant}-notification-{md5(user_id)}` com tags de tenant/tipo.

## F-04: Leitura de notificações

**Ator:** usuário 🟢 `NotificationController.php:14-72`

1. Listagem com filtros por tipo, status lida/não lida e texto, ordenada por created_at desc.
2. `markAsRead` em lote e `markAllRead` (update `read_at` para o usuário autenticado).
3. Painel: últimas N para o usuário logado com contagem de não lidas e links presignados.

## F-05: Barreira de comunicado

**Ator:** qualquer requisição GET HTML 🟢 `AnnouncementMiddleware.php` + `Kernel.php:73`

1. Vai no grupo `web`; escapa requisições JSON/PJAX.
2. Busca (cacheada por tipo de usuário) o último comunicado que atinge o tipo do usuário.
3. Com `show_confirmation` e sem `confirmed_at` no pivô: redirect para a tela do aviso com flash de erro.
4. Tela faz `sync` marcando `read_at`; botão de ciência faz `sync` com `confirmed_at` e volta para `/`.
5. Com `show_vacancy`, a tela lista vagas por escola/curso/série/turma (query de matrículas ativas vs capacidade).

## F-06: Publicação de comunicado

**Ator:** secretaria (Process::ANNOUNCEMENT) 🟢 `AnnouncementPublishController.php`

1. Criação/edição em transação: grava descrição sanitizada, sincroniza tipos de usuário e aplica delete/restore conforme flag `active`.
2. Soft deletes preservam histórico; listagem com `withTrashed`.

## F-07: Avisos escolares (school_notices)

**Ator:** escola (process 1027) 🟢 `SchoolNotice.php`, migração

1. Registro por instituição+escola com título, descrição, data, hora e local, com soft delete e timestamps.
2. Exibição independente do centro de notificações (sem integração de broadcast). 🟡

## F-08: Mensagens polimórficas de domínio

**Ator:** services de domínio 🟢 `Message.php`, `HasMessages.php`

1. `messages` ligada a qualquer `messageable` (ex.: registros de Busca Ativa) com autor e descrição.
2. Consulta pelo ramo de domínio via trait; sem integração com `public.notifications` ou broadcast.
