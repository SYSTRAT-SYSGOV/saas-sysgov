# 🧭 Fluxos de Arquitetura: Módulos de Suporte (ErrorTracking, Navigation, Notifications)

> **Módulos:** `ErrorTracking`, `Navigation`, `Notifications`  
> **Status:** Especificado e Aprovado para SYSGOV (`SYS-Educa`)  
> **Data:** 2026-10-12  

---

## 1. Fluxo de Captura, Sanitização e Rastreamento de Erros (ErrorTracking & APM)

```mermaid
sequenceDiagram
    autonumber
    actor User as Operador / Usuário
    participant Client as Frontend (@sysgov/ui)
    participant Gateway as API Gateway (Laravel 13)
    participant Sanitizer as Exception Sanitizer (LGPD)
    participant DB as MySQL (core_system_errors)
    participant Redis as Redis Queue
    participant Sentry as APM / Sentry / OpenTelemetry
    participant Webhook as Alert Webhook (Discord/Slack/Teams)

    User->>Client: Dispara ação na interface (ex: exportar censo / lançar notas)
    Client->>Gateway: POST /api/v1/educa/grades (JWT + X-Tenant-ID + X-Trace-ID)
    Note over Gateway: Erro Crítico / Exception não tratada (ex: Deadlock, NullPointer)
    Gateway->>Sanitizer: Intercepta Exception (TraceID, TenantID, UserID, Payload)
    Note over Sanitizer: Mascara senhas, CPFs, cartões e dados pessoais sensíveis
    Sanitizer->>DB: Persiste em core_system_errors (fingerprint, trace, context)
    Sanitizer->>Sentry: Envia evento OpenTelemetry / Sentry com tags do tenant
    Sanitizer->>Redis: Enfileira job DispatchSystemAlertJob
    Gateway-->>Client: Resposta 500 padronizada: { error_code: "ERR-5421", trace_id: "..." }
    Client-->>User: Exibe Toast/Dialog amigável com Protocolo de Erro para suporte

    Note over Redis,Webhook: Processamento Assíncrono do Alerta
    Redis->>Webhook: Dispara payload HTTP com limite de taxa (Circuit Breaker)
    Webhook-->>Team: Engenharia recebe notificação com link direto para o Sentry
```

---

## 2. Fluxo de Resolução Hierárquica e Cache de Menus (Navigation & Command Palette)

```mermaid
graph TD
    subgraph Client ["Frontend (@sysgov/ui)"]
        UI_REQ["User Logado / Troca de Escola"]
        STORE["Zustand Menu Store"]
        SIDEBAR["Sidebar Navigation"]
        CMD["Command Palette (Ctrl + K)"]
        BREADCRUMB["Smart Breadcrumbs Generator"]
    end

    subgraph Backend ["API Gateway SYSGOV"]
        EP["GET /api/v1/navigation/tree?school_id={uuid}"]
        CACHE_CHECK{"Cache Hit no Redis?"}
        REDIS[("Redis: nav:tree:{tenant}:{role}:{school}")]
        RESOLVER["NavigationHierarchyResolver"]
        DB_NAV[("MySQL: core_navigation_nodes")]
        DB_PERM[("MySQL: core_role_permissions")]
    end

    UI_REQ --> EP
    EP --> CACHE_CHECK
    CACHE_CHECK -- "Sim (99% dos hits)" --> REDIS
    REDIS --> STORE
    CACHE_CHECK -- "Não (Miss ou Invalidação)" --> RESOLVER
    RESOLVER --> DB_NAV
    RESOLVER --> DB_PERM
    RESOLVER --> REDIS
    RESOLVER --> STORE

    STORE --> SIDEBAR
    STORE --> CMD
    STORE --> BREADCRUMB
```

---

## 3. Fluxo de Notificações Omnichannel e Avisos Obrigatórios (Notifications & Announcements)

```mermaid
flowchart TD
    EVENT["Disparo de Evento de Domínio<br/>(ex: Transferência Solicitada / Alerta de Busca Ativa / Conclusão de Censo)"] --> NS["NotificationDispatcherService"]
    
    subgraph Routing ["Roteamento e Filtro de Destinatários"]
        NS --> TARGET{"Tipo de Alvo?"}
        TARGET -- "Usuário Individual" --> U1["Identifica core_users (UUID)"]
        TARGET -- "Papel Específico" --> R1["Consulta core_roles + educa_user_school_scopes"]
        TARGET -- "Comunicado Institucional" --> A1["core_announcements (Vigência + Obrigatoriedade)"]
    end

    subgraph Persistence ["Persistência de Notificações"]
        U1 & R1 --> DB_NOTIF[("MySQL: core_notifications")]
        A1 --> DB_ANN[("MySQL: core_announcements + core_announcement_reads")]
    end

    subgraph Channels ["Canais de Entrega Assíncronos (Redis Queues)"]
        DB_NOTIF --> WEBSOCKET["WebSocket (Laravel Reverb / Mercure)<br/>Canal Privado: private-user-{id}"]
        DB_NOTIF --> PUSH["Web Push (Service Worker / PWA)"]
        DB_NOTIF --> EMAIL["E-mail Transacional (Amazon SES / SMTP)"]
        DB_NOTIF --> WHATSAPP["WhatsApp / SMS (Gateway API)"]
    end

    subgraph ClientDelivery ["Experiência no Cliente (@sysgov/ui)"]
        WEBSOCKET --> TOAST["Toast Realtime + Sino de Notificações (+1)"]
        DB_ANN --> MODAL["Modal de Bloqueio de Login com 'Ciente Obrigatório'"]
    end
```
