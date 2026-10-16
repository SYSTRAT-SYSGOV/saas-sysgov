# Tasks

## 1. Levantamento e decisões em aberto

- [x] 1.1 (nenhum consumidor de `TenantAdminCreated` fora do Outbox no repositório) Levantar consumidores do evento `TenantAdminCreated` (Outbox) e confirmar que nenhum assume um único administrador por tenant
- [ ] 1.2 Confirmar com a SYSTRAT se haverá limite máximo de administradores por tenant (D7) — NÃO implementado (padrão: sem limite); se sim, incluir a tarefa 2.7 (e um teste correspondente em 4)
- [x] 1.3 (implementado: reaproveita sem alterar senha/nome; contas da plataforma/SYSTRAT e desativadas são recusadas) Confirmar o comportamento de e-mail já existente em outro tenant (reaproveitar usuário sem alterar senha — D2)

## 2. Backend - Serviços e regras

- [x] 2.1 Criar `TenantAdminGuard` (serviço) com `assertNotLastAdmin(Tenant, User, string $acao)` contando apenas administradores ativos com conta ativa
- [x] 2.2 Ajustar `UserService::createTenantAdmin` para criar N administradores (remover o retorno do admin existente) e preservar nome/senha de usuário já existente
- [x] 2.3 Ajustar `CreateTenantAdminRequest::emailRule` para aceitar e-mail de usuário existente (reaproveitamento) e bloquear apenas e-mail de admin ativo do mesmo tenant (409)
- [x] 2.4 Aplicar `TenantAdminGuard` em desativação de vínculo, troca/remoção da role `admin_tenant`, desativação de conta e exclusão (`UserService::deactivate`, `ClientUserController::update/deactivate`)
- [x] 2.5 Garantir que apenas `admin_tenant` (ou plataforma) atribui a role `admin_tenant` em `ClientUserController::store/update` (HTTP 403 caso contrário)
- [x] 2.6 Auditar `tenant_admin.created|updated|deactivated` (com `emergency` na desativação do SYSTRAT) e publicar `TenantAdminCreated` por administrador
- [ ] 2.7 (Opcional, D7) Migration `tenants.max_admins` nullable + validação no cadastro

## 3. Backend - Endpoints e policies

- [x] 3.1 Criar `GET /api/admin/tenants/{tenant}/users/admins` (`listTenantAdmins`) com `mfa_enabled` e status do vínculo
- [x] 3.2 Alterar `createTenantAdmin` do controller: remover o 409 por tenant, manter o 409 por e-mail do mesmo tenant (D2)
- [x] 3.3 Criar `PUT /api/admin/tenants/{tenant}/users/admin/{user}` e manter `PUT .../users/admin` apenas quando houver exatamente um administrador (422 caso contrário)
- [x] 3.4 Reutilizar `POST /api/admin/tenants/{tenant}/users/{user}/deactivate` (já existente, `reason` obrigatório) para desativar administrador; corrigida a policy `deactivateTenantUser`, que lançava TypeError (500) por exigir dois argumentos
- [x] 3.5 Ajustar `UserPolicy` (abilities de listar/atualizar/desativar administrador) e rotas em `Modules/Admin/Routes/api.php`
- [x] 3.6 Executar `php -l`, `composer static` (PHPStan) nos arquivos alterados

## 4. Backend - Testes

- [x] 4.1 Atualizar `UserManagementFlowTest`: o teste de "segundo onboarding responde 409" passa a cobrir 409 apenas para o mesmo e-mail
- [x] 4.2 Teste: cadastrar o segundo e o terceiro administrador no mesmo tenant (201) e listar os três
- [x] 4.3 Testes do `TenantAdminGuard`: desativar único admin (422), desativar um de dois (ok), rebaixar único admin (422), desativação de emergência (ok + `emergency=true`)
- [x] 4.4 Teste: usuário sem `admin_tenant` não atribui `admin_tenant` (403); `admin_tenant` cadastra outro admin (201)
- [x] 4.5 Teste: e-mail de usuário de outro tenant é reaproveitado sem alterar a senha
- [x] 4.6 Teste de regressão: segundo administrador precisa configurar MFA no primeiro login (`MFA_REQUIRED` + `mfa_setup_token`)
- [x] 4.7 Rodar `php artisan test --filter=UserManagement` e a suíte do módulo Admin

## 5. SDK e Frontend web-admin

- [x] 5.1 SDK: `listTenantAdmins`, `updateTenantAdmin(tenantId, userId, ...)`, `deactivateTenantAdmin`, e ajustar `createTenantAdmin`
- [x] 5.2 `modules/admin/api.ts`: novos métodos correspondentes
- [x] 5.3 `AdminTenantManagement.tsx`: substituir o modal "criar o primeiro / editar o existente" por gestão de administradores (lista com status e MFA, botão "Adicionar administrador", editar, desativar com motivo)
- [x] 5.4 Exibir mensagem clara para os erros 409 (e-mail repetido) e 422 (último administrador)
- [x] 5.5 Seguir o DESIGN_SYSTEM.md (componentes `@sysgov/ui`, tokens, responsividade)
- [x] 5.6 Testes Vitest do fluxo (listar, adicionar, desativar, erro de último administrador)

## 6. Frontend web-client

- [x] 6.1 `UsersModule.tsx`: avisar/bloquear ao rebaixar ou desativar o último administrador, usando a mensagem do backend (422)
- [ ] 6.2 Testes Vitest da regra de interface (sem alteração de código no web-client: `UsersModule` já exibe `response.data.message` do 422)

## 7. Documentação e validação

- [x] 7.1 Atualizar `docs/modules/gestao-usuarios.md` e `docs/adr/0005-politica-usuarios-tenant.md` (RN-USR-011: N administradores, salvaguarda do último)
- [x] 7.2 Executar `openspec validate permitir-multiplos-admins-por-tenant`
- [ ] 7.3 Validar no ambiente: cadastrar 2º administrador, ele configurar MFA e entrar; tentar desativar o último administrador; desativação de emergência pelo SYSTRAT
