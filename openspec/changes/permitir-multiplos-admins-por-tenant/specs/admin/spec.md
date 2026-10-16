## MODIFIED Requirements

### Requirement: Onboarding do administrador do tenant é idempotente
<!-- id: UserAdminController.createTenantAdmin -->
<!-- entities: User, Tenant, Role, AuditLog, OutboxEvent -->
<!-- enforced: UserAdminController.createTenantAdmin() -->

O cadastro de administradores do tenant (RN-USR-011) SHALL permitir **quantos administradores
ativos forem necessários** por tenant. A idempotência passa a ser **por e-mail dentro do tenant**:
havendo usuário com vínculo `active` no tenant, role `admin_tenant` e o mesmo e-mail, responde
HTTP 409 com o administrador existente, sem criar duplicata. Cada criação válida audita
`tenant_admin.created` e publica `TenantAdminCreated` no Outbox. Quando o e-mail já pertence a um
usuário existente (de outro tenant ou sem papel de administrador neste tenant), o sistema SHALL
reaproveitar o usuário, criar o vínculo e a role `admin_tenant` no tenant e **preservar a senha e o
nome já cadastrados**. A atualização SHALL ser feita por administrador específico (id), responder
HTTP 404 quando o administrador não existir no tenant e ignorar `password` enviado vazio. A
atualização sem id SHALL ser aceita somente quando houver exatamente um administrador ativo; havendo
mais de um, responde HTTP 422 solicitando o id.

#### Scenario: primeiro administrador do tenant
<!-- test: UserManagementFlowTest.test_onboarding_creates_tenant_admin_with_admin_tenant_role() -->
- **WHEN** `POST /api/admin/tenants/{tenant}/users/admin` roda em tenant sem administrador
- **THEN** responde HTTP 201 com a role `admin_tenant` atribuída e grava `tenant_admin.created`

#### Scenario: segundo administrador no mesmo tenant
- **WHEN** já existe administrador ativo e o cadastro chega com um e-mail diferente
- **THEN** responde HTTP 201, o tenant passa a ter dois administradores ativos e grava `tenant_admin.created`

#### Scenario: mesmo e-mail repetido no mesmo tenant
- **WHEN** o e-mail enviado já é de administrador ativo do mesmo tenant
- **THEN** responde HTTP 409 "Este administrador já está cadastrado neste tenant." com o usuário existente

#### Scenario: e-mail de usuário existente em outro tenant
- **WHEN** o e-mail pertence a usuário de outro tenant
- **THEN** cria o vínculo e a role `admin_tenant` no tenant, mantém a senha e o nome originais e responde HTTP 201

#### Scenario: atualização de um administrador específico
- **WHEN** `PUT /api/admin/tenants/{tenant}/users/admin/{user}` roda com `name` e/ou `password`
- **THEN** atualiza somente esse administrador e grava `tenant_admin.updated`

#### Scenario: atualização sem id com mais de um administrador
- **WHEN** `PUT /api/admin/tenants/{tenant}/users/admin` roda e existem dois ou mais administradores ativos
- **THEN** responde HTTP 422 solicitando o id do administrador

#### Scenario: atualização sem administrador existente
- **WHEN** a atualização roda em tenant sem administrador ativo
- **THEN** responde HTTP 404 orientando o uso do onboarding

#### Scenario: senha em branco na atualização
- **WHEN** `password` chega como string vazia
- **THEN** o campo é descartado e a senha atual é preservada

## ADDED Requirements

### Requirement: Listagem de administradores do tenant
<!-- id: UserAdminController.listTenantAdmins -->
<!-- entities: User, Tenant, Role -->
<!-- enforced: UserAdminController.listTenantAdmins() -->

O Admin SYSTRAT SHALL poder listar todos os administradores de um tenant (`GET
/api/admin/tenants/{tenant}/users/admins`), incluindo ativos e inativos, com nome, e-mail, status do
vínculo, data do último acesso e se o MFA está configurado.

#### Scenario: listar administradores
- **WHEN** o usuário com `users.tenant.view` chama o endpoint de listagem
- **THEN** responde HTTP 200 com todos os administradores do tenant e o indicador `mfa_enabled` de cada um

#### Scenario: sem permissão
- **WHEN** o usuário não possui `users.tenant.view`
- **THEN** responde HTTP 403


### Requirement: Tenant mantém ao menos um administrador ativo
<!-- id: TenantAdminGuard.assertNotLastAdmin -->
<!-- entities: User, Tenant, Role, AuditLog, OutboxEvent -->
<!-- enforced: TenantAdminGuard.assertNotLastAdmin() -->

O sistema SHALL impedir qualquer operação que deixe o tenant sem administrador ativo: desativar o
vínculo, remover ou trocar a role `admin_tenant`, desativar a conta (`is_active=false`) ou excluir o
usuário. A violação responde HTTP 422 "O tenant precisa manter ao menos um administrador ativo.".
A desativação de emergência pelo SYSTRAT SHALL ser a única exceção; ela exige `reason`, audita
`tenant_admin.deactivated` com `emergency=true` e publica alerta no Outbox.

#### Scenario: desativar o único administrador
- **WHEN** o único administrador ativo do tenant é desativado pelo web-client
- **THEN** responde HTTP 422 e o vínculo permanece ativo

#### Scenario: desativar um de vários administradores
- **WHEN** o tenant tem dois administradores ativos e um deles é desativado
- **THEN** o vínculo é desativado, grava `tenant_admin.deactivated` e o outro administrador continua ativo

#### Scenario: rebaixar o único administrador
- **WHEN** o único administrador tem a role trocada por outra role
- **THEN** responde HTTP 422 e a role `admin_tenant` é mantida

#### Scenario: desativação de emergência pelo SYSTRAT
- **WHEN** o SYSTRAT desativa o último administrador informando o motivo
- **THEN** o vínculo é desativado, grava `tenant_admin.deactivated` com `emergency=true` e publica alerta no Outbox


### Requirement: Administrador do tenant cadastra outros administradores
<!-- id: ClientUserController.store -->
<!-- entities: User, Role -->
<!-- enforced: ClientUserController.store(), ClientUserController.update() -->

No web-client, o usuário com role `admin_tenant` SHALL poder cadastrar ou promover outro usuário do
mesmo tenant à role `admin_tenant`. Usuários sem a role `admin_tenant` SHALL NOT atribuir essa role
(proteção contra escalada de privilégio) e recebem HTTP 403. Todo administrador cadastrado está sujeito
ao MFA obrigatório (RN-USR-005).

#### Scenario: administrador cadastra outro administrador
- **WHEN** um `admin_tenant` envia `POST /api/users` com `role_slug = admin_tenant`
- **THEN** responde HTTP 201 e o novo usuário passa a administrar o tenant

#### Scenario: usuário comum tenta atribuir admin_tenant
- **WHEN** usuário sem a role `admin_tenant` envia `role_slug = admin_tenant`
- **THEN** responde HTTP 403

#### Scenario: novo administrador precisa configurar MFA
- **WHEN** o administrador recém-cadastrado faz o primeiro login
- **THEN** o login responde `MFA_REQUIRED` com `mfa_setup_token` e só conclui após a confirmação do código TOTP
