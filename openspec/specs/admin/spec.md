# Spec: admin

> Auto-extracted by spec-miner. Last mined: 2026-09-19.
> Source: apps/api/Modules/Admin (Http/Controllers/{Tenant,UserAdmin,ClientUser,ClientAccess,Access,Analyst,Module,ModuleCatalog,ModuleOrgUnit,Menu,Mfa,Auth,Oidc,AiSettings,SaasContract,SaasBilling,Monitoring,Audit,Hierarchy}Controller, Http/Requests/*, Http/Middleware/EnsureMfa, Models/{Module,MenuGroup,MenuItem,SaasContract,SaasInvoice,AiSettings}, Policies/*, Services/MenuService, Providers/AdminServiceProvider, Routes/{api,client-api}.php, Database/Migrations, Tests/Feature/*), apps/api/app/Services/{UserService,TenantProvisionService}
> Last verified: 2026-09-19 (commit 2bd3aae)

Escopo: Administração central da plataforma SYSGOV. Cobre provisionamento e ciclo de vida de
tenants (incluindo MRR e catálogo de módulos), identidade e acesso (usuários SYSTRAT, usuários
do tenant, convites, reset de senha, MFA/TOTP, SSO OIDC), a matriz de acessos por módulo ×
secretaria com delegação a administradores de módulo, carteira de analistas de suporte,
navegação server-side, hierarquia administrativa, contratos/faturas SaaS, configuração única de
IA da plataforma, monitoramento e a trilha de auditoria encadeada.

---

### Requirement: Provisionamento de tenant vincula módulos, calcula MRR e semeia o organograma
<!-- id: TenantProvisionService.provision -->
<!-- entities: Tenant, Module, OrgUnit, OutboxEvent, AuditLog -->
<!-- triggers: Habilitar um módulo para o tenant provisiona as roles do módulo -->
<!-- enforced: TenantProvisionService.provision() -->

A criação de tenant SHALL rodar em transação única, exigir `slug` único (`alpha_dash`) e `cnpj`
único de 14 dígitos quando informado, vincular os módulos escolhidos com `enabled = true` e
`monthly_fee_cents = 0` (indicando uso do preço base do catálogo), auditar `tenant.provisioned`
e publicar `tenant.provisioned` no Outbox. O módulo `dashboard` SHALL ser sempre incluído, mesmo
que não selecionado. Quando o tipo é `prefeitura` ou o módulo `org` foi liberado, a estrutura
municipal padrão do organograma SHALL ser semeada, e uma falha nessa semeadura é reportada sem
abortar o provisionamento. Somente `is_platform_admin` ou portador de `admin_ops` pode provisionar.

#### Scenario: provisionamento completo
<!-- test: TenantProvisionTest.test_provision_creates_tenant_with_modules_and_mrr() -->
- **WHEN** `POST /api/admin/tenants` recebe `modules = [org, contracts, users]` com domínio customizado habilitado
- **THEN** responde HTTP 201, o tenant fica com os aliases `[contracts, dashboard, org, users]`, `monthlyMrrCents()` soma base + módulos + taxa de domínio, e 3 `OrgUnit` são criadas (incluindo a raiz `GAB`)

#### Scenario: slug duplicado
<!-- test: TenantProvisionTest.test_provision_rejects_duplicate_slug() -->
- **WHEN** um segundo tenant é criado com `slug` já existente
- **THEN** responde HTTP 422 e nada é persistido

#### Scenario: usuário comum tenta provisionar
<!-- test: AuthorizationTest.test_regular_user_with_valid_token_cannot_create_tenant() -->
- **WHEN** um usuário sem `is_platform_admin` nem `admin_ops` chama o endpoint
- **THEN** a autorização é negada pelo `StoreTenantRequest.authorize()` / `TenantPolicy.create()`

---

### Requirement: Edição e suspensão de tenant nunca removem o módulo dashboard
<!-- id: TenantController.update -->
<!-- entities: Tenant, Module, AuditLog -->
<!-- depends_on: Provisionamento de tenant vincula módulos, calcula MRR e semeia o organograma -->
<!-- enforced: TenantController.update() -->

A atualização de tenant com lista de módulos SHALL sincronizar o pivô `tenant_module`
reinjetando `dashboard` quando ausente — sem isso o `sync()` removeria o módulo base e tornaria
o Painel do Cliente inacessível. A mudança de status SHALL aceitar apenas `active`, `suspended`
ou `trial`, com motivo opcional de até 500 caracteres. Ambas as operações são auditadas
(`updated`, `status_changed`) com estado anterior e posterior.

#### Scenario: edição de módulos sem dashboard na lista
- **WHEN** `update()` recebe `modules` sem o alias `dashboard`
- **THEN** `dashboard` é adicionado à lista antes do `sync()` e permanece habilitado

#### Scenario: suspensão de tenant
<!-- test: TenantManagementTest.test_admin_can_toggle_tenant_status() -->
- **WHEN** `PATCH /api/admin/tenants/{tenant}/status` recebe `status = suspended`
- **THEN** o tenant é atualizado e um `audit_logs` com ação `status_changed` registra o motivo

#### Scenario: status fora do domínio
- **WHEN** o status informado não é `active`, `suspended` nem `trial`
- **THEN** a validação falha com HTTP 422

---

### Requirement: Exclusão de tenant é auditada e propagada por Outbox
<!-- id: TenantController.destroy -->
<!-- entities: Tenant, OutboxEvent, AuditLog -->
<!-- enforced: TenantController.destroy() -->

A exclusão SHALL ser restrita a `is_platform_admin`, gravar o snapshot completo do tenant em
auditoria (`deleted`) e publicar `tenant.deleted` no Outbox com `tenant_id = null` no evento
(a FK é `SET NULL` após a exclusão), respondendo HTTP 204.

#### Scenario: exclusão por administrador da plataforma
- **WHEN** `DELETE /api/admin/tenants/{tenant}` é chamado por `is_platform_admin`
- **THEN** responde HTTP 204, o snapshot vai para `audit_logs` e um `outbox_events` do tipo `tenant.deleted` fica pendente

#### Scenario: exclusão por não administrador
- **WHEN** o ator não é `is_platform_admin`
- **THEN** `TenantPolicy.delete()` nega a ação

---

### Requirement: Consulta de CNPJ apenas autopreenche o formulário de provisionamento
<!-- id: TenantController.lookupCnpj -->
<!-- entities: Tenant -->
<!-- enforced: TenantController.lookupCnpj() -->

O endpoint SHALL exigir a mesma autorização de criação de tenant (`TenantPolicy.create()`) e
SHALL responder HTTP 404 com mensagem própria quando o CNPJ for inválido ou não localizado na
base pública, sem persistir nada.

#### Scenario: CNPJ com formato inválido
<!-- test: TenantProvisionTest.test_cnpj_lookup_invalid_format_returns_404() -->
- **WHEN** `GET /api/admin/cnpj/123` é chamado
- **THEN** responde HTTP 404 "CNPJ inválido ou não encontrado na base pública."

---

### Requirement: Analista de suporte enxerga apenas os tenants da sua carteira
<!-- id: TenantController.index -->
<!-- entities: Tenant, TenantAnalyst, User -->
<!-- enforced: TenantController.index() -->

A listagem e o detalhe de tenants SHALL, para usuário com papel de analista de suporte que não
seja `is_platform_admin`, ser restringidos aos vínculos ativos em `tenant_analyst`
(`expires_at` nulo ou futuro). O acesso direto a um tenant fora da carteira SHALL responder
HTTP 403, mesmo que a policy de visualização permita.

#### Scenario: listagem pelo analista
<!-- test: AnalystSupportTest.test_analyst_wallet_only_shows_assigned_tenants() -->
- **WHEN** um analista lista `/api/admin/tenants`
- **THEN** apenas os tenants atribuídos a ele aparecem

#### Scenario: vínculo expirado
<!-- test: AnalystSupportTest.test_expired_assignment_is_excluded_from_wallet() -->
- **WHEN** o vínculo `tenant_analyst.expires_at` está no passado
- **THEN** o tenant some da carteira e de `GET /api/admin/analysts/my/tenants`

#### Scenario: acesso direto a tenant fora da carteira
- **WHEN** o analista chama `GET /api/admin/tenants/{tenant}` de um tenant não atribuído
- **THEN** aborta com HTTP 403 "Este cliente não está liberado para o seu acesso."

---

### Requirement: Carteira de analistas é gerenciada e auditada
<!-- id: AnalystController.assign -->
<!-- entities: User, TenantAnalyst, Role, Tenant, AuditLog -->
<!-- enforced: AnalystController.assign() -->

A criação de analista SHALL atribuir a role `support_analyst` de escopo `systrat`, marcar
`is_systrat = true` e exigir senha forte. A atribuição de tenant SHALL ser idempotente
(`updateOrCreate` por user + tenant), com `can_read` padrão `true`, `can_write` padrão `false`
e `expires_at` opcional no futuro. Criação, atribuição e revogação SHALL gerar auditoria
(`analyst.created`, `analyst.tenant_assigned`, `analyst.tenant_revoked`).

#### Scenario: criação de analista
<!-- test: AnalystSupportTest.test_create_analyst_assigns_support_role() -->
- **WHEN** `POST /api/admin/analysts` é chamado com nome, e-mail e senha confirmada
- **THEN** o usuário é criado com a role `support_analyst` e responde HTTP 201

#### Scenario: reatribuição do mesmo tenant
- **WHEN** `assign()` roda de novo para o mesmo par (analista, tenant)
- **THEN** o vínculo existente é atualizado, sem duplicata

#### Scenario: revogação
<!-- test: AnalystSupportTest.test_revoke_removes_tenant_from_wallet() -->
- **WHEN** `DELETE /api/admin/analysts/{analyst}/tenants/{tenant}` é chamado
- **THEN** o vínculo é removido, a auditoria é gravada e responde HTTP 204

---

### Requirement: Usuários SYSTRAT exigem senha forte e role de escopo systrat
<!-- id: UserService.createSystratUser -->
<!-- entities: User, Role, AuditLog, OutboxEvent -->
<!-- enforced: UserService.createSystratUser() -->

A criação de usuário SYSTRAT SHALL exigir e-mail único, senha com mínimo de 8 caracteres
contendo maiúscula, minúscula, dígito e símbolo, e `role_slug` existente com `scope = systrat`.
A operação audita `user.created` e publica `UserCreated` no Outbox. Perfis somente-leitura
(`suporte`) podem listar, mas não criar, desativar nem criar roles.

#### Scenario: criação válida
<!-- test: UserManagementFlowTest.test_super_admin_can_list_and_create_systrat_user() -->
- **WHEN** um super admin cria um usuário SYSTRAT com dados válidos
- **THEN** responde HTTP 201 e um `audit_logs` com ação `user.created` e módulo `admin` é gravado

#### Scenario: role de escopo tenant informada
- **WHEN** `role_slug` não existe com `scope = systrat`
- **THEN** a validação falha com "A role selecionada não existe ou não é do escopo SYSTRAT."

#### Scenario: perfil de suporte tenta escrever
<!-- test: SupportReadOnlyTest.test_support_cannot_create_user() -->
- **WHEN** o usuário com role `suporte` chama `POST /api/admin/users`
- **THEN** responde HTTP 403; `GET /api/admin/users` continua respondendo HTTP 200

---

### Requirement: O último super admin ativo não pode ser desativado nem excluído
<!-- id: UserService.deactivateGlobal -->
<!-- entities: User, AuditLog, OutboxEvent -->
<!-- enforced: UserService.deactivateGlobal() -->

A desativação global e a exclusão de um usuário `is_platform_admin` SHALL ser rejeitadas quando
não existir outro administrador de plataforma ativo (RN-USR-006), lançando `ValidationException`
na chave `user`. A desativação exige motivo entre 10 e 500 caracteres e audita
`user.deactivated` publicando `UserDeactivated` no Outbox.

#### Scenario: desativação do último super admin
<!-- test: LastSuperAdminProtectionTest.test_cannot_deactivate_last_super_admin() -->
- **WHEN** `deactivate()` é chamado para o único `is_platform_admin` ativo
- **THEN** lança `ValidationException` com erro na chave `user` e o usuário permanece `is_active = true`

#### Scenario: desativação via HTTP
<!-- test: LastSuperAdminProtectionTest.test_http_deactivation_of_last_super_admin_returns_422() -->
- **WHEN** `POST /api/admin/users/{user}/deactivate` alveja o último super admin
- **THEN** responde HTTP 422

#### Scenario: existe outro super admin ativo
<!-- test: LastSuperAdminProtectionTest.test_can_deactivate_super_admin_when_another_is_active() -->
- **WHEN** há um segundo `is_platform_admin` ativo
- **THEN** a desativação conclui e `is_active` passa a `false`

#### Scenario: motivo muito curto
- **WHEN** `reason` tem menos de 10 caracteres
- **THEN** `DeactivateUserRequest` falha com "O motivo deve ter no mínimo 10 caracteres."

---

### Requirement: Administrador não age sobre a própria conta
<!-- id: UserAdminController.destroy -->
<!-- entities: User -->
<!-- enforced: UserAdminController.destroy() -->

A exclusão e a desativação SHALL abortar com HTTP 403 quando o alvo for o próprio usuário
autenticado, antes mesmo da policy. `UserAdminPolicy.delete()` e `UserAdminPolicy.deactivate()`
também negam auto-alvo independentemente de `is_platform_admin` ou permissão.

#### Scenario: auto-exclusão
<!-- test: AuthorizationTest.test_admin_cannot_suspend_or_delete_itself() -->
- **WHEN** o administrador chama `DELETE /api/admin/users/{ele mesmo}`
- **THEN** aborta com HTTP 403 "Não é possível excluir a própria conta de administrador."

#### Scenario: auto-desativação
- **WHEN** o administrador chama `POST /api/admin/users/{ele mesmo}/deactivate`
- **THEN** aborta com HTTP 403 "Não é possível desativar a própria conta de administrador."

---

### Requirement: Onboarding do administrador do tenant é idempotente
<!-- id: UserAdminController.createTenantAdmin -->
<!-- entities: User, Tenant, Role, AuditLog, OutboxEvent -->
<!-- enforced: UserAdminController.createTenantAdmin() -->

A criação do administrador do tenant (RN-USR-011) SHALL verificar previamente a existência de um
usuário com vínculo `active` no tenant e role `admin_tenant`; havendo um, responde HTTP 409 com o
administrador existente, sem criar duplicata. A criação válida audita `tenant_admin.created` e
publica `TenantAdminCreated` no Outbox. A atualização do administrador SHALL responder HTTP 404
quando ainda não existir administrador ativo, e SHALL ignorar `password` enviado vazio.

#### Scenario: primeiro administrador do tenant
<!-- test: UserManagementFlowTest.test_onboarding_creates_tenant_admin_with_admin_tenant_role() -->
- **WHEN** `POST /api/admin/tenants/{tenant}/users/admin` roda em tenant sem administrador
- **THEN** responde HTTP 201 com a role `admin_tenant` atribuída e grava `tenant_admin.created`

#### Scenario: segundo onboarding no mesmo tenant
- **WHEN** já existe administrador ativo com role `admin_tenant`
- **THEN** responde HTTP 409 "Este tenant já possui um administrador ativo."

#### Scenario: atualização sem administrador existente
- **WHEN** `PUT /api/admin/tenants/{tenant}/users/admin` roda em tenant sem administrador ativo
- **THEN** responde HTTP 404 orientando o uso do onboarding

#### Scenario: senha em branco na atualização
- **WHEN** `password` chega como string vazia
- **THEN** o campo é descartado e a senha atual é preservada

---

### Requirement: Painel SYSTRAT sobre usuários de tenant é somente leitura com desativação de emergência
<!-- id: UserAdminController.listTenantUsers -->
<!-- entities: User, Tenant, AuditLog -->
<!-- enforced: UserAdminController.listTenantUsers() -->

O Admin SYSTRAT SHALL poder listar e detalhar usuários de um tenant, mas não criar nem editar;
a única escrita permitida é a desativação de emergência do vínculo, que exige motivo e audita
`tenant_user.deactivated` alterando apenas `tenant_user.status` para `inactive`.

#### Scenario: leitura pelo suporte
<!-- test: SupportReadOnlyTest.test_support_can_view_tenant_users() -->
- **WHEN** `GET /api/admin/tenants/{tenant}/users` é chamado por perfil de suporte
- **THEN** responde HTTP 200

#### Scenario: tentativa de CRUD além da leitura
<!-- test: UserManagementFlowTest.test_admin_cannot_crud_tenant_users_beyond_readonly() -->
- **WHEN** o Admin SYSTRAT tenta criar ou editar um usuário de tenant por essas rotas
- **THEN** a operação não existe/é negada — apenas leitura e desativação são expostas

#### Scenario: desativação de emergência
- **WHEN** `POST /api/admin/tenants/{tenant}/users/{user}/deactivate` recebe motivo válido
- **THEN** o vínculo passa a `inactive` e a auditoria `tenant_user.deactivated` é gravada

---

### Requirement: Convite por token tem ciclo de vida único
<!-- id: AuthController.acceptInvitation -->
<!-- entities: UserInvitation, User, Tenant, OutboxEvent -->
<!-- enforced: AuthController.acceptInvitation() -->

O aceite de convite (RN-USR-004) SHALL consumir o token uma única vez: token inválido responde
HTTP 422, expirado responde HTTP 410 e já aceito responde HTTP 409. Quando o convite carrega um
tenant, o aceite SHALL vincular o usuário criado a esse tenant. O token trafega para o
destinatário via evento `UserInvited` no Outbox, nunca por chamada de e-mail síncrona.

#### Scenario: aceite e reaceite
<!-- test: InvitationLifecycleTest.test_invitation_lifecycle_accept_works_and_second_accept_returns_409() -->
- **WHEN** o mesmo token é enviado duas vezes
- **THEN** a primeira responde HTTP 200 e a segunda HTTP 409

#### Scenario: convite expirado
<!-- test: InvitationLifecycleTest.test_expired_invitation_returns_410() -->
- **WHEN** `expires_at` está no passado
- **THEN** responde HTTP 410

#### Scenario: token inexistente
<!-- test: InvitationLifecycleTest.test_invalid_token_returns_422() -->
- **WHEN** um token arbitrário é enviado
- **THEN** responde HTTP 422

#### Scenario: convite com tenant
<!-- test: InvitationLifecycleTest.test_accept_links_user_to_tenant_when_invitation_has_tenant() -->
- **WHEN** o convite referencia um tenant e uma role de tenant
- **THEN** o usuário aceito fica vinculado a esse tenant e o registro do convite é preservado

---

### Requirement: Reset de senha não vaza existência de e-mail e o token é de uso único
<!-- id: AuthController.forgotPassword -->
<!-- entities: User, OutboxEvent, AuditLog -->
<!-- enforced: UserService.requestPasswordReset() -->

A solicitação SHALL responder sempre a mesma mensagem, exista ou não o e-mail (RN-USR-009). O
token é entregue via evento `PasswordResetRequested` no Outbox (RN-USR-010) e armazenado hasheado
em `password_reset_tokens`. A redefinição SHALL exigir senha confirmada com mínimo 8 caracteres,
maiúsculas/minúsculas, números e símbolos, SHALL rejeitar token expirado ou já usado com HTTP 422,
e SHALL marcar `used_at` e auditar `password.reset`.

#### Scenario: fluxo completo
<!-- test: PasswordResetTest.test_forgot_password_generates_token_and_resets() -->
- **WHEN** o usuário solicita e depois redefine com o token do Outbox
- **THEN** responde HTTP 200 nas duas etapas e o hash da senha nova passa a valer

#### Scenario: token expirado
<!-- test: PasswordResetTest.test_expired_token_is_rejected() -->
- **WHEN** `expires_at` do token já passou
- **THEN** responde HTTP 422

#### Scenario: reuso do token
<!-- test: PasswordResetTest.test_token_cannot_be_reused() -->
- **WHEN** o mesmo token é usado uma segunda vez
- **THEN** responde HTTP 422

#### Scenario: e-mail inexistente
- **WHEN** `forgotPassword()` recebe e-mail não cadastrado
- **THEN** responde HTTP 200 com a mensagem genérica, sem criar token

---

### Requirement: MFA/TOTP é obrigatório para papéis privilegiados
<!-- id: EnsureMfa.handle -->
<!-- entities: User -->
<!-- enforced: EnsureMfa.handle() -->

O gate `mfa` SHALL responder HTTP 401 sem usuário autenticado e HTTP 403 com
`error_code = MFA_REQUIRED` quando `requiresMfa()` for verdadeiro e o usuário não tiver
`mfa_enabled` com `mfa_confirmed_at` (RN-USR-005). As rotas de setup do próprio MFA
(`api/admin/me/mfa*`) e as de autenticação (`api/admin/auth/*`) SHALL ficar fora do bloqueio,
sob pena de deadlock no bootstrap. Nos ambientes `testing` e `local` o TOTP não é exigido.

#### Scenario: login de papel privilegiado sem MFA configurado
<!-- test: MfaRequirementTest.test_login_without_mfa_configured_is_blocked_for_privileged_role() -->
- **WHEN** um `is_platform_admin` sem MFA tenta autenticar
- **THEN** responde HTTP 403 com `error_code = MFA_REQUIRED`

#### Scenario: login sem informar o código
<!-- test: MfaRequirementTest.test_login_requires_mfa_code_when_configured() -->
- **WHEN** o MFA já está confirmado e o login não envia `mfa_code`
- **THEN** responde HTTP 422 com `error_code = MFA_CODE_REQUIRED`

#### Scenario: login com código válido
<!-- test: MfaRequirementTest.test_login_succeeds_with_valid_mfa_code() -->
- **WHEN** o `mfa_code` TOTP corrente é enviado
- **THEN** responde HTTP 200 com `token`, `user` e `tenant`

#### Scenario: usuário comum
<!-- test: MfaRequirementTest.test_regular_user_login_is_not_blocked_by_mfa() -->
- **WHEN** um usuário sem papel privilegiado autentica com `tenant_slug`
- **THEN** o login conclui sem exigir MFA

---

### Requirement: Setup de MFA é self-service e a desativação exige a senha
<!-- id: MfaController.setup -->
<!-- entities: User -->
<!-- enforced: MfaController.setup() -->

`setup()` SHALL responder HTTP 409 se o MFA já estiver ativo e confirmado, e caso contrário
devolver `secret`, `otpauth_url` e `qr_code_url`. `confirm()` SHALL exigir código de exatamente
6 caracteres e falhar com `ValidationException` na chave `code` quando inválido. `disable()`
SHALL exigir a senha atual e falhar na chave `password` quando incorreta.

#### Scenario: setup com MFA já ativo
- **WHEN** o usuário tem `mfa_enabled` e `mfa_confirmed_at` preenchidos
- **THEN** responde HTTP 409 "MFA já está ativo para este usuário."

#### Scenario: código de confirmação inválido
- **WHEN** `confirm()` recebe um TOTP que não valida
- **THEN** lança `ValidationException` "Código MFA inválido. Verifique e tente novamente."

#### Scenario: desativação com senha errada
- **WHEN** `disable()` recebe senha incorreta
- **THEN** lança `ValidationException` "Senha incorreta." e o MFA permanece ativo

---

### Requirement: SSO OIDC por tenant usa PKCE e nunca cria usuário automaticamente
<!-- id: OidcController.callback -->
<!-- entities: Tenant, User, AuditLog -->
<!-- enforced: OidcController.callback() -->

O redirect SHALL abortar com HTTP 422 quando o tenant não tiver `settings.oidc` completo
(issuer, client_id, client_secret) e com HTTP 502 quando o discovery não expuser os endpoints
necessários. O estado do fluxo (tenant, `code_verifier`, `redirect_uri`) SHALL viver em cache por
600 segundos e ser consumido uma única vez (`Cache::pull`). No callback, o usuário SHALL ser
localizado por e-mail entre os vínculos `active` do tenant; não havendo correspondência, responde
HTTP 409 com `error_code = OIDC_USER_NOT_LINKED` (RN-USR-008) — nenhum usuário é criado. O login
bem-sucedido audita `oidc.login` e emite token Sanctum.

#### Scenario: tenant sem configuração OIDC
- **WHEN** `GET /api/admin/oidc/redirect/{tenant}` é chamado sem `settings.oidc` completo
- **THEN** aborta com HTTP 422 "SSO OpenID Connect não configurado para este tenant."

#### Scenario: state expirado ou reutilizado
- **WHEN** o `state` não está mais em cache
- **THEN** aborta com HTTP 422 "Estado do fluxo OIDC inválido ou expirado."

#### Scenario: e-mail do IdP sem vínculo no tenant
- **WHEN** o `userinfo` retorna um e-mail sem usuário ativo naquele tenant
- **THEN** responde HTTP 409 com `error_code = OIDC_USER_NOT_LINKED`

---

### Requirement: CRUD de usuários do tenant no Painel do Cliente é anti-BOLA
<!-- id: ClientUserController.assertCan -->
<!-- entities: User, Tenant, Role, AuditLog -->
<!-- enforced: ClientUserController.assertCan() -->

Todas as ações do Fluxo B SHALL passar pela `TenantUserPolicy`: sem papel de gestor
(`is_platform_admin` ou `admin_tenant`) responde HTTP 403; sendo gestor mas com alvo fora do
tenant ativo responde HTTP 404 — deliberadamente, para não vazar a existência do registro. O
tenant vem sempre do `TenantContext`, nunca do payload. A exclusão SHALL apenas desvincular o
usuário do tenant (`user.unlinked`), nunca apagar a conta global. Desativação exige motivo com
no mínimo 10 caracteres.

#### Scenario: membro comum tenta gerenciar
<!-- test: ClientTenantUsersTest.test_regular_member_cannot_manage_users() -->
- **WHEN** um usuário sem `admin_tenant` chama as rotas `/api/users`
- **THEN** responde HTTP 403

#### Scenario: gestor alveja usuário de outro tenant
<!-- test: ClientTenantUsersTest.test_admin_cannot_access_user_from_other_tenant() -->
- **WHEN** o `admin_tenant` do tenant A referencia um usuário do tenant B
- **THEN** responde HTTP 404 "Usuário não encontrado neste tenant."

#### Scenario: remoção de vínculo
<!-- test: ClientTenantUsersTest.test_admin_can_unlink_user_from_tenant() -->
- **WHEN** `DELETE /api/users/{user}` é chamado pelo gestor do tenant
- **THEN** o vínculo e as roles são desanexados, o cache de permissões é limpo e a conta global permanece

---

### Requirement: Role de tenant é materializada a partir do template SYSTRAT
<!-- id: ClientUserController.resolveTenantRole -->
<!-- entities: Role, User, Tenant, Permission -->
<!-- enforced: ClientUserController.resolveTenantRole() -->

Ao atribuir uma role por slug, o sistema SHALL procurar primeiro a role com aquele slug,
`scope = tenant` e `tenant_id` do tenant ativo; não existindo, SHALL clonar o template de escopo
tenant copiando suas permissões, criando uma role própria do tenant. Slug sem template válido
SHALL abortar com HTTP 422. O vínculo SHALL registrar `role_user.tenant_id` (quando a coluna
existe) e atualizar `tenant_user.role_id`, limpando o cache de permissões.

#### Scenario: primeira atribuição do slug no tenant
<!-- test: ClientTenantUsersTest.test_admin_tenant_can_create_tenant_user_with_tenant_role() -->
- **WHEN** o tenant ainda não possui a role do slug informado
- **THEN** uma nova `Role` com `tenant_id` do tenant é criada com as permissões do template

#### Scenario: slug sem template de tenant
- **WHEN** o slug não existe com `scope = tenant`
- **THEN** aborta com HTTP 422 "A role '{slug}' não é uma role de tenant válida."

---

### Requirement: Usuários do tenant são criados com matriz de acesso por módulo e secretaria
<!-- id: ClientAccessController.store -->
<!-- entities: User, UserModuleAccess, AccessGroup, Cargo, OrgUnit, TenantSecuritySetting, AuditLog -->
<!-- triggers: Administrador de módulo só concede o que ele próprio possui -->
<!-- enforced: ClientAccessController.store() -->

A criação SHALL rodar em transação, exigir e-mail único, aceitar no máximo 30 entradas em
`accesses` com `role` em (`member`, `manager`, `admin`, `editor`, `viewer`), vincular o usuário ao
tenant com a role base `membro` e gravar a matriz em `user_module_access`. `all_org_units = true`
SHALL ser persistido como `org_unit_ids = null` (irrestrito). Senha omitida SHALL usar a senha
padrão do tenant, gerando-a com 12 caracteres aleatórios quando ainda não definida. A atualização
SHALL substituir integralmente a matriz do usuário naquele tenant. Ambas auditam
(`access.user_created`, `access.user_updated`) e invalidam o cache de listagem.

#### Scenario: criação com dois módulos e escopos diferentes
<!-- test: ClientAccessTest.test_global_admin_creates_user_with_module_org_unit_access() -->
- **WHEN** o admin geral cria usuário com `procurement` restrito a uma unidade e `contracts` irrestrito
- **THEN** responde HTTP 201 com 2 acessos e `user_module_access` registra `can_manage_users` conforme enviado

#### Scenario: usuário alvo fora do tenant ativo
- **WHEN** `update()` ou `resetPassword()` referenciam usuário sem vínculo no tenant ativo
- **THEN** aborta com HTTP 404 "Usuário não encontrado neste tenant."

#### Scenario: administrador de módulo lista usuários
<!-- test: ClientAccessTest.test_module_manager_sees_only_users_sharing_their_modules() -->
- **WHEN** um não-admin-geral lista `/api/access/users`
- **THEN** só aparecem usuários que compartilham ao menos um módulo que ele administra; sem módulos administrados, a lista é vazia

---

### Requirement: Administrador de módulo só concede o que ele próprio possui
<!-- id: ClientAccessController.assertCanProvision -->
<!-- entities: User, UserModuleAccess, OrgUnit -->
<!-- enforced: ClientAccessController.assertCanProvision() -->

A delegação (RN-ACC-002) SHALL liberar tudo para o admin geral (`is_platform_admin`, analista de
suporte ou `admin_tenant`) e, para os demais, SHALL exigir que cada módulo concedido esteja entre
os que o ator administra (`can_manage_users = true`) e que o escopo concedido esteja contido no
escopo do ator. Conceder `all_org_units` com escopo próprio restrito SHALL ser negado. As mesmas
regras valem em `AccessController.grant/revoke` via `ModuleAccessService.canGrantTo()`.

#### Scenario: módulo fora da alçada
<!-- test: ClientAccessTest.test_module_admin_can_only_create_users_in_managed_modules() -->
- **WHEN** um administrador de `procurement` tenta conceder `finance`
- **THEN** aborta com HTTP 403 "Você não administra o módulo finance..."

#### Scenario: secretaria fora do escopo
<!-- test: ClientAccessTest.test_module_admin_cannot_grant_scope_outside_own() -->
- **WHEN** o escopo concedido inclui unidade que não está no escopo do ator
- **THEN** aborta com HTTP 403 "Não é possível conceder acesso a secretarias fora do seu escopo."

#### Scenario: tentativa de conceder acesso irrestrito
- **WHEN** o ator tem escopo restrito e envia `all_org_units = true`
- **THEN** aborta com HTTP 403 "Não é possível conceder acesso a todas as secretarias (seu escopo é restrito)."

#### Scenario: verificação no serviço de acesso
<!-- test: AccessEvolutionTest.test_module_admin_cannot_grant_outside_his_scope() -->
- **WHEN** `canGrantTo()` é consultado para módulo não administrado ou unidade fora do escopo
- **THEN** retorna `false`; dentro do escopo e do módulo administrado retorna `true`

---

### Requirement: Analista com acesso somente-leitura não escreve no tenant
<!-- id: ClientAccessController.assertCanWrite -->
<!-- entities: User, TenantAnalyst -->
<!-- enforced: ClientAccessController.assertCanWrite() -->

Criação, edição e reset de senha no gerenciador de acessos SHALL abortar com HTTP 403 quando o
ator não for `is_platform_admin` nem `admin_tenant` e possuir vínculo `tenant_analyst` com
`can_write = false` naquele tenant.

#### Scenario: analista somente-leitura tenta criar usuário
- **WHEN** o ator tem `tenant_analyst.can_write = false` no tenant ativo
- **THEN** aborta com HTTP 403 "Seu acesso é somente leitura neste tenant..."

---

### Requirement: Senha padrão do sistema é por tenant e restrita ao administrador geral
<!-- id: ClientAccessController.setDefaultPassword -->
<!-- entities: TenantSecuritySetting, User, AuditLog -->
<!-- enforced: ClientAccessController.setDefaultPassword() -->

A definição da senha padrão SHALL ser permitida apenas a `is_platform_admin`, analista de suporte
ou `admin_tenant`, exigir senha confirmada e forte, gravar o hash em `TenantSecuritySetting` com
`updated_by` e `default_password_set_at`, e auditar `security.default_password_set`. A consulta
SHALL devolver apenas se está definida, por quem e quando — nunca o hash.

#### Scenario: consulta da senha padrão
- **WHEN** `GET /api/access/security/default-password` é chamado
- **THEN** responde `set`, `updated_by` e `updated_at`, sem qualquer material de senha

#### Scenario: ator sem papel de administrador geral
- **WHEN** `PUT /api/access/security/default-password` é chamado por usuário sem esses papéis
- **THEN** aborta com HTTP 403

---

### Requirement: Acesso a módulo tem vigência, revogação lógica e renovação
<!-- id: AccessController.grant -->
<!-- entities: UserModuleAccess, User, OrgUnit, AuditLog, OutboxEvent -->
<!-- enforced: AccessController.grant() -->

A concessão SHALL exigir `user_id` existente, `module_alias` e `valid_to` (quando informado) no
futuro, passando por `canGrantTo()` antes de gravar, e auditar `access.granted`. A revogação
SHALL ser lógica — o registro passa a `status = revoked` preservando o histórico — e auditar
`access.revoked`. A renovação SHALL reativar um acesso revogado com nova `valid_to`. Revogar ou
renovar acesso de outro tenant SHALL responder HTTP 404. O painel de expiração SHALL listar
acessos ativos com `valid_to` entre agora e 30 dias.

#### Scenario: acesso vencido não concede
<!-- test: AccessEvolutionTest.test_access_expired_does_not_grant_access() -->
- **WHEN** `valid_to` já passou
- **THEN** `isActive()` e `hasModuleAccess()` retornam `false`

#### Scenario: acesso vigente perto do vencimento
<!-- test: AccessEvolutionTest.test_access_with_valid_validity_grants_access_and_reports_expiring() -->
- **WHEN** `valid_to` está a 15 dias
- **THEN** o acesso é ativo, `isExpiring(30)` é `true` e aparece em `GET /api/access/expiring`

#### Scenario: revogação preserva histórico
<!-- test: AccessEvolutionTest.test_revoke_is_logical_and_preserves_history() -->
- **WHEN** `revokeAccess()` roda
- **THEN** o registro continua existindo com `status = revoked` e não concede mais acesso

#### Scenario: renovação de acesso revogado
<!-- test: AccessEvolutionTest.test_renew_reactivates_revoked_access() -->
- **WHEN** `renewAccess()` recebe nova `valid_to` futura
- **THEN** o acesso volta a ser ativo

#### Scenario: acesso de outro tenant
- **WHEN** `revoke()` ou `renew()` recebem um `UserModuleAccess` cujo `tenant_id` difere do `TenantContext`
- **THEN** aborta com HTTP 404 "Acesso não encontrado neste tenant."

#### Scenario: expiração automática
<!-- test: AccessEvolutionTest.test_expire_access_job_marks_expired_and_publishes_outbox() -->
- **WHEN** o comando `sysgov:expire-access` roda com acessos vencidos
- **THEN** o status vira `expired` e um evento `notification.access_expired` é publicado no Outbox

---

### Requirement: Habilitar um módulo para o tenant provisiona as roles do módulo
<!-- id: ModuleController.toggle -->
<!-- entities: Tenant, Module, Role, AuditLog -->
<!-- enforced: ModuleController.toggle() -->

O toggle SHALL ser restrito a `is_platform_admin`, rodar em transação com
`syncWithoutDetaching`, auditar `module.toggled` com pivô anterior e posterior e, quando
habilitado, chamar `ModuleRoleProvisioner.provisionForTenant()` para materializar as
roles/permissões específicas do módulo naquele tenant. O alias `dashboard` SHALL ser forçado a
`enabled = true` independentemente do payload.

#### Scenario: habilitar o módulo capd
<!-- test: ModuleToggleRoleProvisioningTest.test_habilitar_modulo_capd_provisiona_as_5_roles_no_tenant() -->
- **WHEN** `PUT /api/admin/tenants/{tenant}/modules/{module}` envia `enabled = true` para `capd`
- **THEN** responde HTTP 200 e as roles `membro_capd`, `gestor_rh`, `avaliador`, `servidor` e `auditoria_capd` passam a existir com o `tenant_id` do tenant

#### Scenario: desabilitar módulo
<!-- test: ModuleToggleRoleProvisioningTest.test_desabilitar_modulo_nao_provisiona_roles() -->
- **WHEN** `enabled = false` é enviado
- **THEN** nenhuma role do módulo é provisionada

#### Scenario: tentativa de desabilitar o dashboard
- **WHEN** o alias do módulo é `dashboard` e `enabled = false`
- **THEN** o valor efetivo gravado é `true`

---

### Requirement: Provisionamento de módulo em lote é transacional e propagado por Outbox
<!-- id: ModuleController.batchProvision -->
<!-- entities: Tenant, Module, Role, OutboxEvent, AuditLog -->
<!-- enforced: ModuleController.batchProvision() -->

O lote SHALL exigir `is_platform_admin`, ao menos um `tenant_id` existente, `module_alias`
presente no catálogo e `trial_ends_at` posterior a hoje. Cada tenant processado SHALL ser
auditado (`module.batch_provisioned`) e publicar `module.batch_provisioned` no Outbox; tenants
não encontrados entram no resultado com `success = false` sem abortar o lote. Habilitações
disparam o provisionamento de roles do módulo.

#### Scenario: lote com tenant inexistente na carga
- **WHEN** um dos ids não resolve para tenant
- **THEN** o resultado daquele item traz `success = false` e `error = 'Tenant não encontrado'`, e os demais são processados

#### Scenario: alias fora do catálogo
- **WHEN** `module_alias` não existe em `modules`
- **THEN** a validação falha com "O módulo especificado não existe no catálogo."

---

### Requirement: Catálogo de módulos gera permissões e menu padrão
<!-- id: ModuleCatalogController.store -->
<!-- entities: Module, Permission, MenuGroup, MenuItem -->
<!-- enforced: ModuleCatalogController.store() -->

O cadastro/atualização de módulo do catálogo SHALL rodar em transação e sincronizar as quatro
permissões padrão `{alias}.view|create|update|delete` (mescladas com as adicionais informadas),
criando-as com `updateOrCreate` por slug. Quando há metadados de menu, um `MenuGroup` SHALL ser
criado/atualizado pelo slug e associado ao módulo, com um `MenuItem` padrão apontando para o alias
e exigindo `{alias}.view`. O catálogo público SHALL expor apenas módulos com `enabled = true`,
com fallback de ícone `Layers`, rótulo do próprio módulo e ordem 50 quando não houver grupo.

#### Scenario: criação de módulo com menu
- **WHEN** `POST /api/admin/module-catalog` inclui bloco `menu`
- **THEN** responde HTTP 201 com `menuGroup` e `permissions` carregados

#### Scenario: catálogo público
- **WHEN** `GET /api/public/module-catalog/catalog` é chamado
- **THEN** retorna apenas módulos habilitados, com seus slugs de permissão e itens de menu ativos

---

### Requirement: Liberação de módulo por unidade organizacional é hierárquica
<!-- id: ModuleOrgUnitController.set -->
<!-- entities: Tenant, Module, OrgUnit, TenantModuleOrgUnit -->
<!-- enforced: ModuleOrgUnitController.set() -->

A granularidade módulo × unidade SHALL exigir autorização via `ModulePolicy` recebendo o tenant
como argumento (não apenas a rota), aceitar somente o booleano `enabled` e devolver, além do
valor gravado, se ele é `inherited`. A consulta de módulos efetivos de uma unidade SHALL
considerar a herança na árvore.

#### Scenario: definição explícita em uma unidade
- **WHEN** `PUT /api/admin/tenants/{tenant}/modules/{module}/org-units/{orgUnit}` envia `enabled`
- **THEN** responde com `enabled` e `inherited` do registro resultante

#### Scenario: limpeza da definição
- **WHEN** `DELETE` da mesma rota é chamado
- **THEN** a definição explícita é removida e a unidade volta a herdar

---

### Requirement: Navegação é montada no backend e filtrada por permissão
<!-- id: MenuService.buildNavigation -->
<!-- entities: MenuGroup, MenuItem, User, Tenant -->
<!-- enforced: MenuService.buildNavigation() -->

A árvore de navegação SHALL ser construída a partir dos grupos globais (`tenant_id` nulo) e dos
grupos do tenant ativo, ambos com `is_active = true`, ordenados por `order`. Itens com
`permission` SHALL ser omitidos quando o Gate `access` negar para o usuário, e grupos que ficarem
sem itens SHALL ser descartados. Nenhum módulo ou permissão é aceito do cliente — o tenant vem do
`TenantContext`. O badge de um item vem de `config('menu.badges.{alias}')` e só aparece quando o
contador for maior que zero.

#### Scenario: item sem permissão do usuário
- **WHEN** o item define `permission` e o Gate `access` nega
- **THEN** o item é omitido; se for o único do grupo, o grupo também some

#### Scenario: módulo desativado no tenant
<!-- test: NavigationIsolationTest.test_navigation_only_shows_modules_enabled_in_tenant_module() -->
- **WHEN** o alias do item corresponde a módulo com `tenant_module.enabled = false`
- **THEN** o item não aparece na navegação

#### Scenario: tentativa de injetar módulo pelo cliente
<!-- test: NavigationIsolationTest.test_navigation_ignores_fake_module_aliases() -->
- **WHEN** o frontend tenta influenciar a navegação
- **THEN** não há caminho de entrada — a assinatura do serviço só aceita tenant e usuário

---

### Requirement: Nós da hierarquia administrativa são criados sob contexto de tenant explícito
<!-- id: HierarchyController.createNode -->
<!-- entities: Organization, Department, ManagementUnit, BudgetUnit, Tenant, AuditLog -->
<!-- enforced: HierarchyController.createNode() -->

A criação de organização, departamento, unidade gestora e unidade orçamentária SHALL exigir
`is_platform_admin` e `tenant_id` existente, posicionar o `TenantContext` no tenant informado
durante a operação e limpá-lo ao final (bloco `finally`). O nó pai SHALL ser validado dentro
desse contexto: pai ausente ou pertencente a outro tenant aborta com HTTP 422. A criação é
auditada como `hierarchy.created`.

#### Scenario: pai de outro tenant
- **WHEN** `parent_id` não existe sob o `TenantContext` do tenant informado
- **THEN** aborta com HTTP 422 "O nível pai não pertence ao tenant informado."

#### Scenario: criação válida
- **WHEN** nome e código (`alpha_dash`, máx. 30) válidos são enviados com pai correto
- **THEN** responde HTTP 201 e grava a auditoria `hierarchy.created`

---

### Requirement: Contratos e faturas SaaS são exclusivos da plataforma
<!-- id: SaasContractController.store -->
<!-- entities: SaasContract, SaasInvoice, Tenant, AuditLog -->
<!-- enforced: SaasContractController.store() -->

Criar, listar e visualizar contratos SaaS SHALL exigir `is_platform_admin`
(`SaasContractPolicy`), com `ends_at` posterior a `starts_at` e valores `monthly_fee_cents` /
`setup_fee_cents` inteiros não negativos. A liquidação de fatura SHALL exigir `paid_at`,
responder HTTP 409 quando a fatura já estiver `paid` e, quando liquidar, gravar `status = paid`
auditando `invoice.paid`. A criação de contrato audita `contract_created`.

#### Scenario: acesso a contrato de outro tenant
<!-- test: TenantIsolationAndBolaTest.test_user_cannot_access_other_tenant_object_directly_bola_check() -->
- **WHEN** um usuário sem `is_platform_admin` busca um contrato pelo id
- **THEN** responde HTTP 403

#### Scenario: fatura já liquidada
- **WHEN** `PATCH /api/admin/saas-billing/invoices/{invoice}/pay` alveja fatura `paid`
- **THEN** responde HTTP 409 "Invoice já liquidada."

#### Scenario: período inválido
- **WHEN** `ends_at` não é posterior a `starts_at`
- **THEN** a validação falha com HTTP 422

---

### Requirement: Painel de monitoramento consolida saúde da plataforma
<!-- id: MonitoringController.index -->
<!-- entities: Tenant, Module, SaasContract, SaasInvoice, OutboxEvent, AuditLog -->
<!-- enforced: MonitoringController.index() -->

O monitoramento SHALL exigir a mesma autorização de listagem de tenants e reportar contagens de
tenants (ativos e totais), usuários, módulos habilitados, contratos ativos e faturas vencidas,
além do estado do Outbox (`pending`, `processing`, `failed`) e das filas. Tabelas ausentes SHALL
ser tratadas como zero, nunca como erro. O relatório de uso por tenant SHALL agregar usuários,
contratos e eventos de auditoria, limitado aos 50 tenants com mais eventos.

#### Scenario: tabela de filas inexistente
- **WHEN** `jobs` ou `failed_jobs` não existem no schema
- **THEN** os respectivos contadores são `0` e a resposta segue HTTP 200

---

### Requirement: Configuração de IA é única da plataforma e a chave nunca é devolvida em claro
<!-- id: AiSettingsController.update -->
<!-- entities: AiSettings, User, AuditLog -->
<!-- enforced: AiSettingsController.update() -->

`AiSettings` SHALL ser um registro singleton (`id = 1`) criado na primeira leitura com os valores
padrão em memória, compartilhado por todos os tenants. A atualização SHALL ser restrita a
`is_platform_admin`, exigir `enabled`, `provider`, `base_url` (URL), `model` e `max_tokens` entre
64 e 32000, normalizar a barra final da URL, preservar a `api_key` já salva quando o campo vier
vazio, registrar `updated_by` e auditar `ai_settings.update`. A resposta SHALL expor apenas
`apiKeyConfigured` e `apiKeyMasked` com os 4 últimos dígitos. O teste de conexão SHALL usar os
valores do formulário com fallback para os salvos e responder HTTP 422 sem tocar a rede quando
não houver chave alguma.

#### Scenario: primeira leitura
<!-- test: AiSettingsTest.test_show_retorna_valores_padrao_na_primeira_leitura() -->
- **WHEN** `GET /api/admin/ai-settings` é chamado antes de qualquer gravação
- **THEN** retorna os padrões (`enabled = false`, provider `nanogpt`, modelo e `max_tokens` padrão)

#### Scenario: chave mascarada na resposta
<!-- test: AiSettingsTest.test_admin_atualiza_configuracao_e_a_chave_fica_mascarada_na_resposta() -->
- **WHEN** a configuração é atualizada com `api_key`
- **THEN** a resposta traz `apiKeyConfigured = true` e `apiKeyMasked` com os 4 últimos dígitos, nunca a chave

#### Scenario: atualização sem reenviar a chave
<!-- test: AiSettingsTest.test_atualizar_sem_enviar_api_key_mantem_a_chave_ja_salva() -->
- **WHEN** `api_key` vem vazia ou ausente
- **THEN** a chave previamente salva é mantida

#### Scenario: usuário SYSTRAT sem ser administrador da plataforma
<!-- test: AiSettingsTest.test_usuario_systrat_sem_ser_platform_admin_nao_pode_atualizar() -->
- **WHEN** o ator não tem `is_platform_admin`
- **THEN** aborta com HTTP 403

#### Scenario: teste de conexão sem chave
<!-- test: AiSettingsTest.test_teste_de_conexao_sem_chave_nenhuma_retorna_erro_sem_chamar_a_rede() -->
- **WHEN** não há chave no formulário nem salva
- **THEN** responde HTTP 422 "Informe uma chave de API para testar." sem qualquer chamada externa

---

### Invariant: A trilha de auditoria é encadeada por hash e imutável
<!-- entities: AuditLog -->
<!-- enforced: App\Support\AuditLogger.record() -->
<!-- verified_by: AuditChainTest.test_hmac_chain_is_immutable_and_linked() -->

Cada `AuditLog` SHALL carregar um `hash` SHA-256 de 64 caracteres calculado sobre
`tenant_id|user_id|action|resource|before|after|created_at|prev_hash`, com `prev_hash` nulo apenas
no primeiro registro e igual ao `hash` do anterior nos demais. Atualizar ou excluir um registro de
auditoria SHALL lançar `LogicException`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda mutação do Admin é auditada
<!-- entities: Tenant, User, Role, Module, MenuGroup, MenuItem, SaasContract, SaasInvoice, UserModuleAccess, AiSettings, TenantAnalyst, Organization -->
<!-- enforced: App\Support\AuditLogger.record() -->
<!-- verified_by: AuditChainTest.test_admin_actions_generate_audit_logs() -->

Provisionamento, edição, mudança de status e exclusão de tenant, CRUD de usuários SYSTRAT e de
tenant, onboarding, reset de senha, concessão/revogação de acesso, toggle e provisionamento de
módulos, CRUD de menus, contratos/faturas, login OIDC e alteração da configuração de IA SHALL
gravar em `audit_logs` (módulo `admin`, `tenant` ou `access`) com ação nomeada
(`tenant.provisioned`, `status_changed`, `user.created`, `user.deactivated`,
`tenant_admin.created`, `access.granted`, `access.revoked`, `module.toggled`,
`module.batch_provisioned`, `menu_item_updated`, `invoice.paid`, `oidc.login`,
`ai_settings.update`, ...), estado anterior/posterior, usuário, IP e timestamp.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Dados de negócio do Admin são isolados por tenant
<!-- entities: SaasContract, SaasInvoice, Organization, Department, ManagementUnit, BudgetUnit, UserModuleAccess -->
<!-- enforced: App\Models\Concerns\TenantAware -->
<!-- verified_by: TenantIsolationAndBolaTest.test_tenant_aware_model_scopes_queries_to_active_tenant() -->

`SaasContract` e `SaasInvoice` SHALL usar o trait `TenantAware` (global scope de leitura +
preenchimento de `tenant_id` na criação), e `saas_contracts` SHALL ter `unique(tenant_id, number)`
e índice `(tenant_id, status)`. O `tenant_id` é sempre resolvido server-side pelo `TenantContext`
(middleware `ResolveTenant` / `tenant`), nunca aceito do cliente. Nos fluxos do Painel do Cliente
(`UserModuleAccess`, usuários do tenant) o filtro por `tenant_id` do contexto é explícito em toda
consulta e mutação, e acessos de outro tenant respondem 403/404.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: O catálogo da plataforma é global e deliberadamente não multi-tenant
<!-- entities: Module, MenuGroup, MenuItem, AiSettings -->
<!-- enforced: Modules\Admin\Models\Module -->

`Module` e `AiSettings` SHALL ser registros globais da plataforma, sem `TenantAware` e sem
`tenant_id` — a relação com o tenant existe apenas nos pivôs `tenant_module` e
`tenant_module_org_unit`. `MenuGroup`/`MenuItem` possuem `tenant_id` anulável e SHALL ser
filtrados manualmente por `MenuGroup.forTenant()` (grupos globais + grupos do tenant), também sem
global scope.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Roles de escopo tenant nunca vazam entre tenants
<!-- entities: Role, User, Tenant, Permission -->
<!-- enforced: App\Models\User.hasRole() -->
<!-- verified_by: RoleIsolationTest.test_admin_tenant_role_of_tenant_a_does_not_leak_to_tenant_b() -->

Uma role com `scope = tenant` SHALL valer apenas no seu `tenant_id`: `hasRole($slug, $tenantId)`
e `rolesForTenant($tenantId)` filtram por `roles.tenant_id`. Roles com `scope = systrat`
continuam valendo em qualquer tenant. Toda atribuição de role de tenant grava também
`role_user.tenant_id` quando a coluna existe (RN-CORE-001).

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Códigos da hierarquia administrativa são únicos dentro do tenant
<!-- entities: Organization, Department, ManagementUnit, BudgetUnit -->
<!-- enforced: App\Models\Organization -->
<!-- verified_by: HierarchyUniquenessTest.test_same_code_is_allowed_across_tenants_but_unique_within_tenant() -->

O mesmo `code` SHALL poder existir em tenants diferentes, mas SHALL violar restrição de unicidade
(`UniqueConstraintViolationException`) quando repetido dentro do mesmo tenant.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Módulo desabilitado no tenant nunca concede acesso
<!-- entities: Tenant, Module, UserModuleAccess, AccessGroup -->
<!-- enforced: App\Services\AccessService.canAccessModule() -->
<!-- verified_by: AccessUnificationTest.test_disabled_module_blocks_even_with_user_module_access() -->

A decisão de acesso a módulo SHALL ser unificada: papel de administrador geral, `UserModuleAccess`
ativo e vigente, ou grupo de acesso concedem; `tenant_module.enabled = false` bloqueia
incondicionalmente (RN-GRA-005), assim como acesso com `valid_to` no passado ou `status` diferente
de `active`. O frontend ocultar um item de menu nunca é controle de segurança.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: O módulo dashboard permanece sempre habilitado para o tenant
<!-- entities: Tenant, Module -->
<!-- enforced: ModuleController.toggle() -->

O alias `dashboard` SHALL ser forçado a `enabled = true` no provisionamento
(`TenantProvisionService.provision()`), na edição de módulos do tenant (`TenantController.update()`),
no toggle individual e no lote — a rota raiz do Painel do Cliente exige esse módulo, e sua ausência
tornaria o painel inteiro inacessível.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Valores monetários do Admin trafegam apenas em centavos inteiros
<!-- entities: Tenant, Module, SaasContract, SaasInvoice -->
<!-- enforced: App\Models\Tenant.monthlyMrrCents() -->
<!-- verified_by: TenantProvisionTest.test_tenant_show_returns_mrr_and_module_counts() -->

`monthly_fee_cents`, `setup_fee_cents`, `custom_domain_fee_cents` e `amount_cents` SHALL ser
colunas inteiras (`bigInteger`), castadas como `integer`, validadas com `integer|min:0`, e todo
cálculo de MRR SHALL ser aritmética inteira — nunca `float`. O preço efetivo de um módulo é o do
pivô quando maior que zero, caindo para o preço base do catálogo caso contrário.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: A autorização é sempre reavaliada no servidor e escopada ao objeto
<!-- entities: Tenant, User, Role, Module, SaasContract, SaasInvoice, MenuGroup, MenuItem, UserInvitation, Permission -->
<!-- enforced: AdminServiceProvider.boot() -->
<!-- verified_by: AuthorizationTest.test_policies_require_platform_admin() -->

Todo recurso do módulo SHALL ter policy registrada em `AdminServiceProvider.boot()`
(`TenantPolicy`, `UserPolicy`, `UserAdminPolicy`, `RolePolicy`, `PermissionPolicy`,
`InvitationPolicy`, `ModulePolicy`, `SaasContractPolicy`, `SaasInvoicePolicy`, `MenuGroupPolicy`,
`MenuItemPolicy`, `AccessPolicy`, `TenantUserPolicy`) e SHALL ser autorizado contra a instância
alvo, não apenas contra a rota. As rotas administrativas ficam atrás de `platform-admin` + `mfa`;
as do Painel do Cliente atrás de `auth:sanctum` + `tenant`. As poucas rotas públicas são
restritas a self-service de senha, verificação MFA, aceite de convite, SSO OIDC e catálogo público
de módulos.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Segredos do Admin nunca são devolvidos nem persistidos em claro
<!-- entities: AiSettings, TenantSecuritySetting, User, UserInvitation -->
<!-- enforced: Modules\Admin\Models\AiSettings -->
<!-- verified_by: AiSettingsTest.test_admin_atualiza_configuracao_e_a_chave_fica_mascarada_na_resposta() -->

`AiSettings.api_key` SHALL ser castada como `encrypted` (criptografada em repouso, decifrada só em
memória) e exposta apenas mascarada. Senhas SHALL ser sempre hasheadas e exigir mínimo de 8
caracteres com maiúscula, minúscula, número e símbolo em todos os pontos de entrada (criação
SYSTRAT, onboarding, usuários do tenant, analistas, reset, senha padrão do tenant). Tokens de
convite e de reset trafegam apenas pelo Outbox e são guardados hasheados (SHA-256).

> Last verified: 2026-09-19 (commit 2bd3aae)

---

<!-- uncertainty: O módulo Admin usa centavos inteiros em todos os valores monetários, mas não utiliza App\Support\Money em nenhum ponto (nenhuma referência em Modules/Admin). Não foi possível determinar pelo código se isso é intencional (valores de faturamento SaaS fora do domínio fiscal/orçamentário) ou drift em relação à regra do repositório. -->
<!-- uncertainty: Três chamadas externas síncronas partem diretamente de controllers, contrariando a regra geral do Outbox: TenantController.lookupCnpj() -> CnpjService (BrasilAPI), AiSettingsController.testConnection() -> NanoGptClient e OidcController.redirect()/callback() -> Guzzle contra o IdP. Todas são consultas interativas de leitura/autenticação (não PNCP/bancos/Siconfi/TCE), mas o código não documenta a exceção. -->
<!-- uncertainty: menu_groups.slug é UNIQUE global na migration, embora a tabela tenha tenant_id anulável e MenuGroup.forTenant() misture grupos globais e do tenant. Dois tenants não conseguem ter grupos de menu com o mesmo slug; não foi possível confirmar se é intencional. -->
<!-- uncertainty: Existem dois motores de navegação coexistindo — Modules\Admin\Services\MenuService (menu_groups/menu_items, usado por GET /api/admin/navigation) e Modules\Client\Services\ClientNavigationService (client_menu_groups/client_menu_items), sendo que NavigationIsolationTest, que vive em Modules/Admin/Tests, exercita apenas o segundo. O MenuService do Admin não tem teste próprio. -->
<!-- uncertainty: AccessPolicy está implementada com create/revoke/renew, mas AccessController e ClientAccessController não a invocam — usam isGlobalAdmin()/canGrantTo() diretamente (documentado como "padrão consolidado" no próprio arquivo). Não foi possível determinar se a policy está morta ou aguardando migração. -->
<!-- uncertainty: Não existe teste de isolamento tenant A × tenant B nomeado no padrão dos demais módulos para as entidades próprias do Admin. TenantIsolationAndBolaTest cobre SaasContract (scope + BOLA) e AccessEvolutionTest.test_access_is_isolated_between_tenants() cobre UserModuleAccess, mas SaasInvoice, MenuGroup e MenuItem não têm cobertura de isolamento. -->
<!-- uncertainty: ClientAccessController.resolveOrCreateDefaultPassword() guarda a senha padrão recuperável via TenantSecuritySetting.getDefaultPasswordPlain()/setDefaultPasswordPlain(), além do hash. O mecanismo de proteção desse valor recuperável está em App\Models\TenantSecuritySetting, fora do módulo, e não foi inspecionado nesta mineração. -->
<!-- deferred: Http/Controllers/{UserController,RoleController,RoleAdminController,PermissionController,ClientRoleController,AccessGroupController,CargoController,InvitationAdminController,TenantUserViewController}.php, Policies/{UserPolicy,RolePolicy,PermissionPolicy,InvitationPolicy,ModulePolicy,SaasInvoicePolicy,MenuGroupPolicy,MenuItemPolicy}.php, Console/Commands/{RegisterModuleCommand,SeedMenusCommand,SetupMfaCommand}.php, Models/{SaasContractRenewal,SaasContractAdjustment,MenuItem}.php, Http/Resources/*.php, Tests/Feature/{ExpireCacheTest,AccessUnificationTest,ClientAccessTest,ClientTenantUsersTest,UserManagementFlowTest,TenantManagementTest,AuthenticationTest}.php -->
