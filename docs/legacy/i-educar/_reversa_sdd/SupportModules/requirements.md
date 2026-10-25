# SupportModules (i-Educar legado) — Capa transversal

> Unit do plano de extração do Reversa (`granularity = module`). Recorte acordado com o Desenvolvedor: **capa transversal** que documenta os padrões comuns dos módulos de suporte (`ErrorTracking`, `Navigation`, `Notifications` + comunicados). Os detalhes de cada pilar ficam nas units próprias (`ErrorTracking`, `Navigation`, `Notifications`), que citam esta capa.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

No legado, os módulos de suporte surgiram de forma aditiva, sem uma camada comum de plataforma. Esta capa consolida os três sistemas transversais e as decisões comuns:

1. **ErrorTracking**: rastreamento de exceções por fábrica de `Tracker` (`HoneyBadgerTracker` por padrão, `EmailTracker` alternativo), ativado por flag `app.trackerror` e executado de forma **síncrona** no `Handler`. 🟢 `app/Exceptions/Handler.php:41-54`, `app/Providers/AppServiceProvider.php:112`, `src/Modules/ErrorTracking/TrackerFactory.php`

2. **Navigation**: árvore de menus em lista de adjacência (`public.menus`, modelo `App\Menu` com `HasRecursiveRelationships`) **acoplada ao controle de permissão** através do pivô `pmieducar.menu_tipo_usuario`; cache com tags por usuário/cliente e TTL por tipo de dado. 🟢 `app/Menu.php:30-353`, `database/migrations/table/2020_01_01_110000_create_menus_table.php`

3. **Notifications**: notificações in-app em `public.notifications` com broadcast WebSocket para canal composto `{tenant}-notification-{md5(user_id)}`, stack de comunicados institucionais (`announcements`) com **bloqueio de navegação** até confirmação de ciência, e avisos escolares (`school_notices`). 🟢 `app/Events/NotificationEvent.php:44-48`, `app/Http/Middleware/AnnouncementMiddleware.php:11-44`, `app/Http/Kernel.php:73`

> ⚠️ Escopo: detalhes finos (enumerações completas, telas, de/para coluna a coluna) ficam nas units `ErrorTracking`, `Navigation` e `Notifications`. Esta capa registra o contrato compartilhado, os riscos transversais e as decisões de migração que valem para os três.

---

## Responsabilidades

- centralizar o ponto de entrada de erros: `Handler::reportable` chama `app(Tracker::class)` quando `config('app.trackerror')` e a exceção deve ser reportada (`dontReport` exclui `ValidationException`, `App_Model_Exception` e exceções de domínio conhecidas). 🟢 `Handler.php:20-24`, `:43-53`
- escolher o tracker por configuração: `TrackerFactory` entrega `HoneyBadgerTracker` (`HONEY_BADGER`) ou `EmailTracker` (`EMAIL`); o bind do container fixa Honeybadger como padrão. 🟢 `TrackerFactory.php:10-19`, `AppServiceProvider.php:112`
- expor a árvore de menus por usuário com filtro por tipo de usuário, excluindo os processos `CONFIG`/`SETTINGS` de quem não é admin; admin recebe todas as raízes. 🟢 `Menu.php:51-70`, `:315-322`
- cachear a árvore (tags `menus`, cliente, chave do usuário; TTL de 86400) e os dados de processo (TTL de 604800). 🟢 `app/Services/MenuCacheService.php:16-17`, `:34-52`
- montar breadcrumb manualmente em cada controller (`Breadcrumb::current`/`push` + `menu(Process)` do controller base). 🟢 `src/Support/Navigation/Breadcrumb.php:24-56`, `app/Http/Controllers/Controller.php:60`
- criar e distribuir notificações por usuário, por permissão (processo) ou por nível hierárquico, sempre com evento de broadcast com URL presignada quando aplicável. 🟢 `app/Services/NotificationService.php:13-61`
- bloquear a navegação enquanto o usuário não confirma ciência de um comunicado com `show_confirmation`, apenas em requisições GET não-JSON e não-PJAX. 🟢 `AnnouncementMiddleware.php:14-33`, `app/Http/Kernel.php:73`
- Prover expiração de notificações antigas via comando agendado. 🟢 `app/Console/Commands/NotificationsDelete.php`

---

## Regras de Negócio

### Padrão comum de flags de ativação
- Todo subsistema de suporte liga/desliga por env: `APP_TRACK_ERROR` (erros), `BROADCAST_DRIVER` (broadcast, default `null`), flags de cache. Não existe um "modo plataforma" único. 🟢 `config/app.php:227`, `config/broadcasting.php`

### Rastreamento de erros
- O contexto enviado ao tracker é **a request inteira sem sanitização** (`app('request')->all()`); `dontFlash` só protege o flash de validação, não o tracker. 🟢 `Handler.php:61-68`, `:31-34`
- O canal e-mail gera HTML cru do stack via `FlattenException` + `ExceptionHandler` e envia para `legacy.modules.error.email_recipient`; falha de envio é silenciada. 🟢 `src/Modules/ErrorTracking/EmailTracker.php:17-35`
- Honeybadger recebe contexto e controller/action; sem `trace_id`, sem agregação local, sem fila. 🟢 `HoneyBadgerTracker.php:9-27`
- O mesmo tracker é usado fora do Handler (ex.: falha de render de relatório, unit `Reports`). 🟢 `ieducar/lib/Portabilis/Controller/ReportCoreController.php:145-162`

### Acoplamento menu x permissão
- `userTypes()` liga `public.menus` a `pmieducar.menu_tipo_usuario` com `visualiza = 1`; a mesma relação decide quem **vê** o menu e, via `NotificationService::createByPermission`, quem **recebe** notificação de um processo. 🟢 `Menu.php:296-307`, `NotificationService.php:13-33`
- `HasNotificationUsers::getUsers` repete a regra em SQL fácil: admin vê tudo; usuário ligado à escola ou nível institucional recebe mensagens de processo cujo menu ele visualiza. 🟢 `app/Traits/HasNotificationUsers.php:20-52`

### Comunicados com ciência
- Último comunicado visível ao tipo de usuário decide o bloqueio; `confirmed_at` no pivô `announcement_users` libera a navegação; `read_at` marca exibição. 🟢 `AnnouncementMiddleware.php:28-33`, `:38-44`, `app/Http/Controllers/AnnouncementUserController.php:24-32`
- A descrição do comunicado passa por lista de permissões de tags (`strip_tags`) antes de gravar. 🟢 `app/Models/Announcement.php:46-49`

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| SC-01 | O sistema deve registrar falhas de exceção de forma centralizada, com ativação por flag e tracker trocável. | Must | Dado exceção com tracker ativo, então Honeybadger recebe contexto. 🟢 |
| SC-02 | O sistema deve sanitizar payload de request antes de qualquer export de erro (LGPD). | Must | 🟢 Legado não sanitiza — requisito novo do bastão. 🔴 |
| SC-03 | O sistema deve correlacionar erros por `trace_id` distribuído. | Must | 🔴 Novo (bastão `:65`). |
| SC-04 | O sistema deve persistir incidentes em tabela local (`core_system_errors`) com resolução auditável. | Must | 🔴 Novo (bastão `:60-88`); legado só envia para fora. |
| SC-05 | O sistema deve separar autorização (RBAC) de navegação (menu), com nós que declaram permissão exigida. | Must | 🔴 Arquitetura nova (bastão `:33-39`); legado casa menu = permissão. |
| SC-06 | O sistema deve cachear a árvore de navegação por usuário e validar as caches em alteração de perfil/menu. | Should | 🟢 `MenuCacheService` (tags + TTL); invalidação manual no alvo. |
| SC-07 | O sistema deve oferecer busca rápida de telas com atalho de teclado (Command Palette). | Should | 🟢 Legado tem busca simples `findByUser` (limite 15); Command Palette é net-new. |
| SC-08 | O sistema deve permitir favoritos de navegação por usuário. | Should | 🔴 Inexistente no legado (bastão `:39`). |
| SC-09 | O sistema deve entregar notificações in-app com leitura auditada (`read_at`) e contagem de não lidas. | Must | 🟢 `NotificationController.php:53-72`. |
| SC-10 | O sistema deve suportar multi-canal (push, e-mail, WhatsApp) com fila de retentativa, sem bloquear in-app. | Must | 🔴 Novo (bastão `:27-28`); legado só WebSocket + in-app. |
| SC-11 | O sistema deve bloquear navegação até confirmação de ciência de comunicados obrigatórios, com trilha de aceite. | Must | 🟢 Paridade: middleware + `confirmed_at` + trilha completa com IP/UA no alvo. |
| SC-12 | O sistema deve canalizar avisos escolares (agenda de aviso por escola/instituição). | Should | 🟢 `school_notices` (process 1027) com data/hora/local. |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Segurança/LGPD | Contexto de erro com payload cru (CPF, nome, senha possíveis) vai para APM externa sem máscara. | `Handler.php:61-68` | 🔴 |
| Desempenho | Envio síncrono de erro pode travar a requisição em timeout de rede (sem fila). | `Handler.php:43-53` | 🟡 |
| Cache | Menu por usuário: tags `menus/{client}/{userKey}`, TTL 86400; por processo: TTL 604800. | `MenuCacheService.php:16-17` | 🟢 |
| Disponibilidade | Broadcast com driver default `null` (nada sai sem Pusher configurado); falha silenciosa. | `config/broadcasting.php` | 🟡 |
| Auditoria | Comunicados: `read_at`/`confirmed_at` no pivô, sem IP/UA; `announcements` com SoftDeletes. | migração `announcements` | 🟢 |
| Manutenibilidade | Duas classes `Breadcrumb` (em `iEducar\Support\Navigation`) e migrações de menu incrementais com de/para `old`/`parent_old`. | `src/Support/Navigation/Breadcrumb.php`, migrações de menu | 🟢 |

---

## Critérios de Aceitação

```gherkin
Dado exceção não excluída e APP_TRACK_ERROR=1
Quando o Handler reporta
Então Honeybadger recebe contexto, controller e action síncronos 🟢

Dado usuário sem permissão de menu no processo
Quando NotificationService cria por permissão
Então o usuário não recebe notificação 🟢

Dado comunicado com show_confirmation não confirmado
Quando o usuário navega em GET HTML
Então é bloqueado na tela do aviso até confirmar 🟢

Dado usuário administrador
Quando recebe a árvore de menus
Então recebe todas as raízes, sem filtro de tipo 🟢

Dado APM externo indisponível
Quando uma exceção é reportada
Então o legado não agrega erro local e a requisição segue falha 🔴 (alvo: gravar core_system_errors)
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Sanitização + tabela local de erros + trace_id | Must | Basis de observabilidade do alvo 🔴 |
| Separação menu x RBAC | Must | Desacoplamento arquitetural do bastão 🔴 |
| Notificação multi-canal com fila | Must | Omnicianalidade prometida 🔴 |
| Bloqueio de comunicado com ciência auditada | Must | Paridade + trilha completa 🟢/🔴 |
| Cache de menu e favoritos | Should | Usabilidade 🟢/🔴 |
| Command Palette | Should | Usabilidade nova 🔴 |

---

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `src/Modules/ErrorTracking/*` | Fábrica e trackers (Honeybadger/e-mail) | 🟢 (unit `ErrorTracking`) |
| `app/Exceptions/Handler.php` | Hook central de report | 🟢 |
| `app/Providers/AppServiceProvider.php:112` | Bind do tracker | 🟢 |
| `app/Menu.php` | Árvore de menus + pivô com permissão | 🟢 (unit `Navigation`) |
| `app/Services/MenuCacheService.php` | Cache por usuário/processo | 🟢 |
| `src/Support/Navigation/Breadcrumb.php` | Breadcrumb manual | 🟢 |
| `app/Services/NotificationService.php` | 3 modos de criação de notificação | 🟢 (unit `Notifications`) |
| `app/Events/NotificationEvent.php` | Broadcast por canal composto | 🟢 |
| `app/Http/Middleware/AnnouncementMiddleware.php` + `Kernel.php:73` | Bloqueio de comunicado | 🟢 |
| `app/Models/Announcement.php` + migração `announcements` | Comunicados e ciência | 🟢 |
| `app/Models/SchoolNotice.php` + migração `school_notices` | Avisos escolares | 🟢 (process 1027) |
| `app/Models/Message.php` | Mensagens polimórficas (Busca Ativa e outras) | 🟢 |
| `database/migrations/table/2020_01_01_110000_create_notifications_table.php` | Tabela `public.notifications` | 🟢 |
