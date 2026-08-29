# Auditoria — Fase E: Duplicação de Models de Hierarquia

**Data:** 2026-08-29  
**Fase:** E (mapeamento — sem remoção)

## Contexto
O prompt de melhorias identificou possível duplicação entre `Organization`/`Department`/`ManagementUnit` (app/Models) e `OrgUnit` (Modules/OrgChart). Esta auditoria mapeia o uso real de cada um.

## Mapeamento de Uso

### 1. `Organization`, `Department`, `ManagementUnit`, `BudgetUnit` (app/Models)
- **Tabelas:** `organizations`, `departments`, `management_units`, `budget_units`
- **Migration:** `2026_08_22_000003_create_tenant_hierarchy_tables.php`
- **Uso em código:**
  - `Modules/Admin/Http/Controllers/HierarchyController.php` — endpoints `/api/admin/hierarchy/organizations|departments|management-units|budget-units` (hierarquia clássica de 4 níveis)
  - `Modules/Admin/Tests/Feature/HierarchyUniquenessTest.php` — testa unicidade (tenant_id, code)
- **Observação:** hierarquia de **4 níveis** (Org → Dept → ManagementUnit → BudgetUnit)

### 2. `OrgUnit`, `OrgUnitUser` (Modules/OrgChart/Models)
- **Tabelas:** `org_units`, `org_unit_user`
- **Migration:** `2026_08_24_000001_create_org_units_table.php`, `2026_08_24_000002_create_org_unit_user_table.php`
- **Uso em código (22 referências):**
  - Módulo OrgChart completo (controllers, services, policies, resources, seeders, testes)
  - `ModuleAccessService` (app/Services) — escopo de dados por secretaria
  - `Procurement/Models/Licitacao` — relação `belongsTo(OrgUnit, 'org_unit_id')`
- **Observação:** árvore **genérica/auto-referenciada** (parent_id + path), usada pelo organograma municipal e pelo ABAC de escopo.

## Conclusão
- **NÃO são duplicatas diretas:** cada conjunto atende a um contrato externo diferente (hierarquia clássica de 4 níveis vs árvore de organograma municipal).
- **`OrgUnit` é a fonte de verdade canônica** para o futuro (organograma + escopo ABAC + licitações).
- **Decisão desta fase:** nenhum model é removido. A unificação real exige plano de dados dedicado (migração das tabelas `organizations/departments/management_units/budget_units` para `org_units`), a ser avaliado em sprint separada com backup e teste de paridade.

## Próximos passos recomendados (NÃO executados nesta fase)
1. Verificar se os endpoints `/api/admin/hierarchy/*` ainda são consumidos por alguma tela.
2. Se não forem consumidos, marcar os models como `@deprecated` apontando para `OrgUnit`.
3. Migração de dados (aditiva) unificando as tabelas sob `org_units`.