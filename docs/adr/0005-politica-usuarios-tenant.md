# ADR 0005 — Política de Usuários do Tenant (web-admin read-only)

- **Status:** Aceita
- **Data:** 2026-08-24
- **Decisores:** Arquitetura SYSGOV

## Contexto

A SYSTRAT opera o SaaS e precisa apoiar a implantação de novos tenants, mas não deve
virar "help desk" diário de usuários das prefeituras. O painel web-admin e o web-client
compartilham o mesmo backend (`/admin` e `/api`).

## Decisão (RN-USR-011)

**O web-admin NÃO faz o CRUD diário dos usuários do tenant.** Ele pode apenas:

1. **Criar o admin inicial do tenant** no onboarding:
   `POST /api/admin/tenants/{tenant}/users/admin` (idempotente → `409` se já existe).
2. **Visualizar os usuários do tenant** em modo somente leitura:
   `GET /api/admin/tenants/{tenant}/users`.
3. **Desativar usuário de tenant em emergência/segurança**:
   `POST /api/admin/tenants/{tenant}/users/{user}/deactivate`
   (motivo obrigatório, auditado, apenas `super_admin`).

O **CRUD completo** (criar pregoeiro, fiscal, membro, reativar, atribuir roles)
é responsabilidade do **`admin_tenant` no web-client** (`/api/users`).

## Consequências

- A SYSTRAT mantém controle sobre o "super admin" de cada prefeitura, sem assumir a
  operação diária de usuários.
- Menos superfície de erro: o web-admin não possui rotas de escrita para usuários de
  tenant (rotas inexistentes → 404/405), então a divisão é imposta por contrato, não
  apenas por permissão.
- O fluxo de suporte fica read-only por padrão (RN-USR-002), com exceção da
  desativação de emergência via `super_admin`.

## Alternativas rejeitadas

- **SYSTRAT gerencia todos os usuários:** cria dependência operacional e atrito,
  contraria o princípio do painel do cliente definido no Organograma.
- **Apenas permissão oculta rotas:** arriscado — erros de RBAC exporiam operações de
  escrita indevidas. A ausência física da rota é uma camada extra de defesa.
