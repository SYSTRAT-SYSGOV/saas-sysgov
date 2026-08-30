# Relatório de Regressão — Evolução Usuários & Acessos (Fase F)

**Data:** 2026-08-29  
**Fase:** F (gate de merge)

## Suíte executada
```bash
cd apps/api
php vendor/bin/phpunit --filter "AccessEvolutionTest|TenantManagementTest|DemoTokenTest|RoleSlugHookTest|LastSuperAdminProtectionTest"
composer run static   # phpstan
```

## Resultado
- **Testes:** `OK (20 tests, 40 assertions)` ✅
- **PHPStan:** `[OK] No errors` ✅
- **Build web-client (typecheck):** limpo ✅

## Cobertura da evolução (RN-ACC)
| Teste | Regra | Status |
|---|---|---|
| `test_access_expired_does_not_grant_access` | RN-ACC-001 — vigência expirada nega acesso | ✅ |
| `test_access_with_valid_validity_grants_access_and_reports_expiring` | RN-ACC-001 — vigência válida concede + expiring | ✅ |
| `test_revoke_is_logical_and_preserves_history` | RN-ACC-005 — revogação lógica | ✅ |
| `test_renew_reactivates_revoked_access` | RN-ACC-001/003 — renovação reativa | ✅ |
| `test_module_admin_cannot_grant_outside_his_scope` | RN-ACC-002 — delegação restrita | ✅ |
| `test_grant_and_revoke_are_audited` | RN-ACC-003 — auditoria | ✅ |
| `test_expire_access_job_marks_expired_and_publishes_outbox` | RN-CORE-004/011 — job + Outbox | ✅ |
| `test_access_is_isolated_between_tenants` | RN-CORE-001 — isolamento multi-tenant | ✅ |

## Regressão do restante do sistema
- `TenantManagementTest` (4) — CRUD de tenants (500 não reproduz) ✅
- `DemoTokenTest` (4) — tokens demo restritos a local/testing ✅
- `RoleSlugHookTest` (1) — slug/scope auto-gerado em Role ✅
- `LastSuperAdminProtectionTest` (3) — RN-USR-006 (422) ✅

## Notas
- **403 no painel do admin (web-client) corrigido:** `AccessController` usava `Gate::authorize('viewAny', [Model::class, $tenantId])` — o nome da classe era injetado como argumento posicional na policy, deslocando o tenant. Substituído por `requireManager()` + `canGrantTo()` (padrão do `ClientAccessController`). Endpoints do painel retornam 200.
- **Validação de role ampliada:** `in:member,manager,admin,editor,viewer` (wizard envia os novos papéis; cadastro rápido preservado).
- **Erros pré-existentes não relacionados:** OrgChart `assignRole()` (Spatie não integrado ao User custom) e TestModule scaffold — confirmados presentes no HEAD original (via `git stash`).