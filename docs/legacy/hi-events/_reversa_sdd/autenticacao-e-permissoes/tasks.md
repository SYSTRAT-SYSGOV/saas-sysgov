# Tarefas de Implementação: Autenticação e Permissões (`autenticacao-e-permissoes`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Pré-requisitos

- [ ] Tabelas `users`, `account_users`, `account_user_permissions`, `personal_access_tokens` criadas.
- [ ] Laravel Sanctum e suporte a cookies configurados no `Kernel.php` / bootstrap da aplicação.
- [ ] Biblioteca `ezyang/htmlpurifier` instalada via Composer para higienização de tags HTML.

---

## 2. Tarefas de Implementação

- [ ] **T-01: Definir Enum de Permissões Canônicas (`Permission`)**
  - **Origem no legado**: `backend/app/DomainObjects/Enums/Permission.php`
  - **Critério de pronto**: Enum contendo `EDIT`, `VIEW_FINANCIALS`, `ISSUE_REFUNDS`, `MANAGE_PAYMENTS`, `DELETE_EVENTS`, `MANAGE_TEAM`, `MANAGE_ACCOUNT`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-02: Implementar Atributo PHP 8 `#[RequiresPermission]` e Verificador de Ações**
  - **Origem no legado**: `backend/app/Http/Actions/BaseAction.php`
  - **Critério de pronto**: Método `isActionAuthorized()` em `BaseAction` intercepta o atributo e valida contra os grants do usuário em `AccountUserAccessService`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-03: Implementar Bloqueio de Somente-Leitura (`READ_ONLY_ROLE`)**
  - **Origem no legado**: `backend/app/Http/Middleware/EnsureUserHasEditPermission.php`
  - **Critério de pronto**: Rejeitar com `HTTP 403` qualquer requisição não-`GET` feita por membro sem `Permission::EDIT`, a menos que anotada com `#[AllowedForReadOnlyUsers]`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-04: Implementar Validação Automática de Escopo Pai-Filho**
  - **Origem no legado**: `backend/app/Http/Actions/BaseAction.php`
  - **Critério de pronto**: Helper de busca que aborta com `HTTP 404/422` se o ID da entidade filha não estiver vinculado ao ID pai autorizado na rota.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-05: Implementar Regra de Validação Anti-Spam (`PersonNameRule`)**
  - **Origem no legado**: `backend/app/Rules/PersonNameRule.php`
  - **Critério de pronto**: Rejeitar strings com URLs, comandos de script, emojis proibidos ou termos de spam antes da persistência em cadastros e checkout.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-06: Implementar Sanitização de HTML com HtmlPurifier**
  - **Origem no legado**: `backend/app/Services/Security/HtmlPurifierService.php`
  - **Critério de pronto**: Purificar descrições de eventos e templates de e-mail, garantindo remoção de scripts maliciosos e iframes externos não autorizados.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-07: Implementar Serviço de Despacho Anti-Spam (`EventSpamCheckDispatchService`)**
  - **Origem no legado**: `backend/app/Services/Security/EventSpamCheckDispatchService.php`
  - **Critério de pronto**: Despachar job assíncrono para análise textual de eventos criados. Flaggar eventos suspeitos com status `PENDING_MANUAL_REVIEW`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-08: Implementar Componentes e Hook de Acesso no Frontend**
  - **Origem no legado**: `frontend/src/hooks/useAccess.ts`, `frontend/src/components/common/WriteAccess.tsx`
  - **Critério de pronto**: Hook `useAccess` consultando o contexto de permissões SSR. Wrappers `<WriteAccess>` e `<CreateButton>` ocultando controles de mutação para leitores.
  - **Confiança**: 🟢 CONFIRMADO

---

## 3. Tarefas de Teste

- [ ] **TT-01: Executar Suíte de Cobertura de Acesso (`AccessCoverageTest`)**
  - Validar que 100% dos endpoints registrados na aplicação possuem anotação de permissão explícita ou constam na lista de exceções públicas.
- [ ] **TT-02: Teste de Tentativa de Mutação por Perfil Viewer**
  - Submeter requisição POST de atualização de evento como membro de leitura e garantir retorno `HTTP 403 (READ_ONLY_ROLE)`.
- [ ] **TT-03: Teste de Sanitização e XSS em Descrições de Eventos**
  - Submeter payload com `<script>alert(1)</script>` e tags `onload`. Verificar que o conteúdo salvo e retornado foi completamente desarmado pelo `HtmlPurifierService`.

---

## 4. Ordem Sugerida de Execução

1. **Fase 1 (Enums e Infraestrutura RBAC)**: T-01, T-02 e T-03 (Contratos e middlewares).
2. **Fase 2 (Escopo e Prevenção IDOR)**: T-04 (Validação em `BaseAction`).
3. **Fase 3 (Anti-Spam e Sanitização)**: T-05, T-06 e T-07 (Higienização de dados).
4. **Fase 4 (Frontend Guarding)**: T-08 (Hook `useAccess` e componentes de guarda).

---

## 5. Lacunas e Riscos (🔴 / 🟡)

- 🟢 **Suporte a OIDC/SAML (Enterprise SSO)**: O fluxo corporativo é exclusivo da edição licenciada (`backend/ee/`), mantendo o core focado em Sanctum/sessões locais.
- 🟡 **Políticas de Rate Limit em 2FA**: Confirmar o teto máximo de tentativas de desafio antes do bloqueio temporário do usuário (sugerido: 5 tentativas por hora).
