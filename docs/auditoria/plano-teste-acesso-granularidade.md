# Plano de Teste — Controle de Acesso e Granularidade de Permissões

## 1. Objetivo

Validar ponta a ponta o controle de acesso da plataforma SYSGOV: isolamento multi-tenant, RBAC por perfil, gate de módulo (`tenant_module.enabled`), granularidade por unidade organizacional (`tenant_module_org_unit` com herança por path), escopo ABAC (`OrgScope`), anti-spoofing de navegação e invalidação de cache na expiração.

## 2. Pré-requisitos

| # | Pré-requisito | Como garantir |
|---|---|---|
| P1 | Ambiente `apps/api` rodando (Laravel 12) e banco MySQL com migrations aplicadas | `php artisan migrate` (aditivo) |
| P2 | Seeders de RBAC e catálogo de módulos executados | `php artisan db:seed --class=RbacSeeder --class=ModuleCatalogSeeder` |
| P3 | Tenant A (Prefeitura Alfa) e Tenant B (Prefeitura Beta) ativos | Criar via admin ou comando de seed |
| P4 | Organograma do Tenant A criado com hierarquia e `path` materializado | `OrgChart` → criar raiz, secretarias e departamentos |
| P5 | Módulos `org`, `procurement`, `contracts`, `finance` habilitados no `tenant_module` do Tenant A; `rh` desabilitado | `admin_tenant` → Módulos |
| P6 | Usuários de teste criados (ver Massa de Teste, Seção 3) | |
| P7 | Cache limpo antes dos cenários de expiração | `php artisan cache:clear` |
| P8 | Acesso com bearer token + header `X-Tenant-Slug` | Interceptador do frontend já envia |

## 3. Massa de Teste

### 3.1 Tenants
- **Tenant A** — `pref-alfa` (Prefeitura Alfa)
- **Tenant B** — `pref-beta` (Prefeitura Beta)

### 3.2 Organograma do Tenant A

| Path | Unidade | Type | Level |
|---|---|---|---|
| `1` | Prefeitura de Alfa | prefeitura | 1 |
| `1.1` | Gabinete | gabinete | 2 |
| `1.2` | Secretaria de Saúde | secretaria | 2 |
| `1.2.1` | Depto. Atenção Básica | departamento | 3 |
| `1.2.2` | Depto. Vigilância | departamento | 3 |
| `1.3` | Secretaria de Obras | secretaria | 2 |
| `1.3.1` | Depto. Pavimentação | departamento | 3 |

### 3.3 Usuários de teste

| Código | Usuário | Tenant | Perfil | Escopo | Módulos |
|---|---|---|---|---|---|
| U1 | `admin.alfa@teste.gov` | A | `admin_tenant` | todas as unidades | todos |
| U2 | `gestor.saude@teste.gov` | A | `gestor` | responsável 1.2 (recursivo) | contracts, finance (via `user_module_access`) |
| U3 | `membro.obras@teste.gov` | A | `membro` | unidade 1.3.1 | contracts (via grupo) |
| U4 | `auditor.alfa@teste.gov` | A | `auditor` | `scope_all` | todos (somente leitura) |
| U5 | `admin.beta@teste.gov` | B | `admin_tenant` | todas | todos (isolamento) |
| U6 | `suporte@sysgov.local` | — | `support_analyst` (SYSTRAT) | carteira de clientes | — |
| U7 | `expira@teste.gov` | A | `membro` | unidade 1.2.1 | contracts (vigência expirada) |

### 3.4 Vínculos de acesso do Tenant A

- `tenant_module.enabled = true`: org, procurement, contracts, finance
- `tenant_module.enabled = false`: rh
- Granularidade: **1.2 Saúde** liberada p/ `contracts` (explícito `enabled=true`); **1.3 Obras** negada p/ `contracts` (explícito `enabled=false`); **1.2.2 Vigilância** herda `contracts` de 1.2; **1.3.1 Pavimentação** herda negação de 1.3
- `user_module_access` (U2): contracts + finance, `status=active`, vigência válida
- `access_group` "Grupo Obras" (U3): contracts com vigência válida

---

## 4. Casos de Teste

### 4.1 Isolamento de roles entre tenants (Fase 0A)

| # | Cenário | Passos | Resultado Esperado | Status |
|---|---|---|---|---|
| C01 | ✅ admin_tenant do A vale no A | Login U1 com `X-Tenant-Slug: pref-alfa` → GET `/api/users` | 200, lista de usuários do A | ☑ |
| C02 | ❌ admin_tenant do A NÃO vale no B | Login U1 com `X-Tenant-Slug: pref-beta` | 403 (ResolveTenant bloqueia) | ☑ |
| C03 | ❌ admin_tenant de B não é admin em A | Login U5 com `X-Tenant-Slug: pref-alfa` → GET `/api/users` | 403 | ☑ |
| C04 | ✅ role Spatie `scope=tenant` do A não vaza para B | `rolesForTenant(A)` vs `rolesForTenant(B)` | Contém em A, não contém em B | ☑ |
| C05 | ✅ role SYSTRAT continua valendo | U6 acessa tenant de sua carteira | 200 | ☑ |

### 4.2 Navegação anti-spoofing (Fase 0B)

| # | Cenário | Passos | Resultado Esperado | Status |
|---|---|---|---|---|
| C06 | ✅ navegação reflete acesso real | U2 (sem `rh`) GET `/api/client/navigation` (via login) | Sidebar sem item `rh`; com contracts/finance | ☑ |
| C07 | ❌ payload fake não altera resposta | Requisição com `modules: ['rh']`, `permissions: ['*']` | Resposta idêntica; `rh` NÃO aparece | ☑ |
| C08 | ❌ módulo desativado some e rota retorna 403 | `rh` desabilitado → GET rota de RH | Menu some; acesso direto → 403 | ☑ |
| C09 | ❌ usuário sem acesso não vê menu e rota nega | U3 tenta `finance` (sem acesso) | Item ausente; rota → 403 | ☑ |

### 4.3 Acesso unificado (Fase 1)

| # | Cenário | Passos | Resultado Esperado | Status |
|---|---|---|---|---|
| C10 | ✅ `admin_tenant` tem acesso total | U1 → contracts | 200 | ☑ |
| C11 | ✅ `user_module_access` concede | U2 → contracts | 200 | ☑ |
| C12 | ✅ `access_group_access` concede | U3 → contracts (via grupo) | 200 | ☑ |
| C13 | ❌ módulo desativado bloqueia mesmo com acesso | `user_module_access` p/ `rh` + `rh.enabled=false` → rota RH | 403 (gate sobrepõe) | ☑ |
| C14 | ❌ acesso expirado não concede | U7 → contracts | 403 | ☑ |
| C15 | ❌ usuário sem nenhuma via nega | Membro sem acesso → procurement | 403 | ☑ |

### 4.4 Granularidade por unidade (Fase 2)

| # | Cenário | Passos | Resultado Esperado | Status |
|---|---|---|---|---|
| C16 | ✅ listar módulos p/ granularidade | U1 → GET `/api/client/granularity/modules` | 200, módulos ativos (sem `rh`) | ☑ |
| C17 | ✅ listar unidades de um módulo | U1 → GET `/api/client/granularity/{contracts}/units` | Árvore com todas as unidades | ☑ |
| C18 | ✅ liberar secretaria inclui departamentos | `PUT {enabled:true}` em 1.2 → verificar 1.2.1/1.2.2 | Departamentos `inherited=true, from=1.2` | ☑ |
| C19 | ❌ negar departamento sobrescreve ancestral | `PUT {enabled:false}` em 1.2.2 (Saúde liberada) | 1.2.2 `enabled=false` explícito | ☑ |
| C20 | ❌ departamento de secretaria negada continua negado | 1.3.1 com `contracts` negado em 1.3 | `enabled=false` herdado | ☑ |
| C21 | ✅ reverter à herança | `DELETE` em 1.2.2 após C19 | Volta a `inherited=true` | ☑ |
| C22 | ❌ acesso efetivo bloqueado por unidade | U3 (1.3.1) → contracts | 403 | ☑ |
| C23 | ✅ auditoria registrada | Liberar/negar → consultar `audit_logs` | Registro `module.org_unit.enabled/disabled` | ☑ |

### 4.5 Escopo ABAC nas listagens (Fase 3)

| # | Cenário | Passos | Resultado Esperado | Status |
|---|---|---|---|---|
| C24 | ✅ `scope_all` vê todas as unidades | U4 → listar contratos | Todos os contratos do tenant | ☑ |
| C25 | ✅ responsável vê subárvore recursiva | U2 (responsável 1.2) → listar contratos | Só contratos de 1.2, 1.2.1, 1.2.2 | ☑ |
| C26 | ✅ membro vê só a própria unidade | U3 (1.3.1) → listar contratos | Só contratos de 1.3.1 | ☑ |
| C27 | ❌ dados fora do escopo invisíveis | U2 tenta contrato de 1.3 via `GET /contracts/{id}` | 403/404 | ☑ |
| C28 | ❌ tenant B não vê dados do A | U5 acessar dados de A com slug de B | 403/404 | ☑ |

### 4.6 Cache na expiração (Fase 4)

| # | Cenário | Passos | Resultado Esperado | Status |
|---|---|---|---|---|
| C29 | ✅ expiração vale em tempo real | Expirar acesso U7 → `sysgov:expire-access` → GET contracts | Cache invalidado; 403 imediata | ☑ |
| C30 | ✅ revogação imediata | `revokeAccess` → GET módulo | 403 na hora | ☑ |

### 4.7 Matriz perfil × módulo × ação

| # | Cenário | Passos | Resultado Esperado | Status |
|---|---|---|---|---|
| C31 | ❌ auditor não acessa `modules.manage` | U4 → PUT granularidade | 403 | ☑ |
| C32 | ❌ membro não edita contrato fora do escopo | U3 → PUT /contracts/{id} (de 1.2) | 403/404 | ☑ |
| C33 | ✅ gestor edita contrato dentro do escopo | U2 → PUT /contracts/{id} (de 1.2) | 200 | ☑ |
| C34 | ❌ gestor não edita contrato de 1.3 | U2 → PUT /contracts/{id} (de 1.3) | 403/404 | ☑ |

---

## 5. Fluxo de Validação de Acesso (decisão em tempo real)

```
Request → rota de módulo
  │
  1. ResolveTenant (X-Tenant-Slug) → tenant_id   [falha → 403]
  │
  2. Auth (token)                                 [falha → 401]
  │
  3. admin_tenant / platform_admin / support_analyst? ──sim──▶ ACESSO TOTAL
  │ não
  │
  4. tenant_module.enabled (gate)?               [não → 403]
  │ sim
  │
  5. tenant_module_org_unit (liberado p/ unidade)? [não → 403]
  │ sim
  │
  6. user_module_access OU access_group_access?   [não → 403]
  │ sim
  │
  7. Listagem filtra por OrgScope
  ▼
  ACESSO CONCEDIDO com escopo correto
```

## 6. Execução

### Manual
Autenticar com o usuário da Massa de Teste, enviar `X-Tenant-Slug` correto, chamar a rota-alvo e comparar com o resultado esperado.

### Automatizada (regressão)
```bash
cd apps/api && php vendor/bin/phpunit --filter="RoleIsolationTest|NavigationIsolationTest|AccessUnificationTest|ExpireCacheTest|OrgScopeAbacTest|AccessEvolutionTest|ClientTenantUsersTest|FullFlowTest"
```

## 7. Riscos e Observações

| Risco | Impacto | Mitigação |
|---|---|---|
| Cache de 300s segura acesso revogado por até 5 min | Segurança | `clearPermissionCache` em toda atribuição; `ExpireAccess` invalida `module_access` |
| `role_user.tenant_id` nullable pode deixar vínculos legados sem tenant | Isolamento parcial | Backfill na migration + `rolesForTenant` combina `roles.tenant_id` OR pivot |
| Herança por `path` depende de `path` materializado e correto | Granularidade incorreta | Validar integridade do path após mover unidades |
| Testes de módulos (OrgChart/Procurement/TestModule) falham no SQLite | Falsos negativos no CI | Rodar suíte dos módulos isoladamente |
| `MfaRequirementTest` falha por `buildNavigation` com tenant nulo | Falha pré-existente | Corrigir `buildClientSession` para não chamar navegação sem tenant |
| Gate `module-access:users` removido de `/api/users` | Usuário comum lista usuários | Avaliar reaplicar com `admin-tenant` em fase futura |

## 8. Critério de Aprovação Geral

1. **Todos os casos C01–C34 com `☑`** (resultado == esperado).
2. Suíte automatizada sem novas regressões vs. baseline: **130 testes, 20 erros (pré-existentes), 1 falha (pré-existente), 0 novas falhas**.
3. Nenhuma migration destrutiva executada; schema 100% aditivo.
4. Auditoria HMAC presente em liberação/negação/concessão/revogação.
