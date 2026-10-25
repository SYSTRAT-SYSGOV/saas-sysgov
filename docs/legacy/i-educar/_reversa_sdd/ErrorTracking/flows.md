# ErrorTracking (i-Educar legado) — Fluxos

> Cenários observáveis. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fluxo 1 — Erro HTTP rastreado (caminho padrão)

```
Requisição HTTP falha com Throwable não mapeada
  ↓ Handler::reportable
  app.trackerror? (APP_TRACK_ERROR)     🟢  default false → NÃO envia 🟢
  shouldReport? (exceto ValidationException, App_Model_Exception, DisciplinesWithoutInformedHoursException) 🟢
  ↓
  data.context = request->all() CRU       🟢 🔴 (sem sanitização)
  data.controller = class_basename(controller) ou request->path() para Legacy 🟢 :75-88
  data.action    = sufixo após @          🟢 :95-103
  ↓ app(Tracker)
  HoneyBadgerTracker::notify
    Honeybadger::new(config)             🟢 :14
    context('data', context) / setComponent / setAction 🟢 :15-25
    notify(exception) — HTTP sync ao SaaS 🟢 🟡 (timeout 0, sem fila)
```

## Fluxo 2 — Erro em console/job

```
Throwable em comando/queue
  reportable roda: APP_TRACK_ERROR=true
  getContext/getController/getAction = vazios/null (runningInConsole) 🟢 :63-101
  HoneyBadger notifica mesmo assim (só sem metadados) 🟡
```

## Fluxo 3 — Exceção excluída

```
ValidationException (ou App_Model_Exception / DisciplinesWithoutInformedHoursException)
  → shouldReport = false → nada notifica por Handler 🟢
  → honeybadger.excluded_exceptions idêntico (dupla barreira) 🟢 🟡
```

## Fluxo 4 — Caminho e-mail (inativo no snapshot)

```
(nada chama TrackerFactory — sem rota de entrada configurada) 🔴
SE fosse acionado:
  recipient = legacy.modules.error.email_recipient 🟢 (default vazio → mail para nada)
  HTML = Symfony Debug Handler + view errors.email 🟢
  Mailable ShouldQueue → QUEUE_CONNECTION=sync roda na hora 🟡
  Falha engolida por catch vazio 🟢
```

## Fluxo 5 — Captura automática do pacote (caminho paralelo)

```
honeybadger-laravel auto-detected + events.enabled=true (env default true) 🟢 🟡
  handlers.exception/error=true → o pacote pode reportar INDEPENDENTE de APP_TRACK_ERROR 🟡
  (comportamento real não verificado — vendor ausente no snapshot) 🟡
```

---

## Fluxos combinados com outros módulos

| Módulo | Uso | Referência |
|---|---|---|
| `Usuario` | nenhum dado de usuário é anexado (só request cru indiretamente) | 🟢 🔴 |
| `SupportModules` (capa) | sanitização LGPD, auditoria, cache — padrões que o alvo deve herdar aqui | 🔴 (referência) |
| Diário (DiarioClasse) | exceção de domínio específica na lista de exclusão (DisciplinesWithoutInformedHoursException) | 🟢 |
| Configuracao | flags env governam tudo | 🟢 |
