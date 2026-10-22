# Design

## Contexto

- Administrador do tenant = usuário com vínculo `tenant_user.status = 'active'` no tenant **e** role `admin_tenant` (scope `tenant`, `tenant_id` do tenant).
- Pontos que hoje assumem "um único admin":
  1. `UserAdminController::createTenantAdmin` — responde 409 se já existe admin ativo.
  2. `UserService::createTenantAdmin` — retorna o admin existente em vez de criar.
  3. `UserAdminController::updateTenantAdmin` (`PUT /tenants/{tenant}/users/admin`) — usa `->first()` e edita o primeiro admin.
  4. `CreateTenantAdminRequest::emailRule` — só aceita e-mail repetido se for admin do **mesmo** tenant (suporte à idempotência do 409).
  5. `AdminTenantManagement.tsx` — modal com modo "criar o primeiro" ou "editar o existente".
- RN-USR-011 mantém: web-admin (SYSTRAT) só faz onboarding + visão read-only + desativação de emergência; CRUD de usuários do tenant é do web-client.

## Decisões

### D1. Sem mudança de modelo de dados
Continuar com `tenant_user` + `roles`. "Vários admins" é apenas ausência da trava de unicidade. Evita migration em tabelas quentes e preserva as policies já existentes baseadas em `hasRole('admin_tenant', $tenantId)`.
*Alternativa descartada:* tabela `tenant_admins` dedicada — duplicaria a fonte de verdade da role.

### D2. Idempotência passa de "por tenant" para "por e-mail no tenant"
`POST /api/admin/tenants/{tenant}/users/admin`:
- e-mail novo → cria usuário + vínculo + role `admin_tenant` → **201**;
- e-mail já é admin ativo **do mesmo tenant** → **409** com o usuário existente (evita duplicata acidental / duplo clique);
- e-mail existe como usuário de **outro** tenant ou sem vínculo → reaproveita o usuário, cria vínculo e role neste tenant **sem alterar a senha existente** → **201**. (Hoje `updateOrCreate` sobrescreveria nome/senha — comportamento a corrigir.)
- e-mail existe como usuário do mesmo tenant com outro papel → promove a `admin_tenant` mantendo a senha → **200**.

### D3. Endpoints de administradores por id
- `GET  /api/admin/tenants/{tenant}/users/admins` — lista administradores (ativos e inativos), com status do MFA.
- `POST /api/admin/tenants/{tenant}/users/admin` — cadastra (D2).
- `PUT  /api/admin/tenants/{tenant}/users/admin/{user}` — edita nome/senha de um administrador específico.
- `POST /api/admin/tenants/{tenant}/users/admin/{user}/deactivate` — desativação com motivo (reutiliza `deactivateTenantUser`).
- Compatibilidade: `PUT /tenants/{tenant}/users/admin` (sem id) continua funcionando **somente** se houver exatamente um administrador ativo; havendo mais de um responde **422** pedindo o id. Mantém clientes antigos sem quebra silenciosa.

### D4. Salvaguarda do último administrador
Serviço único `TenantAdminGuard::assertNotLastAdmin(Tenant, User, string $acao)` chamado em: desativar vínculo, trocar/remover a role `admin_tenant`, desativar conta (`is_active=false`) e exclusão. Conta apenas administradores **ativos** com conta ativa. Falha → **422** `"O tenant precisa manter ao menos um administrador ativo."`.
Exceção: desativação de emergência do SYSTRAT (`deactivateTenantUser`) pode deixar o tenant sem admin, mas exige `reason`, grava `tenant_admin.deactivated` com `emergency=true` e publica alerta no Outbox — o SYSTRAT assume a obrigação de cadastrar novo admin.

### D5. Quem pode cadastrar administradores
- SYSTRAT: `users.tenant.create` (já existente) no web-admin.
- Tenant: `admin_tenant` cadastra/promove outros `admin_tenant` no web-client (já aceito por `StoreTenantUserRequest`/`resolveTenantRole`). Torna-se **explícito** em teste e spec. Papéis que não são `admin_tenant` não podem atribuir `admin_tenant` (anti-escalada de privilégio).

### D6. MFA
Cada novo administrador exige MFA (RN-USR-005, `User::requiresMfa`). Primeiro login dispara o fluxo de configuração (`mfa_setup_token` + `/auth/mfa-setup/*`). Nada a mudar; apenas teste de regressão cobrindo "segundo admin cadastrado precisa configurar MFA".

### D7. Limite opcional
Coluna `tenants.max_admins` (nullable, `null` = sem limite). Ao cadastrar além do limite → **422**. Entra como tarefa opcional e só é implementada se a SYSTRAT confirmar a necessidade.

### D8. Auditoria e eventos
`AuditService::record('tenant', 'tenant_admin.created|updated|deactivated', ...)` com ator e tenant; `TenantAdminCreated` publicado no Outbox **por administrador criado** (não mais "uma vez por tenant"). Consumidores de `TenantAdminCreated` devem ser revisados para não assumirem unicidade (levantamento nas tarefas).

## Riscos e Trade-offs

- **Mais contas privilegiadas** → maior superfície. Mitigação: MFA obrigatório, auditoria, salvaguarda do último admin, permissão explícita.
- **Compatibilidade do `PUT .../users/admin` sem id** → mantido com 422 quando ambíguo, em vez de editar um administrador "aleatório".
- **Consumidores do evento `TenantAdminCreated`** podem assumir 1 por tenant → verificar antes de liberar.
- **Reaproveitar usuário de outro tenant** sem alterar senha evita sequestro de conta por onboarding, mas o administrador precisa usar a senha que já tem.

## Plano de migração
Sem migration obrigatória; deploy do backend antes do front. Dados existentes (1 admin por tenant) continuam válidos.
