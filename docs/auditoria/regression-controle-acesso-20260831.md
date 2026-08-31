# Relatório de Regressão — Controle de Acesso e Granularidade

**Data:** 31/08/2026
**Escopo:** Fases 0A, 0B, 1, 3, 4, 5 (planos consolidados de controle de acesso)

## Resultado da Suíte (apps/api — Feature)

- **Testes executados:** 130 (12 novos desta rodada)
- **Erros:** 20 — **pré-existentes** (módulos sem migrations no SQLite de teste: OrgChart API, Procurement RN, TestModule, Accounting)
- **Falhas:** 1 — **pré-existente** (`MfaRequirementTest::test_login_succeeds_with_valid_mfa_code` — `buildNavigation` com tenant nulo no login MFA)
- **Novos testes:** 12/12 verdes
- **Comparação com baseline (git stash -u):** baseline = 118 testes / 20 erros / 1 falha. Estado final = 130 testes / 20 erros / 1 falha. **Nenhuma regressão nova; +12 testes verdes.**

## Correções Críticas Aplicadas Nesta Rodada

| Item | Arquivo | Descrição |
|---|---|---|
| Fase 0A | `app/Models/Concerns/HasPermissions.php` | `rolesForTenant()` passa a filtrar por `roles.tenant_id` (RN-CORE-001) — antes retornava roles de todos os tenants |
| Fase 0A | `database/migrations/2026_08_31_130000_add_tenant_id_to_role_user_table.php` | Migration aditiva + backfill portável MySQL/SQLite |
| Fase 0A | `app/Services/UserService.php`, `InvitationService.php`, `Modules/Admin/Http/Controllers/ClientUserController.php`, `ClientAccessController.php` | Populam `role_user.tenant_id` em todos os pontos de atribuição |
| Fase 0B | `Modules/Client/Services/ClientNavigationService.php` | `buildNavigation()` resolve módulos/permissões do banco; inputs do frontend IGNORADOS (anti-spoofing) |
| Fase 0B | `Modules/Client/Http/Controllers/ClientNavigationController.php` | `navigation()` 100% backend; `modules()` sem array hardcoded |
| Fase 0B | `app/Http/Controllers/AuthController.php` | Removido `$defaults` hardcoded; módulos vêm só de `tenant_module.enabled` |
| Fase 1 | `app/Services/AccessService.php` (novo) | Avaliação única: admin → tenant_module.enabled → user_module_access OU access_group_access |
| Fase 1 | `app/Services/ModuleAccessService.php` | `hasModuleAccess()` delega ao `AccessService` (gate `tenant_module.enabled`) |
| Fase 3 | `app/Support/OrgScope.php` (novo) | Escopo ABAC central (`unitIdsFor`, `applyToQuery`) |
| Fase 3 | `Modules/OrgChart/Services/OrgScopeService.php` | Delega ao `OrgScope` central (API preservada) |
| Fase 4 | `app/Console/Commands/ExpireAccess.php` | Invalida `user:{id}:module_access:{tenant}` ao expirar (sem janela de 5 min) |
| Fase 5 | `Modules/OrgChart/Models/OrgUnit.php` | `OrgUnit` documentado como fonte canônica + const `TYPES` (mapeamento tipo↔type) |
| Fix regressão | `bootstrap/app.php` | `AuthServiceProvider` registrado em `withProviders` — gate `module` nunca era definido! |
| Fix regressão | `app/Providers/AuthServiceProvider.php` | Import `App\Models\Module` → `Modules\Admin\Models\Module` |
| Fix regressão | `Modules/Finance/Services/AccountingService.php` | `entries.tenant_id` → `qualifyColumn('tenant_id')` (alias errado quebrava SQLite) |

## Erros Pré-Existentes (não causados por esta rodada)

- `Modules/OrgChart` API tests: falham por schema incompleto no SQLite (migrations do módulo não carregadas na suíte raiz)
- `Modules/Procurement` RN tests: `criterio_julgamento` NOT NULL e tabela `licitacao_contratos` ausente no SQLite
- `Modules/TestModule` TenantIsolationTest: tabela `testmodule_items` ausente no SQLite
- `MfaRequirementTest`: `buildNavigation()` recebe tenant nulo no login sem tenant

## Próximos Passos Recomendados

1. Investigar a carga de migrations dos módulos (OrgChart/Procurement/TestModule) na suíte raiz
2. Corrigir `MfaRequirementTest` tratando tenant nulo em `AuthController::buildClientSession`
3. Rodar `composer run static` (PHPStan) após o fix dos erros pré-existentes
