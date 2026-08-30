# Contrato de Uso — Módulo Usuários & Acessos

**Versão:** 1.0 (evolução Fases A–F, 2026-08-29)  
**Escopo:** comum a todos os tenants — governança de acesso por módulo × secretaria.

## 1. Modelo de Dados
Tabela `user_module_access` (aditivo — vigência/status/rastreabilidade):

| Coluna | Tipo | Descrição |
|---|---|---|
| `user_id` | FK users | Usuário |
| `tenant_id` | FK tenants | Tenant |
| `module_alias` | string | Módulo (org, contracts, finance, procurement, ...) |
| `role` | string | Papel no módulo: `member`, `manager`, `admin`, `editor`, `viewer` |
| `org_unit_ids` | json/null | Secretarias; `null` = todas; `[]` = nenhuma |
| `can_manage_users` | bool | Admin do módulo (gerencia usuários só deste módulo) |
| `valid_from` | timestamp? | Início da vigência |
| `valid_to` | timestamp? | Fim da vigência (`null` = sem expiração) |
| `status` | string | `active` / `expired` / `revoked` |
| `granted_by` | FK users? | Quem concedeu (rastreabilidade RN-ACC-003) |

## 2. Regras de Negócio
- **RN-ACC-001 (vigência):** acesso com `valid_to` no passado ou `status` ≠ `active` NÃO concede acesso em tempo real (`ModuleAccessService::hasModuleAccess` verifica `isActive()`).
- **RN-ACC-002 (delegação):** admin de módulo só gerencia o próprio módulo e suas secretarias (`canGrantTo`). Admin geral (`admin_tenant`/platform/suporte) pode tudo no tenant.
- **RN-ACC-003 (rastreabilidade):** toda `grantAccess`/`revokeAccess`/`renewAccess` registra `AuditLogger` com `granted_by`/`revoked_by` e `before`/`after`.
- **RN-ACC-005 (revogação lógica):** revogação marca `status=revoked` — nunca delete físico.

## 3. Escopo de Dados (ABAC)
- `org_unit_ids = null` → todas as secretarias.
- `org_unit_ids = [1,2]` → unidades selecionadas E seus descendentes (expansão hierárquica por `path` do OrgUnit).
- `allowedOrgUnitIds()` devolve a lista expandida (null = todas).

## 4. Expiração Automática
- **Job diário `sysgov:expire-access`** (03:00) — marca acessos vencidos como `expired`, audita e publica `notification.access_expired` via Outbox.
- **Job diário `sysgov:notify-expiring-access`** (07:00) — notifica admin geral sobre acessos expirando em 30 dias (`notification.access_expiring`).

## 5. API (prefixo `/api/access`, auth:sanctum + tenant)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/access/matrix` | Matriz usuário × módulo × secretaria × status |
| GET | `/access/by-module` | Visão por módulo |
| GET | `/access/expiring` | Acessos expirando nos próximos 30 dias |
| POST | `/access` | Conceder acesso (valida delegação) |
| POST | `/access/{access}/revoke` | Revogar (lógico) |
| POST | `/access/{access}/renew` | Renovar/estender vigência |

Rotas existentes preservadas: `/access` (summary), `/access/dashboard`, `/access/modules`, `/access/users` (CRUD).

## 6. UI (web-client, módulo `access`)
- **Lista / Painel do Admin** (toggle): Lista (cadastro rápido) e Painel do Admin (matriz, por módulo, expirando, pendentes).
- **NewUserWizard** (4 etapas): dados, vínculo, acessos por módulo, ativação. Cadastro rápido preservado.
- **Delegação na UI:** admin de módulo vê apenas a Etapa 3 filtrada para os módulos que administra.

## 7. DoD
- Migrations aditivas (guarda `hasColumn`); PHPStan sem novos erros; suíte de regressão verde; isolamento multi-tenant testado.