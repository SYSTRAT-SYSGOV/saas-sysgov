# ErrorTracking (i-Educar legado) — Contratos

> Superfícies observáveis. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Configuração (env)

| Chave | Default | Efeito | Confiança |
|-------|---------|--------|-----------|
| `APP_TRACK_ERROR` | `false` | liga o reporte via `app.trackerror` | 🟢 `config/app.php:227` |
| `HONEYBADGER_API_KEY` | vazio | api_key do canal SaaS | 🟢 |
| `HONEYBADGER_EVENTS_ENABLED` | `true` | eventos automáticos do pacote | 🟢 |
| `legacy.modules.error.email_recipient` | `''` | destinatário do canal e-mail | 🟢 🟡 |
| `legacy.modules.error.tracker_name` | `'EMAIL'` | **morto** — nada lê (bind fixo) | 🔴 |
| `legacy.modules.error.track` / `send_notification_email` / `notification_email` / `show_details` | — | chaves mortas de config | 🟡 |
| `QUEUE_CONNECTION` | `sync` | o mailable "ShouldQueue" roda sync no default | 🟢 |

---

## Interface PHP

```php
interface iEducar\Modules\ErrorTracking\Tracker {
    public function notify(Throwable $exception); // impl adiciona $data opcional
}
```
Resolve `app(Tracker::class)` → **sempre** `HoneyBadgerTracker` (bind em `AppServiceProvider:112`). 🟢

Payload passado por `notify($e, $data)`: 🟢
```jsonc
{
  "context":    "app('request')->all() cru (HTTP) || [] (console)",
  "controller": "class_basename(controller da rota) | request->path() se LegacyController",
  "action":     "parte após @, senão o controller"
}
```

## Contrato externo — HoneyBadger

| Campo | Valor | Confiança |
|-------|-------|-----------|
| api_key | `HONEYBADGER_API_KEY` | 🟢 |
| environment_name | `app.env` | 🟢 |
| version | `APP_VERSION` | 🟢 |
| hostname | `gethostname()` do servidor | 🟢 |
| client.timeout | `0` (sem limite configurado) | 🟡 |
| excluded_exceptions | App_Model_Exception, DisciplinesWithoutInformedHoursException, ValidationException | 🟢 |
| events.automatic | `HoneybadgerLaravel::DEFAULT_EVENTS` | 🟢 🟡 |

## Canal e-mail (código on, sem acionador)

| Campo | Valor |
|-------|-------|
| recipient | `config('legacy.modules.error.email_recipient')` (default vazio) 🟢 🟡 |
| subject | `[Erro inesperado] i-Educar - {app.name}` 🟢 |
| body | HTML de `FlattenException` via `ExceptionHandler` (Symfony Debug legado), view `errors.email` (`{!! content !!}`) 🟢 |
| entrega | `Mailable ShouldQueue` (sync na fila default) 🟢 🟡 |
| falha | `catch (Throwable) {}` — silenciada 🟢 |

## Regra de exclusão (dupla camada)

```php
Handler::$dontReport = [                       // camada A
    App_Model_Exception::class,
    DisciplinesWithoutInformedHoursException::class,
    ValidationException::class,
];
config('honeybadger.excluded_exceptions') == Handler::$dontReport;  // camada B idêntica
```
🟢 (redundância confirmada — provavelmente intencional). 🟡

---

## Integrações

| Integração | Direção | Confiança |
|---|---|---|
| HoneyBadger SaaS | saída HTTP | 🟢 |
| Mailer Laravel (SMTP) | saída (caminho morto) | 🔴 |
| Pacote honeybadger-laravel | captura automática de eventos | 🟡 |
| Fila/Horizon | **nenhuma** (não há job do tracker) | 🔴 |
