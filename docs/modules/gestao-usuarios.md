# Módulo de Gestão de Usuários & Roles (web-admin)

> Documentação do domínio de identidade e RBAC do SYSGOV.
> Cobre: usuários da equipe SYSTRAT, onboarding do admin inicial de tenants, convites,
> roles & permissões (RBAC), MFA, SSO OpenID Connect e auditoria imutável.

## 1. Modelo de Identidade

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              users (global)                                │
│  id, name, email (unique), password (nullable), is_systrat, is_active,     │
│  is_platform_admin, mfa_secret (encrypted), mfa_enabled, mfa_confirmed_at  │
└─────────────────────────────────────────────────────────────────────────────┘
        │ 1:N                              │ N:N via tenant_user
        │                                  ▼
┌───────▼──────────────┐        ┌───────────────────────────┐
│   user_invitations   │        │   tenant_user (vínculo)   │
│  tenant_id, email,   │        │  tenant_id, user_id,      │
│  token (hash),       │        │  role_id, status,         │
│  role_slug,          │        │  is_primary               │
│  invited_by,         │        │  UNIQUE(tenant_id,user_id)│
│  expires_at (72h)    │        └───────────────────────────┘
└──────────────────────┘
        │ N:N
┌───────▼───────────┐   ┌───────────────────┐
│  roles (RBAC)     │───│ role_permission   │
│  name, slug,      │   └───────────────────┘
│  scope (systrat|tenant),                    │
│  is_system, tenant_id                       │
└───────────────────┘   ┌───────────────────┐
                        │ permissions       │
                        │ name, slug, module│
                        └───────────────────┘
```

- **`users`** é uma tabela **global** de identidade (não tem `tenant_id`).
- O vínculo usuário↔tenant é feito pela tabela **`tenant_user`** com `role_id`, `status` e `is_primary`.
- **`user_invitations`** armazena apenas o **hash sha256 do token** (o token em claro vai no e-mail via outbox).

## 2. Regras de Negócio (RN)

| RN | Regra | Implementação |
|---|---|---|
| **RN-USR-001** | Multi-tenancy isolado | `tenant_user` único por `(tenant_id, user_id)`; queries sempre escopadas pelo `TenantContext` |
| **RN-USR-002** | Papel `suporte` é read-only | `RbacSeeder` não concede permissões de escrita ao `suporte`; policies rejeitam |
| **RN-USR-003** | Segregação de funções | Quem convida não define a própria role; `suporte` nunca executa escrita |
| **RN-USR-004** | Convite com token + expiração 72h | `InvitationService::invite()` → expira em 72h; aceite após expiração → **410**; reuso → **409** |
| **RN-USR-005** | MFA obrigatório p/ papéis privilegiados | `AuthController::login` exige TOTP para `super_admin`/`admin_ops`/`admin_tenant` |
| **RN-USR-006** | Último super_admin protegido | `UserService::deactivate/update` lançam `ValidationException` (422) |
| **RN-USR-007** | Auditoria imutável HMAC encadeado | `AuditLogger` gera `hash(registro + prev_hash)`; `AuditLog` bloqueia update/delete |
| **RN-USR-008** | SSO OpenID Connect por tenant | `OidcController` (state + PKCE); vínculo por e-mail; 409 se não vinculado |
| **RN-USR-009** | Reset de senha com token + expiração | `UserService::requestPasswordReset/resetPassword`; política mínima 8 chars |
| **RN-USR-010** | E-mail sempre via Outbox | `OutboxPublisher` para `UserInvited`, `PasswordResetRequested`, etc. |
| **RN-USR-011** | Divisão de painéis | web-admin = usuários SYSTRAT + admin inicial + visão read-only do tenant; CRUD do tenant é do web-client |

## 3. Roles e Permissões

### Escopo SYSTRAT (web-admin)

| Role | Descrição |
|---|---|
| `super_admin` | Acesso total à plataforma |
| `admin_ops` | Opera o SaaS (tenants, contratos, usuários SYSTRAT) — sem segredos |
| `suporte` | Somente leitura (RN-USR-002) |

### Escopo Tenant (web-client)

| Role | Descrição |
|---|---|
| `admin_tenant` | CRUD completo dos usuários do tenant |
| `gestor`, `pregoeiro`, `requisitante`, `parecerista`, `fiscal`, `membro` | Papéis operacionais |

### Permissões do módulo (slugs)

```
users.systrat.view|create|update|delete
users.tenant.view
users.tenant.create        (onboarding do admin inicial)
users.invite
users.deactivate
users.reset_password
roles.view|create|update|delete
roles.assign
```

> Slugs legados (`admin.users.*`, `admin.roles.*`) são mantidos para compatibilidade
> com os módulos de menus/tenants. As policies aceitam ambos.

## 4. Divisão de Responsabilidades por Painel (RN-USR-011)

| Ação | Painel | Rota |
|---|---|---|
| CRUD usuários SYSTRAT | web-admin | `/admin/users` |
| Gestão de roles & permissões | web-admin | `/admin/roles`, `/admin/permissions` |
| **Criar admin inicial do tenant** | web-admin | `POST /admin/tenants/{tenant}/users/admin` (idempotente → 409) |
| Visão read-only dos usuários do tenant | web-admin | `GET /admin/tenants/{tenant}/users` |
| Desativação de emergência | web-admin | `POST /admin/tenants/{tenant}/users/{user}/deactivate` (motivo obrigatório) |
| **CRUD diário dos usuários do tenant** | **web-client** | `/api/users` (fora do escopo deste módulo) |
| MFA do próprio usuário | ambos | `POST /me/mfa/setup`, `/me/mfa/confirm`, `/me/mfa/disable` |
| Reset de senha self-service | ambos | `POST /auth/forgot-password`, `/auth/reset-password` |

## 5. Fluxo de Convite

```
web-admin ──POST /admin/invitations──▶ InvitationService::invite()
                                          ├─ gera token (64 bytes) → hash sha256 salvo
                                          ├─ expiração = now() + 72h
                                          └─ publica UserInvited (outbox) → e-mail
Usuário ──POST /auth/accept-invitation──▶ InvitationService::accept()
                                          ├─ token válido   → cria/vincula usuário, 200
                                          ├─ token expirado → 410 Gone
                                          ├─ já aceito      → 409 Conflict
                                          └─ token inválido → 422
```

## 6. MFA (RN-USR-005)

- TOTP via `pragmarx/google2fa-qrcode` (secret criptografado em `users.mfa_secret`).
- Fluxo: `POST /me/mfa/setup` (gera secret + otpauth_url) → `POST /me/mfa/confirm` (código de 6 dígitos).
- Login: papéis privilegiados **sem** MFA configurado → `403 MFA_REQUIRED`;
  com MFA configurado e código ausente → `422 MFA_CODE_REQUIRED`; código inválido → `422`.
- Middleware `EnsureMfa` bloqueia operações do web-admin para papéis privilegiados sem MFA
  (exceto os endpoints de setup), isento no ambiente de testes.

## 7. SSO OpenID Connect (RN-USR-008)

- Configuração por tenant em `tenants.settings.oidc`: `issuer`, `client_id`, `client_secret`, `scopes`.
- Fluxo: `GET /oidc/redirect/{tenant}` → gera `state` + PKCE `code_challenge` →
  `GET /oidc/callback` → troca code, busca `userinfo`, localiza usuário **por e-mail**
  vinculado ao tenant → emite token Sanctum. Usuário não vinculado → `409`.

## 8. Auditoria Imutável (RN-USR-007)

Cada registro em `audit_logs` contém:

```
hash      = sha256(concat(tenant_id, user_id, action, resource,
                          json(before), json(after), timestamp, prev_hash))
prev_hash = hash do registro anterior  (nil no primeiro)
```

- Update/delete em `audit_logs` lançam `LogicException` (imutável).
- Validação: `Modules/Admin/Tests/Feature/AuditChainTest`.

## 9. Testes (gate de merge)

```
Modules/Admin/Tests/Feature/
├── AuthenticationTest                 # login/roles/platform-admin
├── AuthorizationTest                  # policies
├── TenantIsolationAndBolaTest         # RN-USR-001
├── InvitationLifecycleTest            # RN-USR-004 (410/409)
├── MfaRequirementTest                 # RN-USR-005
├── LastSuperAdminProtectionTest       # RN-USR-006
├── SupportReadOnlyTest                # RN-USR-002
├── AuditChainTest                     # RN-USR-007
└── UserManagementFlowTest             # CRUD SYSTRAT, onboarding, RN-USR-011
```

## 10. Qualidade

- PHPStan **nível 6** com baseline incremental (`phpstan-baseline.neon`).
- Testes Pest/PHPUnit: `vendor/bin/phpunit Modules/Admin/Tests`.
- Frontend: `npm run lint` (tsc --noEmit) e `npm run build` em `apps/web`.
