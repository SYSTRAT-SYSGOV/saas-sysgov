# Tasks

## 1. Levantamento e decisões em aberto

- [ ] 1.1 Levantar consumidores do evento `TenantAdminCreated` (Outbox) e confirmar que nenhum assume um único administrador por tenant
- [ ] 1.2 Confirmar com a SYSTRAT se haverá limite máximo de administradores por tenant (D7) — se sim, incluir a tarefa 2.7 (e um teste correspondente em 4)
- [ ] 1.3 Confirmar o comportamento de e-mail já existente em outro tenant (reaproveitar usuário sem alterar senha — D2)

## 2. Backend - Serviços e regras

- [ ] 2.1 Criar `TenantAdminGuard` (serviço) com `assertNotLastAdmin(Tenant, User, string $acao)` contando apenas administradores ativos com conta ativa
- [ ] 2.2 Ajustar `UserService::createTenantAdmin` para criar N administradores (remover o retorno do admin existente) e preservar nome/senha de usuário já existente
- [ ] 2.3 Ajustar `CreateTenantAdminRequest::emailRule` para aceitar e-mail de usuário existente (reaproveitamento) e bloquear apenas e-mail de admin ativo do mesmo tenant (409)
- [ ] 2.4 Aplicar `TenantAdminGuard` em desativação de vínculo, troca/remoção da role `admin_tenant`, desativação de conta e exclusão (`UserService::deactivate`, `ClientUserController::update/deactivate`)
- [ ] 2.5 Garantir que apenas `admin_tenant` (ou plataforma) atribui a role `admin_tenant` em `ClientUserController::store/update` (HTTP 403 caso contrário)
- [ ] 2.6 Auditar `tenant_admin.created|updated|deactivated` (com `emergency` na desativação do SYSTRAT) e publicar `TenantAdminCreated` por administrador
- [ ] 2.7 (Opcional, D7) Migration `tenants.max_admins` nullable + validação no cadastro

## 3. Backend - Endpoints e policies

- [ ] 3.1 Criar `GET /api/admin/tenants/{tenant}/users/admins` (`listTenantAdmins`) com `mfa_enabled` e status do vínculo
- [ ] 3.2 Alterar `createTenantAdmin` do controller: remover o 409 por tenant, manter o 409 por e-mail do mesmo tenant (D2)
- [ ] 3.3 Criar `PUT /api/admin/tenants/{tenant}/users/admin/{user}` e manter `PUT .../users/admin` apenas quando houver exatamente um administrador (422 caso contrário)
- [ ] 3.4 Criar `POST /api/admin/tenants/{tenant}/users/admin/{user}/deactivate` com `reason` obrigatório, reutilizando `deactivateTenantUser`
- [ ] 3.5 Ajustar `UserPolicy` (abilities de listar/atualizar/desativar administrador) e rotas em `Modules/Admin/Routes/api.php`
- [ ] 3.6 Executar `php -l`, `composer static` (PHPStan) nos arquivos alterados

## 4. Backend - Testes

- [ ] 4.1 Atualizar `UserManagementFlowTest`: o teste de "segundo onboarding responde 409" passa a cobrir 409 apenas para o mesmo e-mail
- [ ] 4.2 Teste: cadastrar o segundo e o terceiro administrador no mesmo tenant (201) e listar os três
- [ ] 4.3 Testes do `TenantAdminGuard`: desativar único admin (422), desativar um de dois (ok), rebaixar único admin (422), desativação de emergência (ok + `emergency=true`)
- [ ] 4.4 Teste: usuário sem `admin_tenant` não atribui `admin_tenant` (403); `admin_tenant` cadastra outro admin (201)
- [ ] 4.5 Teste: e-mail de usuário de outro tenant é reaproveitado sem alterar a senha
- [ ] 4.6 Teste de regressão: segundo administrador precisa configurar MFA no primeiro login (`MFA_REQUIRED` + `mfa_setup_token`)
- [ ] 4.7 Rodar `php artisan test --filter=UserManagement` e a suíte do módulo Admin

## 5. SDK e Frontend web-admin

- [ ] 5.1 SDK: `listTenantAdmins`, `updateTenantAdmin(tenantId, userId, ...)`, `deactivateTenantAdmin`, e ajustar `createTenantAdmin`
- [ ] 5.2 `modules/admin/api.ts`: novos métodos correspondentes
- [ ] 5.3 `AdminTenantManagement.tsx`: substituir o modal "criar o primeiro / editar o existente" por gestão de administradores (lista com status e MFA, botão "Adicionar administrador", editar, desativar com motivo)
- [ ] 5.4 Exibir mensagem clara para os erros 409 (e-mail repetido) e 422 (último administrador)
- [ ] 5.5 Seguir o DESIGN_SYSTEM.md (componentes `@sysgov/ui`, tokens, responsividade)
- [ ] 5.6 Testes Vitest do fluxo (listar, adicionar, desativar, erro de último administrador)

## 6. Frontend web-client

- [ ] 6.1 `UsersModule.tsx`: avisar/bloquear ao rebaixar ou desativar o último administrador, usando a mensagem do backend (422)
- [ ] 6.2 Testes Vitest da regra de interface

## 7. Documentação e validação

- [ ] 7.1 Atualizar `docs/modules/gestao-usuarios.md` e `docs/adr/0005-politica-usuarios-tenant.md` (RN-USR-011: N administradores, salvaguarda do último)
- [ ] 7.2 Executar `openspec validate permitir-multiplos-admins-por-tenant`
- [ ] 7.3 Validar no ambiente: cadastrar 2º administrador, ele configurar MFA e entrar; tentar desativar o último administrador; desativação de emergência pelo SYSTRAT
