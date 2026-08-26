# Gestão de Usuários do Tenant (web-client)

> Módulo complementar à Gestão de Usuários & Roles (web-admin).
> CRUD diário dos usuários de cada prefeitura/tenant, executado pelo **admin_tenant**
> no painel do cliente (RN-USR-011).

## 1. Divisão de Responsabilidades (RN-USR-011)

| Ação | Painel | Rota | Quem |
|---|---|---|---|
| **CRUD diário dos usuários do tenant** (criar, editar, role, desativar, reativar) | **web-client** | `/api/users` | `admin_tenant` |
| Criar admin inicial (onboarding) | web-admin | `POST /admin/tenants/{tenant}/users/admin` | super_admin / admin_ops |
| Visão read-only dos usuários do tenant | web-admin | `GET /admin/tenants/{tenant}/users` | admin_ops / suporte |
| Desativação de emergência | web-admin | `POST /admin/tenants/{tenant}/users/{user}/deactivate` | super_admin |

O web-admin **não possui** rotas de criação/edição de usuários de tenant (rotas inexistentes),
portanto a divisão é imposta por contrato e não apenas por RBAC.

## 2. Endpoints (`/api/users`)

Protegidos por `auth:sanctum` + `tenant` (ResolveTenant → X-Tenant-Slug).

| Método | Rota | Descrição | Permissão |
|---|---|---|---|
| GET | `/api/users` | Listar usuários do tenant (search/role/status, paginado) | `admin_tenant` |
| POST | `/api/users` | Criar usuário do tenant com role do tenant | `admin_tenant` |
| GET | `/api/users/{user}` | Detalhe (valida vínculo com o tenant) | `admin_tenant` |
| PUT | `/api/users/{user}` | Atualizar nome/e-mail/role | `admin_tenant` |
| POST | `/api/users/{user}/deactivate` | Desativar com motivo (auditado) | `admin_tenant` |
| POST | `/api/users/{user}/reactivate` | Reativar | `admin_tenant` |

### Regras

- A role atribuída DEVE existir no tenant (`scope = tenant` e `tenant_id` do tenant ativo).
- Usuário de outro tenant → `404` (não vaza existência).
- E-mail único global; reuso de e-mail já cadastrado em outro tenant → `422`.
- Senha com política mínima (8 chars, maiúscula, minúscula, número, símbolo).
- Toda mutação registra auditoria HMAC (RN-USR-007) com origem `tenant`.

## 3. Frontend (web-client)

- `apps/web-client/src/modules/users/UsersModule.tsx` — listagem com filtros, criar/editar,
  desativar (motivo obrigatório), reativar.
- `UsersApi.ts` — client HTTP (axios com `X-Tenant-Slug` automático).
- Registrado em `moduleRegistry.ts` (`users` → `/usuarios`, permissão `users.manage`)
  e rota `/usuarios` no `AppRouter`.
- Papéis disponíveis no formulário: `admin_tenant`, `gestor`, `pregoeiro`,
  `requisitante`, `parecerista`, `fiscal`, `membro`.

## 4. Testes

`Modules/Admin/Tests/Feature/ClientTenantUsersTest.php`:

- `test_admin_tenant_can_list_tenant_users`
- `test_admin_tenant_can_create_tenant_user_with_tenant_role`
- `test_admin_tenant_can_update_user_role`
- `test_admin_tenant_can_deactivate_and_reactivate_user`
- `test_regular_member_cannot_manage_users` (403)
- `test_user_from_another_tenant_is_blocked`
- `test_admin_cannot_access_user_from_other_tenant` (404)

## 5. Qualidade

- Backend: 42 testes do módulo Admin passando; PHPStan nível 6 (baseline) sem erros.
- Frontend: `tsc --noEmit` limpo; build vite gerando `UsersModule` via lazy loading.
