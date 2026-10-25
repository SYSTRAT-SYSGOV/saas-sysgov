# ErrorTracking (i-Educar legado)

> Unit do plano de extração (`granularity = module`). Subsistema de notificação de erros: captura por exceções do Laravel, ponte HoneyBadger e (caminho morto) e-mail.
> Acompanha a capa transversal em `_reversa_sdd/SupportModules/` (unidade deles cobre sanitização LGPD, auditoria, cache, barreira de comunicado); aqui só o detalhamento do rastreamento de erros. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O rastreamento de erros é um mini-módulo isolado (`iEducar\Modules\ErrorTracking`) com um integrador único: o `App\Exceptions\Handler` (reportable do Laravel). Quando `app.trackerror` (env `APP_TRACK_ERROR`, default `false`) e a exceção não está na lista de não-notificáveis, o Handler consulta `app(Tracker::class)->notify($e, $data)`; como o container faz bind fixo de `Tracker → HoneyBadgerTracker`, o caminho real em produção é somente HoneyBadger (SaaS). 🟢 `app/Exceptions/Handler.php:41-54`, `app/Providers/AppServiceProvider.php:112`

Existe um segundo caminho capturado pelo próprio pacote `honeybadger-io/honeybadger-laravel` (eventos automáticos, exceções chamadas dentro do config próprio), potencialmente ativo mesmo com `APP_TRACK_ERROR=false` quando `HONEYBADGER_EVENTS_ENABLED` está true (default). 🟡 `config/honeybadger.php:8-14`

> ⚠️ Contra o bastão: o bastão trata a `TrackerFactory` (`HONEY_BADGER`/`EMAIL`) como canal funcional. No código, a factory **não é chamada por ninguém** — o bind fixo no provider torna `tracker_name` e os demais flags de `legacy.modules.error` (exceto `email_recipient`) chaves mortas de configuração. 🔴

---

## Responsabilidades

- Detectar erro não tratado em requisição HTTP (rota Laravel ou tela legada via `LegacyController`) e notificar um serviço externo. 🟢
- Montar contexto: `context` (payload do request — em console vazio e vazio), `controller` (com fallback p/ caminho em `LegacyController`) e `action`. 🟢 `Handler.php:61-117`
- Aplicar filtro de exceções excluídas (dois cenários — `dontReport` na Handler e `excluded_exceptions` no honeybadger com rejihogar idêntico). 🟢 🟡
- Enviar por HoneyBadger (`HONEYBADGER_API_KEY`) com versão do app (`APP_VERSION`) e hostname do servidor. 🟢
- Canal alternativo: envio de e-mail com HTML de erro completo (FlattenException) ao destinatário configurado (`legacy.modules.error.email_recipient`) — hoje sem chamador. 🔴 🟢 🟡

---

## Regras de Negócio

### Disparo/exclusão da notificação
- `reportable` roda dentro do reportador nativo do Laravel. Não é notificado quando:
  - `APP_TRACK_ERROR=false` (default); 🟢 `config/app.php:227`
  - exceção em `dontReport`: `App_Model_Exception`, `DisciplinesWithoutInformedHoursException`, `ValidationException`; 🟢 `Handler.php:20-24`
  - idem `excluded_exceptions` em `config/honeybadger.php`; 🟢
  - execução via console → contexto/controller/action nulos (o evento ainda é notificado — apenas sem metadados). 🟡
- Montagem do contexto: `app('request')->all()` **bruto** (não filtra campos sensíveis — `dontFlash` só é aplicado ao flash de validação, não ao contexto do tracker). 🟢 `Handler.php:61-68`
- Nome do `controller`: `explode('@', class_basename(route action))[0]`; se for a classe base `LegacyController`, usa `request->path()`. 🟢 `:75-88`

### Canal HTTP (HoneyBadger)
- Instância `Honeybadger::new(config('honeybadger'))` a CADA notificação (sem singleton). 🟢 `HoneyBadgerTracker.php:14`
- `context('data', $data['context'])` quando contexto existe; `setComponent(controller)`; `setAction(action)`. 🟢
- Timeout do cliente = 0 (timeout não configurado) → o envio pode bloquear a requisição do usuário. 🟡
- Falha do envio: não há try/catch no HoneyBadgerTracker — um problema de rede pode interromper o reporte (tratamento fica por conta do reportador nativo). 🟡

### Canal e-mail (implementado, não acionado)
- `EmailTracker`: renderiza HTML completo do erro (Symfony Debug `ExceptionHandler` — classe legada/deprecated), subject `[Erro inesperado] i-Educar - {app.name}`, destinatário `legacy.modules.error.email_recipient` (default ''), mailable marcado `ShouldQueue`; silencia falhas com `catch (Throwable) {}`. 🟢 `EmailTracker.php:14-45`
- Como nada chama a `TrackerFactory`, este canal é inacessível via config no snapshot 🟡; e com `QUEUE_CONNECTION=sync` um mailable "com fila" executaria de forma síncrona no default. 🟡

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| ET-01 | Notificação de exceção não tratada ao serviço externo quando o rastreamento estiver ativo. | Must | 🟢 Handler `reportable` + bind. |
| ET-02 | Checkbox/env única (`APP_TRACK_ERROR`) para ligar/desligar rastreamento. | Must | 🟢 `config/app.php:227`. |
| ET-03 | Contexto contendo quartier/table é o request do usuário, controller e action. | Should | 🟢 🔴 (ver ET-09). |
| ET-04 | Lista de exceções excluídas (validações, exceções de domínio) com exclusão em duas camadas. | Should | 🟢 (redundância confirmada) 🟡 |
| ET-05 | Canal HoneyBadger com contexto, componente e action + API key por env. | Must | 🟢 |
| ET-06 | Canal e-mail com HTML do erro e tópico padronizado. | Could | 🔴 sem acionador. 🟢 (código) |
| ET-07 | Seletor de canal por config (`HONEY_BADGER`/`EMAIL`). | Should | 🔴 factory sem chamador. |
| ET-08 | Eventos automáticos do pacote Laravel (telemetria opcional). | Could | 🟡 haven't testado. |
| ET-09 | Sanitização de payload capturado. | Must (alvo) | 🔴 ausente (capa `SupportModules`). |
| ET-10 | De/associção assíncrona e tolerância a falha de rede na notificação. | Must (alvo) | 🟡 (sync + sem try/catch). |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| LGPD/privacidade | `context = request->all()` cru — pode expor CPF e dados de aluno; sem lista de exclusão. | `Handler.php:61-68`; `dontFlash` :31-34 | 🔴 |
| Disponibilidade | Envio por HTTP na main request (timeout 0); nenhuma fila; sem retransmissões. | honeybadger client config | 🟡 |
| Estensibilidade | Interface `Tracker` única com factory, mas container predeterminante; construção de HoneyBadger por envio. | `Tracker.php`, factory | 🟡 |
| Observabilidade | Nenhum log próprio do tracker (erro de envio étery engolido no canal e-mail; no HB depende do pacote). | EmailTracker catch | 🟡 |
| Config legada | `legacy.modules.error.*` (tracker_name/track/show_details/...) sem leitura — armadilha de config. | config + grep | 🟡 |

---

## Critérios de Aceitação

```gherkin
Dado APP_TRACK_ERROR=false
Quando ocorre qualquer erro
Então nada é enviado ao tracker 🟢

Dado APP_TRACK_ERROR=true e doctrine ValidationException
Quando erro de validação ocorre
Então não é notificado (duas camadas de exclusão) 🟢

Dado APP_TRACK_ERROR=true e erro em rota HTTP com request POST
Quando notificar via HoneyBadger
Então HB recebe contexto = request cru + componente = controller + action 🟢 (sem sanitização)

Dado erro em job/console
Quando notificado
Então contexto/controller/action nulos mas notificado 🟢 🟡

Dado APP_TRACK_ERROR=false
Quando o pacote HB captura eventos automáticos (EVENTS_ENABLED=true)
Então pode mesmo assim haver telemetria externa 🟡
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Toggle central + exclusões | Must | custo de ruído e controle 🟢 |
| HoneyBadger por evento manual | Should | manter ponte 🟢 |
| Sanitização do contexto | Must | LGPD (hoje zero) 🔴 |
| Assincronia e fila | Must | UX/neutralidade do usuário 🔴 🟡 |
| Canal e-mail | Could | alternativa offline 🔴 (sem acionador) |

---

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `app/Exceptions/Handler.php` | Gatilho + montagem de contexto | 🟢 |
| `app/Providers/AppServiceProvider.php:112` | Bind fixo `Tracker → HoneyBadgerTracker` | 🟢 |
| `src/Modules/ErrorTracking/Tracker.php` | Interface (`notify(Throwable)`) | 🟢 |
| `src/Modules/ErrorTracking/TrackerFactory.php` | Fábrica por `tracker_name` (sem chamador) | 🔴 |
| `src/Modules/ErrorTracking/HoneyBadgerTracker.php` | Canal SaaS | 🟢 |
| `src/Modules/ErrorTracking/EmailTracker.php` | Canal e-mail (sem acionamento) | 🔴 |
| `app/Mail/ErrorTrackerMail.php` + `resources/views/errors/email.blade.php` | Mailable ShouldQueue + view raw | 🟢 |
| `config/app.php:227` | `app.trackerror` (`APP_TRACK_ERROR`, default false) | 🟢 |
| `config/honeybadger.php` | api_key, eventes, exclusões, client timeout 0 | 🟢 |
| `config/legacy.php` (modules.error) | Chaves mortas + `email_recipient` | 🟡 |
