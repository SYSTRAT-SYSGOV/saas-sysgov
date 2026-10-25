# Fluxo Arquitetural: Perfis de Acesso, Autenticação e Permissões RBAC (SYSGOV - Usuario)

Este documento modela a arquitetura de **Autenticação, Autorização e Gestão de Escopos Escolares** do **SYSGOV (SYS-Educa)**, superando o acoplamento do legado do i-Educar (`pmieducar.usuario`, `portal.funcionario`, `portal.acesso`, `pmieducar.tipo_usuario`, `pmieducar.menu_tipo_usuario`, `pmieducar.usuario_escola`).

---

## 1. Fluxo de Autenticação Unificada (Gov.br / MFA / JWT)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário (Servidor / Docente / Gestor)
    participant FE as Frontend React 19 (SYSGOV UI)
    participant GW as API Gateway / Auth Middleware
    participant AS as AuthenticationService (Laravel 13)
    participant GB as Provedor Gov.br (OAuth2 / OIDC)
    participant DB as MySQL 8.0/8.4 (core_users / scopes)
    participant RD as Redis Cluster (Sessões / Tokens)

    alt Autenticação via Gov.br (Padrão Cidadão / Servidor Público)
        U->>FE: Clica em "Entrar com Gov.br"
        FE->>GW: GET /api/v1/auth/govbr/redirect
        GW->>GB: Redireciona para login Gov.br (OIDC)
        U->>GB: Autentica com CPF e biometria/senha
        GB->>GW: Callback com auth_code & state
        GW->>AS: Troca code por ID Token & UserInfo
        AS->>DB: Busca usuário por CPF ou govbr_subject_id
    else Autenticação Institucional (CPF + Senha)
        U->>FE: Informa CPF e Senha
        FE->>GW: POST /api/v1/auth/login
        GW->>AS: Valida credenciais (Argon2id)
        AS->>DB: Busca core_users por CPF e tenant_id
    end

    alt MFA Ativo (TOTP / SMS / Email)
        AS->>FE: Requer Segundo Fator (MFA_CHALLENGE_REQUIRED)
        U->>FE: Informa código de 6 dígitos (TOTP)
        FE->>AS: POST /api/v1/auth/mfa/verify
        AS->>AS: Valida TOTP contra mfa_secret encriptado
    end

    AS->>DB: Carrega Escopos Escolares (educa_user_school_scopes) e Papéis (core_roles)
    AS->>RD: Registra Sessão Ativa & Refresh Token
    AS->>FE: Retorna JWT Bearer Token (Claims: user_id, tenant_id, scopes, permissions)
    FE->>U: Acesso liberado ao painel do SYSGOV
```

---

## 2. Matriz RBAC Hierárquica e Resolução de Escopo Escolar

```mermaid
graph TD
    classDef tenantNode fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef roleNode fill:#1e1b4b,stroke:#8b5cf6,stroke-width:2px,color:#fff
    classDef permNode fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff
    classDef scopeNode fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef userNode fill:#1f2937,stroke:#ec4899,stroke-width:2px,color:#fff

    T["🏢 Município / Órgão Gestor (Tenant ID)"]:::tenantNode

    subgraph Usuarios["👤 Usuários Unificados (core_users)"]
        U1["Prof. Carlos Mendes (CPF: 123.456.789-00)"]:::userNode
        U2["Diretora Márcia Souza (CPF: 987.654.321-11)"]:::userNode
    end

    subgraph Papeis["🛡️ Perfis de Acesso (core_roles)"]
        R_ADMIN["Administrador da Secretaria (Level 1)"]:::roleNode
        R_DIR["Diretor Escolar (Level 3)"]:::roleNode
        R_SEC["Secretário Escolar (Level 4)"]:::roleNode
        R_PROF["Professor Titular (Level 5)"]:::roleNode
    end

    subgraph Permissoes["🔑 Permissões Atômicas (core_permissions)"]
        P1["evaluations.grades.post (Lançar Notas)"]:::permNode
        P2["daily_record.attendance.register (Lançar Frequência)"]:::permNode
        P3["enrollments.transfer.approve (Aprovar Transferências)"]:::permNode
        P4["reports.report_card.issue (Emitir Boletim Oficial)"]:::permNode
    end

    subgraph Escopos["🏫 Escopo e Lotação Escolar (educa_user_school_scopes)"]
        S_ESC1["E.M. Professora Maria Silva (Escola A)"]:::scopeNode
        S_ESC2["E.M. Barão do Rio Branco (Escola B)"]:::scopeNode
    end

    T --> Usuarios
    T --> Papeis

    R_PROF --> P1
    R_PROF --> P2
    R_DIR --> P1
    R_DIR --> P2
    R_DIR --> P3
    R_DIR --> P4

    U1 -.->|Lotação como Professor| S_ESC1
    U1 -.->|Papel: R_PROF| S_ESC1

    U2 -.->|Diretora Geral| S_ESC1
    U2 -.->|Diretora Substituta| S_ESC2
    U2 -.->|Papel: R_DIR| S_ESC1
    U2 -.->|Papel: R_DIR| S_ESC2
```

---

## 3. Decisão de Autorização por Requisição (RBAC + Contextual Scope Middleware)

```mermaid
flowchart TD
    Req["Incoming HTTP Request com JWT Bearer Token"] --> TokenValid{"Token JWT Válido e Ativo no Redis?"}
    TokenValid -- Não --> Err401["401 Unauthorized (Token Expirado ou Inválido)"]
    TokenValid -- Sim --> TenantCheck{"Tenant da URL bate com Claim do JWT?"}
    TenantCheck -- Não --> Err403T["403 Forbidden (Tentativa de Cross-Tenant)"]
    TenantCheck -- Sim --> SchoolCheck{"Endpoint requer contexto de Escola?"}

    SchoolCheck -- Sim --> HasScope{"Usuário tem Vínculo Ativo na Escola (educa_user_school_scopes)?"}
    HasScope -- Não --> Err403S["403 Forbidden (Usuário não lotado nesta escola)"]
    HasScope -- Sim --> PermCheck{"Papel no Escopo ou Global possui a Permissão Requerida?"}

    SchoolCheck -- Não --> PermCheckGlobal{"Possui Permissão Global da Rede (core_role_permissions)?"}

    PermCheck -- Não --> Err403P["403 Forbidden (Permissão atômica ausente)"]
    PermCheck -- Sim --> ExecAction["Executa Ação no Domínio (Controller / Service)"]

    PermCheckGlobal -- Não --> Err403P
    PermCheckGlobal -- Sim --> ExecAction
```
