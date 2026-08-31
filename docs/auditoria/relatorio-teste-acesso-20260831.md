# Relatório de Execução — Testes de Acesso e Granularidade

**Data:** 31/08/2026
**Massa de teste:** Tenant A (Prefeitura Alfa) / Tenant B (Prefeitura Beta), organograma com path materializado, 5 módulos, granularidade por unidade, 7 usuários.

## Resultado Consolidado

- **Suíte de acesso/granularidade:** `php vendor/bin/phpunit --filter="FullFlowTest|RoleIsolationTest|AccessUnificationTest|ExpireCacheTest|NavigationIsolationTest|OrgScopeAbacTest|AccessEvolutionTest|ClientTenantUsersTest"`
- **Resultado:** `OK (56 tests, 112 assertions)` — **todas verdes** (0 erros, 0 falhas)
- **FullFlowTest (C01–C34 + TC-01 a TC-22):** `OK (38 tests, 71 assertions)`

> Nota de aliases: o plano usa `licitacoes/contratos/financeiro/organograma`; o sistema real usa `procurement/contracts/finance/org` — mapeamento aplicado na massa de teste.

## Mapeamento TC × Cobertura Automatizada

| TC | Cenário | Cobertura | Status |
|---|---|---|---|
| TC-01 | Criar admin_tenant com acesso total | `test_tc01_criar_admin_tenant_com_acesso_total` | ✅ |
| TC-02 | Criar gestor de secretaria com escopo | `test_tc02_criar_gestor_de_secretaria_com_escopo` | ✅ |
| TC-03 | Criar usuário com vigência | `test_tc03_usuario_com_vigencia` | ✅ |
| TC-04 | Admin acessa módulos ativos (sidebar) | `test_c06_navegacao_reflete_acesso_real` | ✅ |
| TC-05 | Gestor acessa módulo liberado | `test_c11_user_module_access_concede` / `test_c22` | ✅ |
| TC-06 | Fiscal acessa módulo negado p/ unidade | `test_c22_acesso_bloqueado_por_unidade` | ✅ |
| TC-07 | Membro acessa módulo negado explicitamente | `test_tc07_membro_acessa_modulo_negado_explicitamente` | ✅ |
| TC-08 | Módulo desativado no tenant | `test_tc08_admin_nao_acessa_modulo_desativado` / `test_c13` | ✅ |
| TC-09 | Isolamento entre tenants | `test_tc09_isolation_entre_tenants` / `test_c02`/`test_c03` | ✅ |
| TC-10 | Login + resolução de tenant | `test_c01`/`test_c02` (ResolveTenant) | ✅ |
| TC-11 | Concessão de acesso + auditoria | `test_tc11_concessao_de_acesso_registra_auditoria` | ✅ |
| TC-12 | Revogação lógica preserva histórico | `test_tc12_revogacao_logica_preserva_historico` | ✅ |
| TC-13 | Expiração automática | `test_tc13_expiracao_automatica` / `test_c29` / `ExpireCacheTest` | ✅ |
| TC-14 | Reset de senha padrão | não automatizado (fluxo MFA/password em outro escopo) | ⬜ |
| TC-15 | Herança por path | `test_c18_liberar_secretaria_inclui_departamentos` | ✅ |
| TC-16 | Negação explícita sobrescreve | `test_c19_negar_departamento_sobrescreve_ancestral` | ✅ |
| TC-17 | Escopo ABAC recursivo | `test_tc17_escopo_abac_responsavel_subarvore` / `test_c25` | ✅ |
| TC-18 | Escopo ABAC unidade direta | `test_tc18_escopo_abac_unidade_direta` / `test_c26` | ✅ |
| TC-19 | Ações granulares can_create/edit/delete | `test_tc19_acoes_granulares_can_edit` / `test_c33` | ✅ |
| TC-20 | Admin de módulo fora do escopo | `test_c31` (auditor sem modules.manage) | ✅ |
| TC-21 | Admin de secretaria não gerencia outra | `test_tc21_admin_de_secretaria_nao_gerencia_outra` | ✅ |
| TC-22 | Roles isoladas por tenant | `test_tc22_roles_isoladas_por_tenant` / `test_c04` | ✅ |

## Casos Positivos × Negativos

| Tipo | Casos | Resultado |
|---|---|---|
| ✅ Positivos (concedem) | C01, C05, C10, C11, C12, C16, C17, C18, C21, C24, C25, C26, C33, TC-01/02/03/04/05/11/15/17/18/19 | 200 / acesso concedido |
| ❌ Negativos (negam) | C02, C03, C06, C07, C08, C09, C13, C14, C15, C19, C20, C22, C27, C28, C31, C32, TC-06/07/08/09/12/13/16/20/21/22 | 403 / acesso negado |

## Validações de Granularidade (checklist)

- [x] Liberar módulo para uma secretaria e negar para outra (`test_c20`)
- [x] Herança por path: secretaria liberada inclui departamentos (`test_c18`)
- [x] Negação explícita em nível abaixo sobrescreve o ancestral (`test_c19`)
- [x] Sidebar só mostra módulos efetivamente liberados (`test_c06`)
- [x] Listagens filtram por escopo ABAC (responsável recursivo / membro direto / scope_all) (`test_c24`/`test_c25`/`test_c26`)
- [x] Isolamento por tenant em tudo (RN-CORE-001) (`test_tc09`/`test_tc22`)
- [x] Auditoria HMAC em concessão/revogação (`test_tc11`/`test_tc12`)

## Correções Aplicadas Nesta Execução

| Arquivo | Correção |
|---|---|
| `Modules/OrgChart/Tests/Feature/OrgScopeAbacTest.php` | `assignRole()` (Spatie, inexistente no trait custom) → `attachRole()` helper com `roles()->syncWithoutDetaching` + vínculo tenant_user; `Spatie\Permission\Models\Role` → `App\Models\Role` |
| `tests/Feature/Access/FullFlowTest.php` | +14 casos TC; asserção de auditoria `event` → `action` (coluna real de `audit_logs`) |

## Riscos e Observações

- **TC-14 (reset de senha padrão)** não foi automatizado — envolve fluxo de senha/MFA (`must_change_password`), fora do escopo desta suíte de acesso.
- **Erros pré-existentes fora do escopo:** módulos OrgChart API/Procurement/TestModule falham no SQLite por migrations não carregadas na suíte raiz; `MfaRequirementTest` falha por tenant nulo no login. Não são regressões de acesso.
- **Cache de 300s:** mitigado — `ExpireAccess` invalida `module_access`; `clearPermissionCache` em toda atribuição.

## Critério de Aprovação

- [x] Casos positivos concedem; negativos retornam 403 (sem vazamento)
- [x] Granularidade por secretaria/departamento e herança por path funcionando
- [x] Isolamento entre tenants confirmado (RN-CORE-001)
- [x] Auditoria registrada em concessão/revogação
- [x] Suíte de acesso verde (56/56); sem regressões vs. baseline
- [x] Nenhum dado perdido; migrations 100% aditivas
- [x] Relatório registrado em `docs/auditoria/`
