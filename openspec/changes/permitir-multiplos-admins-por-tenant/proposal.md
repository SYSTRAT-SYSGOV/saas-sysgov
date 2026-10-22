# Proposal

## Why

Hoje o onboarding do web-admin permite cadastrar **um único** administrador (`admin_tenant`) por tenant: `UserAdminController::createTenantAdmin` e `UserService::createTenantAdmin` devolvem HTTP 409 / o admin existente quando já há um vínculo ativo com a role `admin_tenant`, e `updateTenantAdmin` edita sempre "o" primeiro administrador encontrado. Na prática isso cria um ponto único de falha: se a única pessoa administradora sai do órgão, perde a senha ou o acesso ao autenticador (MFA obrigatório para este papel), a prefeitura fica sem ninguém capaz de gerir usuários, e o suporte SYSTRAT precisa intervir manualmente. Órgãos públicos precisam de mais de um administrador (titular, substituto, TI) e de continuidade na troca de gestão.

## What Changes

- Permitir **N administradores ativos por tenant**: remover a trava de unicidade do onboarding (409) e a regra "retorna o admin existente" do serviço.
- Web-admin (SYSTRAT): listar os administradores do tenant, cadastrar novos, editar (nome/senha) **um administrador específico** por id, e desativar/reativar o vínculo de administrador.
- Web-client: o `admin_tenant` passa a poder promover/cadastrar outro `admin_tenant` no próprio tenant (hoje a lista de papéis do módulo de usuários já inclui `admin_tenant`, mas não há regra explícita nem auditoria específica).
- **Salvaguarda do último administrador**: nenhuma operação (desativar, remover papel, trocar papel, desativar conta) pode deixar o tenant sem ao menos um administrador ativo; exceção: desativação de emergência pelo SYSTRAT, que exige motivo e gera alerta.
- Cada novo administrador cai na regra RN-USR-005 (MFA obrigatório) e usa o fluxo de configuração de MFA no primeiro login (já existente).
- E-mail reutilizado: um e-mail já cadastrado em outro tenant não é duplicado; o usuário ganha novo vínculo e role no tenant (comportamento do `updateOrCreate` atual), sem sobrescrever a senha de quem já existe.
- Auditoria e Outbox: `tenant_admin.created`, `tenant_admin.updated`, `tenant_admin.deactivated` com ator e tenant; evento `TenantAdminCreated` por administrador.
- (Opcional, parametrizável) limite máximo de administradores por tenant, configurável pela SYSTRAT, padrão sem limite.

## Capabilities

### New Capabilities
- (Nenhuma)

### Modified Capabilities
- `admin`: o requisito "Onboarding do administrador do tenant é idempotente" deixa de limitar a um administrador e passa a descrever o cadastro de múltiplos administradores por tenant, com idempotência **por e-mail** (mesmo e-mail no mesmo tenant não duplica); novo requisito da salvaguarda do último administrador.

## Impact

- Backend (`apps/api`): `Modules/Admin` — `UserAdminController` (create/update/list/deactivate de administradores), `CreateTenantAdminRequest`, `UpdateTenantAdminRequest`, `UserPolicy`, rotas `Modules/Admin/Routes/api.php`; `app/Services/UserService.php` (`createTenantAdmin`, `deactivate`); `ClientUserController` (guarda do último admin); testes `UserManagementFlowTest` e novos testes de feature.
- Frontend web-admin (`apps/web`): `AdminTenantManagement.tsx` (modal de onboarding vira gestão de administradores com lista), `modules/admin/api.ts`.
- Frontend web-client (`apps/web-client`): `modules/users/UsersModule.tsx` (aviso ao rebaixar/desativar o último admin).
- SDK (`packages/sdk`): `createTenantAdmin`, novo `listTenantAdmins`/`updateTenantAdmin(id)`/`deactivateTenantAdmin`.
- Banco de dados: nenhuma tabela nova obrigatória (usa `tenant_user` + `roles`); opcional coluna `tenants.max_admins` (nullable).
- Segurança: ampliação de superfície de contas privilegiadas — mitigada por MFA obrigatório, auditoria, salvaguarda do último admin e permissão explícita.
- Documentação: `docs/modules/gestao-usuarios.md`, `docs/adr/0005-politica-usuarios-tenant.md` (atualizar RN-USR-011).
