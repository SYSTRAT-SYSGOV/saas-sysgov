# ErrorTracking (i-Educar legado) — Design

> Estrutura, fluxos, dependências e riscos do rastreamento de erros.
> Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Componentes

| Componente | Papel | Fonte |
|----------|-------|-------|
| `Handler (App\Exceptions\Handler)` | Único gatilho: `reportable(closure)` no `EventHandler::register` do Laravel | 🟢 `Handler.php:41-54` |
| `Tracker (interface)` | Contrato único `notify(Throwable)`; implementações adicionam o 2º parâmetro opcional `$data` | 🟢 `Tracker.php` |
| `HoneyBadgerTracker` | Canal por SaaS HoneyBadger via `Honeybadger::new(config('honeybadger'))` | 🟢 `HoneyBadgerTracker.php:13-27` |
| `EmailTracker` | Canal e-mail com `FlattenException` HTML + `Mailable ShouldQueue`, silencia falhas | 🟢 `EmailTracker.php:14-45` |
| `TrackerFactory` | Fábrica nomeada (HONEY_BADGER/EMAIL) — sem consumidor no snapshot | 🔴 `TrackerFactory.php:13-25` |
| `ErrorTrackerMail` | Mailable com view `errors.email` (`{!! content !!}`) | 🟢 |
| Flags de config | `app.trackerror` (env), `honeybadger.*`, `legacy.modules.error.*` | 🟢 🟡 |

### Tabelas

Nenhuma. O módulo não persiste nada — sem fila, sem histórico local de erros. 🟢 🟡

### Notificação (contrato externo)

| Campo | Origem | Nota |
|-------|--------|------|
| exception | objeto `Throwable` capturado pelo Handler | 🟢 |
| `context` → campo "data" | `request()->all()` cru (HTTP) ou vazio (console) | 🟢 🔴 LGPD |
| component | `class_basename(controller)`; `LegacyController` → request path | 🟢 |
| action | parte depois de `@` do controller da rota | 🟢 |
| versão/app | `APP_VERSION` + hostname | 🟢 |

---

## Fluxo Principal

```
Laravel catches Throwable
  → reportable closure:
    APP_TRACK_ERROR=true? (env)              🟢 config/app.php:227
    shouldReport? (dontReport list)          🟢 Handler.php:20-24
    APP_TRACK_ERROR ATIVA:
      data = [context, controller, action]   🟢 :45-49
      app(Tracker::class) = HoneyBadgerTracker (bind fixo) 🟢 Provider:112
      HoneyBadgerTracker:
        Honeybadger::new(config) por notificação 🟢
        context('data', ...), setComponent(...), setAction(...)
        notify(exception) — HTTP síncrono     🟢 🟡
```

## Fluxos Alternativos

- **Console:** notifica sem contexto (campos nulos/vazios). 🟢 🟡
- **Exceções excluídas:** `App_Model_Exception`, `DisciplinesWithoutInformedHoursException`, `ValidationException` (Handler `dontReport` + `honeybadger.excluded_exceptions`). 🟢
- **Canal EMAIL (não acionado):** recipient via `legacy.modules.error.email_recipient` (default vazio), HTML renderizado por Symfony Debug `ExceptionHandler` (classe obsoleta), mailable `ShouldQueue` (exec sync com `QUEUE_CONNECTION=sync`), catch engole qualquer falha. 🔴 🟢
- **Eventos automáticos do pacote:** `honeybadger-laravel` pode capturar eventos/exceções por conta própria (`events.enabled` default true, `handlers.exception/error` true) — caminho independente da flag `APP_TRACK_ERROR`. 🟡

---

## Dependências

| Dependência | Uso | Fonte |
|-------------|-----|-------|
| Laravel exceptions pipeline | `reportable` + `dontReport` | 🟢 |
| `honeybadger-io/honeybadger-laravel` ^5.0 | cliente + integração automática | 🟢 `composer.json` |
| `legacy.modules.error.email_recipient` | destinatário do canal e-mail | 🟢 🟡 |
| `MAIL_*` (fila SMTP) | envio real do canal e-mail | 🟡 |
| Suporte transversal (`SupportModules`) | sanitização LGPD e auditoria (capa) | 🔴 (referência) |

---

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Bind de container fixo em vez de resolver via config (factory morta) | Provider `:112` | 🔴 |
| Contexto = request inteiro sem filtro (simplicidade original da implementação) | `getContext()` | 🟢 🔴 |
| Reconstrução de cliente HoneyBadger a cada notificação (sem singleton) | HoneyBadgerTracker | 🟢 |
| Dependência de classe obsoleta do Symfony para o HTML de erro do canal e-mail | EmailTracker | 🟡 |
| Silêncio total em falhas do canal e-mail (catch vazio) | EmailTracker | 🟢 |
| Módulo isolado em `src/Modules` (iEducar namespace) | todos | 🟢 |

---

## Estado interno

- Nenhum estado, nada persistido, sem memória de erros duplicados (rate-limit fica por conta do SaaS). 🟢

---

## Observabilidade

- O módulo existe para observabilidade, mas não registra nada que seja observável; o e-mail é a única alternativa interna (sem acionamento). Recomendação do alvo: fila, retransmissões e log de falha do tracker. 🟡

---

## Riscos e lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Vazamento de dados pessoais | request cru vai ao SaaS (CPF/nome/alunos) sem lista de exclusão; `dontFlash` não se aplica | Handler | 🔴 |
| Dois caminhos de captura | eventos automáticos do pacote podem ligar telemetria sem toggle oficial | config | 🟡 |
| Bloqueio da main request | HTTP sync e timeout não configurado no envio | honeybadger client | 🟡 |
| Canal e-mail inacessível | factory sem chamador; config `tracker_name` morta | busca sem resultados | 🔴 |
| Fragilidade de rota sem controller | `getActionName` assume `route()->getAction()['controller']` — em rota closure pode estourar dentro do Handler | `Handler.php:111-117` | 🟡 |
| Sem resolução de timezone/tenant no contexto | nenhum ID de tenant/escola — diagnóstico de multir-tenancy difícil | — | 🔴 🟡 |
