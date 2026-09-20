# Spec: orgchart

> Auto-extracted by spec-miner. Last mined: 2026-09-19.
> Source: apps/api/Modules/OrgChart (Services/{OrgTreeService,OrgUserService,OrgScopeService,OrgSeedService,OrgExportService}, Models/{OrgUnit,OrgUnitUser}, Http/Controllers/{ClientOrgChartController,AdminOrgChartController}, Http/Requests/*, Http/Resources/*, Policies/OrgUnitPolicy, Routes/{api,admin}.php, Database/Migrations/*, Database/Seeders/OrgChartDatabaseSeeder, Tests/Feature/*, module.json, Config/config.php), apps/api/app/Support/OrgScope.php, apps/api/app/Services/ModuleAccessService.php
> Last verified: 2026-09-19 (commit 2bd3aae)

Escopo: OrgChart — fonte canônica da estrutura organizacional do município (RN-ORG-002).
Cobre a árvore hierárquica em `org_units` com path materializado, criação/edição/movimentação/
inativação de unidades com prevenção de ciclos, vínculo de usuários a unidades
(`org_unit_user`, papéis `responsavel`/`membro`, unidade primária única), escopo de dados ABAC
(`OrgScope`) consumido por todos os demais módulos, semeadura da estrutura municipal padrão no
onboarding, exportação JSON/CSV com manifest versionado e isolamento multi-tenant.

---

### Requirement: Cada tenant possui exatamente uma unidade raiz
<!-- id: OrgTreeService.createUnit -->
<!-- entities: OrgUnit, Tenant -->
<!-- enforced: OrgTreeService.createUnit() -->

A criação de unidade sem `parent_id` SHALL ser permitida apenas quando o tenant ainda não possui
nenhuma unidade raiz (RN-ORG-002). A raiz é a autoridade única da árvore: SHALL receber
`level = 1` e `path` igual ao próprio ID, SHALL rejeitar movimentação para baixo de outra unidade
e SHALL rejeitar exclusão. Tentar tornar raiz uma segunda unidade via `moveUnit(null)` também é
bloqueado.

#### Scenario: criação de segunda raiz no mesmo tenant
<!-- test: OrgTreeCyclePreventionTest.test_cannot_create_second_root_unit() -->
- **WHEN** `createUnit()` recebe `parent_id = null` e já existe unidade com `parent_id` nulo no tenant
- **THEN** lança `LogicException` "O município já possui uma unidade raiz configurada. Novas secretarias ou órgãos devem estar subordinados à raiz." e nada é persistido

#### Scenario: tentativa de mover a raiz para baixo de outra unidade
- **WHEN** `moveUnit()` recebe unidade cujo `isRoot()` é verdadeiro e `newParentId` não nulo
- **THEN** lança `LogicException` "A unidade raiz municipal não pode ser movida para baixo de outra unidade."

#### Scenario: promoção de unidade a raiz com raiz já existente
- **WHEN** `moveUnit()` recebe `newParentId = null` e existe outra raiz no tenant
- **THEN** lança `LogicException` "Não é permitido criar uma segunda unidade raiz."

#### Scenario: tentativa de excluir a raiz
- **WHEN** `deleteUnit()` recebe a unidade raiz
- **THEN** lança `LogicException` "A unidade raiz municipal não pode ser excluída."

---

### Requirement: Level e path materializado são derivados do pai na criação
<!-- id: OrgTreeService.createUnit -->
<!-- entities: OrgUnit -->
<!-- triggers: Movimentação de unidade recalcula a subárvore inteira -->
<!-- enforced: OrgTreeService.createUnit() -->

Na criação, o sistema SHALL calcular `level = parent.level + 1` (ou 1 para a raiz) e gravar o
path materializado `{parent.path}.{unit.id}` (ou o próprio ID para a raiz) em transação, em
segundo passo após obter o ID auto-incremental (RN-ORG-006). A `order` padrão, quando omitida,
SHALL ser `max(order) + 1` entre os irmãos do mesmo `parent_id`. O `parent_id` informado SHALL
existir. Toda criação registra auditoria `unit.created`, publica `OrgUnitCreated` no Outbox e
invalida o cache da árvore do tenant.

#### Scenario: cadeia raiz → secretaria → departamento → divisão
<!-- test: OrgTreeCyclePreventionTest.test_materialized_path_and_levels_are_properly_calculated() -->
- **WHEN** quatro unidades são criadas encadeadas por `parent_id`
- **THEN** os níveis são 1, 2, 3 e 4 e os paths são `{root}`, `{root}.{sec}`, `{root}.{sec}.{dept}` e `{root}.{sec}.{dept}.{div}`

#### Scenario: pai inexistente
- **WHEN** `createUnit()` recebe `parent_id` que não resolve para uma unidade do tenant
- **THEN** lança `InvalidArgumentException` "A unidade pai especificada (ID #{id}) não foi encontrada."

#### Scenario: ordem omitida
- **WHEN** `createUnit()` é chamado sem `order` e os irmãos já ocupam ordens 1 e 2
- **THEN** a nova unidade recebe `order = 3`

---

### Requirement: Nome de unidade é único entre irmãos e código é único por tenant
<!-- id: OrgTreeService.createUnit -->
<!-- entities: OrgUnit -->
<!-- enforced: OrgTreeService.createUnit() -->

Duas unidades com o mesmo `parent_id` SHALL NOT ter o mesmo `name` (RN-ORG-005), validado tanto
na criação quanto na renomeação via `updateUnit()`, e reforçado por índice único
`(tenant_id, parent_id, name)`. O `code` SHALL ser único por tenant (índice único
`(tenant_id, code)`) — o mesmo código pode existir em tenants distintos.

#### Scenario: criação de unidade com nome duplicado no mesmo nível
- **WHEN** `createUnit()` recebe `name` já usado por outra unidade com o mesmo `parent_id`
- **THEN** lança `InvalidArgumentException` "Já existe uma unidade com o nome '{name}' no mesmo nível hierárquico."

#### Scenario: renomeação colidindo com irmão
- **WHEN** `updateUnit()` altera `name` para um valor já usado por outro irmão (excluindo a própria unidade)
- **THEN** lança `InvalidArgumentException` com a mesma mensagem e nada é gravado

#### Scenario: mesmo código em tenants diferentes
<!-- test: OrgUnitIsolationTest.test_org_units_are_strictly_isolated_between_tenants() -->
- **WHEN** o tenant B cria uma raiz com `code = GAB-01`, já usado no tenant A
- **THEN** a criação é aceita, pois a unicidade é composta com `tenant_id`

---

### Requirement: Movimentação de unidade recalcula a subárvore inteira
<!-- id: OrgTreeService.moveUnit -->
<!-- entities: OrgUnit -->
<!-- depends_on: Level e path materializado são derivados do pai na criação -->
<!-- enforced: OrgTreeService.moveUnit() -->

Mover uma unidade SHALL, dentro de uma única transação, atualizar `parent_id`, `level`, `path` e
`order` da unidade movida e propagar em cascata para todos os descendentes (identificados por
`path LIKE '{oldPath}.%'`), substituindo o prefixo antigo pelo novo e deslocando `level` pelo
mesmo delta (RN-ORG-006). A operação registra auditoria `unit.moved` com path antigo e novo,
publica `OrgUnitMoved` no Outbox e invalida o cache da árvore.

#### Scenario: departamento movido entre secretarias
<!-- test: OrgTreeCyclePreventionTest.test_moving_unit_recalculates_entire_subtree_paths_and_levels() -->
- **WHEN** um departamento com uma divisão filha é movido da Secretaria A para a Secretaria B
- **THEN** o path e o level do departamento e da divisão são recalculados sob o novo ramo

#### Scenario: destino inexistente
- **WHEN** `moveUnit()` recebe `newParentId` que não resolve para uma unidade do tenant
- **THEN** lança `InvalidArgumentException` "Unidade destino #{id} não encontrada."

#### Scenario: ordem não informada na movimentação
- **WHEN** `moveUnit()` recebe `newOrder = null`
- **THEN** a `order` atual da unidade é preservada

---

### Requirement: Movimentação hierárquica nunca pode gerar ciclo
<!-- id: OrgTreeService.moveUnit -->
<!-- entities: OrgUnit -->
<!-- enforced: OrgTreeService.moveUnit() -->

O novo pai SHALL NOT ser a própria unidade nem qualquer um de seus descendentes (RN-ORG-003). A
verificação é feita por prefixo do path materializado (`str_starts_with(newParent.path,
"{unit.path}.")`), antes de qualquer escrita.

#### Scenario: mover secretaria para baixo de sua própria divisão neta
<!-- test: OrgTreeCyclePreventionTest.test_cycle_prevention_blocks_moving_unit_to_its_own_descendant() -->
- **WHEN** `moveUnit()` recebe como destino uma unidade cujo path começa com o path da unidade movida
- **THEN** lança `InvalidArgumentException` contendo "geraria um ciclo hierárquico proibido" e a transação é revertida

#### Scenario: unidade apontada como pai de si mesma
- **WHEN** `moveUnit()` recebe `newParentId` igual ao `id` da unidade
- **THEN** lança `InvalidArgumentException` "Uma unidade não pode ser pai de si mesma."

---

### Requirement: Exclusão de unidade com subordinadas vira inativação com motivo
<!-- id: OrgTreeService.deleteUnit -->
<!-- entities: OrgUnit -->
<!-- enforced: OrgTreeService.deleteUnit() -->

A remoção SHALL preservar a estrutura histórica (RN-ORG-004): se a unidade possui filhos, ela é
apenas marcada `is_active = false` com `inactivation_reason` (motivo informado ou o texto padrão
"Inativação da estrutura com sub-unidades subordinadas."), auditada como `unit.inactivated`. Se
não possui filhos, sofre soft delete (`deleted_at`), auditado como `unit.deleted` e publicado
como `OrgUnitDeleted` no Outbox. Em ambos os casos o cache da árvore é invalidado e a função
retorna `true`.

#### Scenario: unidade com filhos
- **WHEN** `deleteUnit()` recebe unidade cujo `hasChildren()` é verdadeiro
- **THEN** a unidade é inativada com motivo, auditada como `unit.inactivated` e nenhum registro é apagado

#### Scenario: unidade folha
- **WHEN** `deleteUnit()` recebe unidade sem filhos
- **THEN** o soft delete é aplicado, `unit.deleted` é auditado e `OrgUnitDeleted` é publicado no Outbox

#### Scenario: motivo de inativação informado pelo endpoint
- **WHEN** `ClientOrgChartController.destroy()` recebe `reason` no corpo
- **THEN** o motivo é repassado a `deleteUnit()` e gravado em `inactivation_reason`

---

### Requirement: Árvore aninhada é montada a partir da coleção plana e cacheada por tenant
<!-- id: OrgTreeService.getTree -->
<!-- entities: OrgUnit, OrgUnitUser -->
<!-- enforced: OrgTreeService.getTree() -->

A leitura da árvore SHALL retornar nós aninhados ordenados por `level`, `order` e `name`, cada nó
carregando `users_count`, a lista de `responsibles` e seus `children` recursivos. O resultado
SHALL ser cacheado por 300 segundos sob a chave `org:tree:{tenantId}:{rootId}:{onlyActive}` e o
cache SHALL ser invalidado após criação, atualização, movimentação e exclusão/inativação de
unidade. Filtrar por `rootId` retorna a própria unidade e seus descendentes via prefixo de path.

#### Scenario: leitura da árvore completa
<!-- test: ClientOrgChartApiTest.test_can_fetch_nested_tree_via_client_api() -->
- **WHEN** `GET /api/org-units` é chamado sem `flat`
- **THEN** responde com a árvore aninhada serializada por `OrgUnitTreeResource`, incluindo `children` recursivos

#### Scenario: raiz inexistente no filtro
- **WHEN** `getTree($rootId)` recebe um ID que não resolve para unidade do tenant
- **THEN** retorna array vazio

#### Scenario: inclusão de unidades inativas
- **WHEN** `getTree(onlyActive: false)` é chamado
- **THEN** unidades com `is_active = false` também compõem a árvore, sob chave de cache distinta

---

### Requirement: Escopo de dados ABAC deriva do vínculo do usuário com a unidade
<!-- id: OrgScope.unitIdsFor -->
<!-- entities: OrgUnit, OrgUnitUser, User -->
<!-- enforced: OrgScope.unitIdsFor() -->

O escopo organizacional SHALL ser resolvido server-side a partir dos vínculos em `org_unit_user`
(RN-GRA-003): acesso irrestrito (retorno `null`) para `is_platform_admin`, permissão
`org.scope_all` ou papéis `super_admin` / `admin_tenant` / `auditor`; acesso recursivo
(unidade + descendentes via path) para vínculos com `role = responsavel` ou permissão
`org.scope_recursive`; acesso apenas à unidade direta para vínculos `membro`. Vínculos com
unidade inativa SHALL ser ignorados, e usuário sem vínculo algum recebe escopo vazio.
`applyToQuery()` traduz escopo vazio em `whereRaw('1 = 0')`, nunca em query irrestrita.

#### Scenario: administrador do tenant
<!-- test: OrgScopeAbacTest.test_scope_all_user_has_unrestricted_access() -->
- **WHEN** `getAllowedOrgUnitIds()` recebe usuário com papel `admin_tenant`
- **THEN** retorna `null`, sinalizando acesso irrestrito

#### Scenario: responsável de secretaria
<!-- test: OrgScopeAbacTest.test_responsible_user_has_recursive_access_to_subtree() -->
- **WHEN** o usuário tem vínculo `responsavel` com a Secretaria de Saúde
- **THEN** o escopo contém a secretaria e todos os seus descendentes, e não contém a raiz nem secretarias irmãs

#### Scenario: membro de departamento
<!-- test: OrgScopeAbacTest.test_member_user_has_only_direct_unit_access() -->
- **WHEN** o usuário tem vínculo `membro` com um departamento
- **THEN** o escopo é exatamente `[departamento.id]`, sem ancestrais nem descendentes

#### Scenario: usuário sem nenhum vínculo
- **WHEN** não existe registro em `org_unit_user` para o usuário
- **THEN** retorna array vazio e as listagens escopadas não retornam nenhuma linha

#### Scenario: resumo de escopo para o frontend
<!-- test: ClientOrgChartApiTest.test_can_get_user_scope_via_client_api() -->
- **WHEN** `GET /api/org-units/scope` é chamado
- **THEN** responde `is_unrestricted`, `allowed_unit_ids`, `primary_unit` e `managed_units` (unidades em que o usuário é `responsavel`)

---

### Requirement: Endpoints do cliente filtram a árvore e as unidades pelo escopo do usuário
<!-- id: ClientOrgChartController.index -->
<!-- entities: OrgUnit, User, UserModuleAccess -->
<!-- depends_on: Escopo de dados ABAC deriva do vínculo do usuário com a unidade -->
<!-- enforced: ClientOrgChartController.index() -->

Toda rota de `/api/org-units` SHALL passar por `auth:sanctum`, `tenant` e `module-access:org`,
autorizar via Policy (`viewAny`, `view`, `create`, `update`, `move`, `delete`, `linkUser`,
`unlinkUser`) e, além disso, SHALL reconferir o ID da unidade contra
`ModuleAccessService.allowedOrgUnitIds($user, 'org', $tenantId)` — autorização escopada ao objeto,
não apenas à rota. A lista de IDs permitidos é expandida hierarquicamente por prefixo de path.

#### Scenario: usuário com escopo restrito lendo a árvore
- **WHEN** `index()` obtém uma lista não vazia de IDs permitidos
- **THEN** a resposta usa `getFilteredTree()`, que não é cacheado por ser específico do usuário

#### Scenario: escopo vazio no modo plano
- **WHEN** `index(flat=true)` obtém lista de IDs permitidos vazia
- **THEN** responde `{"data": []}` sem consultar unidades

#### Scenario: acesso a unidade fora do escopo
- **WHEN** `show()`, `update()`, `move()`, `destroy()`, `users()`, `linkUser()`, `unlinkUser()` ou `setPrimaryUnit()` recebem unidade cujo ID não está na lista permitida
- **THEN** responde HTTP 403 "Acesso negado a esta unidade."

#### Scenario: criação sob pai fora do escopo
- **WHEN** `store()` recebe `parent_id` fora da lista permitida
- **THEN** responde HTTP 403 "Não é permitido criar unidades sob esta unidade pai."

#### Scenario: movimentação para destino fora do escopo
- **WHEN** `move()` recebe `new_parent_id` fora da lista permitida
- **THEN** responde HTTP 403 "Não é permitido mover para esta unidade."

---

### Requirement: Vínculo de usuário à unidade tem papel restrito e unidade primária única
<!-- id: OrgUserService.linkUser -->
<!-- entities: OrgUnitUser, OrgUnit, User -->
<!-- triggers: Escopo de dados ABAC deriva do vínculo do usuário com a unidade -->
<!-- enforced: OrgUserService.linkUser() -->

O vínculo SHALL aceitar apenas `role` em `responsavel` ou `membro`, com `valid_to` não anterior a
`valid_from`. O par (unidade, usuário) é único no tenant (índice único
`(tenant_id, org_unit_id, user_id)`) e `linkUser()` usa `updateOrCreate`, de modo que revincular
atualiza o vínculo existente em vez de duplicá-lo. Marcar `is_primary = true` SHALL desmarcar,
na mesma transação, qualquer outro vínculo primário do mesmo usuário no tenant (RN-ORG-007).
Vinculação e desvinculação registram auditoria (`user.linked`, `user.unlinked`) e publicam
`OrgUnitUserLinked` / `OrgUnitUserUnlinked` no Outbox.

#### Scenario: vínculo válido de responsável
<!-- test: ClientOrgChartApiTest.test_can_link_user_to_org_unit_via_client_api() -->
- **WHEN** `POST /api/org-units/{id}/users` recebe `user_id`, `role = responsavel` e `is_primary = true`
- **THEN** cria o vínculo, responde HTTP 201 e o usuário passa a ter escopo recursivo sobre a subárvore

#### Scenario: papel fora da lista canônica
- **WHEN** `LinkUserOrgUnitRequest` recebe `role` diferente de `responsavel` ou `membro`
- **THEN** a validação falha com HTTP 422 e nenhum vínculo é criado

#### Scenario: segunda unidade marcada como primária
- **WHEN** o usuário já possui um vínculo `is_primary = true` e um novo vínculo primário é criado
- **THEN** o vínculo anterior passa a `is_primary = false`, restando exatamente um primário por usuário no tenant

#### Scenario: usuário inexistente
- **WHEN** `linkUser()` recebe `userId` que não resolve para um `User`
- **THEN** lança `InvalidArgumentException` "Usuário #{id} não encontrado."

#### Scenario: promoção a unidade primária sem vínculo prévio
- **WHEN** `setPrimaryUnit()` é chamado para (usuário, unidade) sem vínculo existente
- **THEN** lança `InvalidArgumentException` "O usuário #{id} não possui vínculo com a unidade #{id}."

#### Scenario: desvínculo de usuário não vinculado
- **WHEN** `unlinkUser()` não encontra o vínculo
- **THEN** retorna `false` sem auditar nem publicar evento

---

### Requirement: Busca de usuários para vínculo é restrita a membros ativos do tenant
<!-- id: ClientOrgChartController.searchUsers -->
<!-- entities: User, Tenant, OrgUnitUser -->
<!-- enforced: ClientOrgChartController.searchUsers() -->

A busca SHALL retornar somente usuários com vínculo `tenant_user.status = active` no tenant
corrente, casando por nome, matrícula ou e-mail, limitada a 20 resultados ordenados por nome. O
parâmetro `exclude_unit_id` SHALL remover do resultado quem já está vinculado àquela unidade.

#### Scenario: termo de busca vazio
- **WHEN** `GET /api/org-units/users/search` é chamado sem `q` ou com `q` em branco
- **THEN** responde `{"data": []}` sem consultar a base

#### Scenario: exclusão de já vinculados
- **WHEN** `exclude_unit_id` é informado
- **THEN** usuários com registro em `org_unit_user` para aquela unidade são omitidos do resultado

---

### Requirement: Semeadura do organograma municipal é idempotente por tenant
<!-- id: OrgSeedService.seedDefaultMunicipalStructure -->
<!-- entities: OrgUnit, Tenant -->
<!-- depends_on: Cada tenant possui exatamente uma unidade raiz -->
<!-- enforced: OrgSeedService.seedDefaultMunicipalStructure() -->

O onboarding SHALL criar a estrutura mínima do município — raiz "Gabinete do Prefeito — {tenant}"
(`GAB`) e duas secretarias, Administração (`SMA`) e Finanças & Planejamento (`SMF`) — posicionando
o `TenantContext` no tenant alvo e auditando `onboarding.seeded`. A semeadura SHALL ser abortada
se o tenant já possuir raiz. Existem dois pontos de entrada com a mesma regra: a rota
administrativa da plataforma (RN-ORG-011) e a rota do próprio município.

#### Scenario: onboarding pelo painel da plataforma
<!-- test: AdminOrgChartApiTest.test_platform_admin_can_seed_initial_org_chart_for_tenant() -->
- **WHEN** `POST /admin/tenants/{tenant}/org-units/seed` é chamado por platform admin em tenant sem organograma
- **THEN** responde HTTP 201 e o tenant passa a ter 3 unidades, sendo exatamente 1 raiz

#### Scenario: semeadura repetida
- **WHEN** `hasRoot()` já retorna verdadeiro no tenant
- **THEN** os controllers respondem HTTP 200 com a árvore existente e a mensagem de organograma já cadastrado, sem criar unidades

#### Scenario: chamada direta ao serviço com raiz existente
- **WHEN** `seedDefaultMunicipalStructure()` é invocado diretamente em tenant que já possui raiz
- **THEN** lança `RuntimeException` "O tenant já possui um organograma inicial cadastrado."

#### Scenario: semeadura pelo administrador do município
- **WHEN** `POST /api/org-units/seed` é chamado por usuário sem `is_platform_admin`, sem papel `admin_tenant` e sem permissão `org.admin.seed`
- **THEN** aborta com HTTP 403 "Somente o administrador do município pode inicializar o organograma."

---

### Requirement: Rotas administrativas do organograma são exclusivas da plataforma
<!-- id: AdminOrgChartController.index -->
<!-- entities: OrgUnit, Tenant, User -->
<!-- enforced: AdminOrgChartController.index() -->

As rotas sob `/admin/tenants/{tenant}/org-units` SHALL exigir `auth:sanctum` mais o middleware
`platform-admin` e, adicionalmente, as abilities `adminSeed` / `adminRead` da Policy (RN-ORG-011).
A visão de suporte SHALL ser somente leitura e SHALL incluir unidades inativas
(`getTree(onlyActive: false)`), posicionando o `TenantContext` no tenant inspecionado.

#### Scenario: inspeção de suporte
<!-- test: AdminOrgChartApiTest.test_platform_admin_can_inspect_org_chart_for_support() -->
- **WHEN** platform admin chama `GET /admin/tenants/{tenant}/org-units`
- **THEN** responde HTTP 200 com a árvore do tenant, incluindo unidades inativas

#### Scenario: usuário comum do tenant na rota administrativa
<!-- test: AdminOrgChartApiTest.test_regular_tenant_user_cannot_access_admin_seed_route() -->
- **WHEN** usuário sem privilégio de plataforma chama `POST /admin/tenants/{tenant}/org-units/seed`
- **THEN** responde HTTP 403

#### Scenario: tenant inexistente
- **WHEN** o parâmetro `{tenant}` não resolve para um `Tenant`
- **THEN** responde HTTP 404 (`Tenant::findOrFail`)

---

### Requirement: Exportação do organograma produz manifest versionado com checksum
<!-- id: OrgExportService.exportJson -->
<!-- entities: OrgUnit, OrgUnitUser, Tenant -->
<!-- enforced: OrgExportService.exportJson() -->

A exportação JSON SHALL conter `manifest` (versão `1.0.0`, schema `sysgov_org_chart`, identificação
do tenant, `generated_at`, totais e `checksum_sha256` do conteúdo serializado), a árvore completa
incluindo inativas, a lista plana de unidades e a lista de vínculos de usuários (RN-ORG-010). A
exportação CSV SHALL usar separador `;` e BOM UTF-8 para abertura correta no Excel, com `is_active`
renderizado como `SIM`/`NAO`. Ambos os formatos registram auditoria (`chart.exported_json`,
`chart.exported_csv`).

#### Scenario: exportação JSON
<!-- test: OrgExportServiceTest.test_can_export_org_chart_as_json_with_versioned_manifest() -->
- **WHEN** `exportJson()` é chamado
- **THEN** retorna `manifest`, `tree`, `units` e `users`, com `checksum_sha256` calculado sobre unidades e vínculos

#### Scenario: exportação CSV
<!-- test: OrgExportServiceTest.test_can_export_org_chart_as_csv_with_utf8_bom() -->
- **WHEN** `exportCsv()` é chamado
- **THEN** a string retornada inicia com o BOM `\xEF\xBB\xBF` e traz o cabeçalho de 14 colunas separado por `;`

#### Scenario: endpoint de exportação
<!-- test: OrgExportServiceTest.test_export_endpoint_via_client_api() -->
- **WHEN** `POST /api/org-units/export` recebe `format = csv`
- **THEN** responde com `Content-Type: text/csv; charset=UTF-8` e `Content-Disposition` de anexo `organograma.csv`; qualquer outro valor de `format` produz JSON

---

### Invariant: Toda unidade e todo vínculo do OrgChart é isolado por tenant
<!-- entities: OrgUnit, OrgUnitUser -->
<!-- enforced: App\Models\Concerns\TenantAware -->
<!-- verified_by: OrgUnitIsolationTest.test_org_units_are_strictly_isolated_between_tenants() -->

`OrgUnit` e `OrgUnitUser` SHALL usar o trait `TenantAware`, que aplica o global scope `tenant` em
leitura e preenche `tenant_id` na criação. O `tenant_id` é resolvido server-side pelo
`TenantContext` (middleware `ResolveTenant`) e nunca aceito do cliente. As tabelas `org_units` e
`org_unit_user` possuem `tenant_id` com FK para `tenants`, índices compostos iniciados por tenant
e unicidades compostas com tenant. Criar unidade sem contexto de tenant SHALL lançar
`LogicException` (`OrgUnitIsolationTest.test_creating_org_unit_without_tenant_throws_logic_exception()`).

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: A hierarquia é acíclica e o path materializado espelha exatamente a cadeia de pais
<!-- entities: OrgUnit -->
<!-- enforced: OrgTreeService.moveUnit() -->
<!-- verified_by: OrgTreeCyclePreventionTest.test_moving_unit_recalculates_entire_subtree_paths_and_levels() -->

Para toda unidade não raiz, `path` SHALL ser `{parent.path}.{id}` e `level` SHALL ser
`parent.level + 1`; para a raiz, `path` é o próprio ID e `level` é 1. Nenhuma unidade SHALL ser
ancestral de si mesma. Como consequência, `getDescendants()`, `getSelfAndDescendantIds()` e
`getAncestorPaths()` são consultas puras de prefixo de string, e todo consumidor de escopo
organizacional depende dessa consistência.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: OrgUnit é a fonte canônica única da estrutura organizacional
<!-- entities: OrgUnit, Organization, Department, ManagementUnit, BudgetUnit, TenantModuleOrgUnit -->
<!-- enforced: Modules\OrgChart\Models\OrgUnit -->

A tabela `org_units` SHALL ser a autoridade única da árvore (RN-ORG-002). Os models legados
`Organization`, `Department`, `ManagementUnit` e `BudgetUnit` mantêm suas tabelas por
compatibilidade, mas SHALL NOT alimentar decisões de acesso: o escopo ABAC (`OrgScope`) e a
granularidade módulo × unidade (`TenantModuleOrgUnit`) usam exclusivamente `OrgUnit`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Autorização do OrgChart é sempre server-side e escopada ao objeto
<!-- entities: OrgUnit, User, UserModuleAccess -->
<!-- enforced: OrgUnitPolicy -->
<!-- verified_by: OrgScopeAbacTest -->

Toda ação SHALL passar por `Gate::authorize` contra `OrgUnitPolicy` (registrada em
`OrgChartServiceProvider.boot()`) e, para ações sobre uma unidade específica, SHALL ser
adicionalmente reconferida contra a lista de unidades permitidas do usuário. As abilities
combinam `is_platform_admin`, papéis (`super_admin`, `admin_tenant`, `auditor`, `responsavel`,
`membro`, `admin_ops`, `suporte`) e permissões nomeadas (`org.view`, `org.create`, `org.update`,
`org.delete`, `org.move`, `org.user.link`, `org.user.unlink`, `org.admin.seed`, `org.admin.read`).
As `FormRequest` do módulo retornam `authorize() = true` de propósito — a decisão vive na Policy,
nunca no Request nem no frontend.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Nenhuma unidade organizacional é apagada fisicamente pelo fluxo de negócio
<!-- entities: OrgUnit -->
<!-- enforced: OrgTreeService.deleteUnit() -->

`OrgUnit` SHALL usar `SoftDeletes` e o fluxo de remoção SHALL preferir inativação
(`is_active = false` + `inactivation_reason`) quando houver subordinadas, preservando a estrutura
histórica para auditoria e para os vínculos de outros módulos (RN-ORG-004).

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda mutação do OrgChart é auditada e publicada no Outbox
<!-- entities: OrgUnit, OrgUnitUser, Tenant -->
<!-- enforced: App\Support\AuditLogger.record() -->

Criação, atualização, movimentação, inativação, exclusão, vínculo/desvínculo de usuário,
semeadura e exportação SHALL gravar registro em `audit_logs` com módulo `org`, ação nomeada
(`unit.created`, `unit.updated`, `unit.moved`, `unit.inactivated`, `unit.deleted`, `user.linked`,
`user.unlinked`, `onboarding.seeded`, `chart.exported_json`, `chart.exported_csv`), estado
anterior/posterior, usuário, IP e timestamp (RN-ORG-009). Nenhum controller ou service do módulo
SHALL fazer chamada externa síncrona: todo efeito externo é publicado em `outbox_events` via
`OutboxPublisher` (`OrgUnitCreated`, `OrgUnitUpdated`, `OrgUnitMoved`, `OrgUnitDeleted`,
`OrgUnitUserLinked`, `OrgUnitUserUnlinked`).

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: O cache da árvore nunca sobrevive a uma mutação do tenant
<!-- entities: OrgUnit -->
<!-- enforced: OrgTreeService.clearTreeCache() -->

Toda escrita em `org_units` feita por `OrgTreeService` SHALL invalidar as chaves
`org:tree:{tenantId}:0:1` e `org:tree:{tenantId}:0:0`. Árvores filtradas por escopo de usuário
(`getFilteredTree()`) SHALL NOT ser cacheadas, evitando vazamento de escopo entre usuários do
mesmo tenant.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

<!-- uncertainty: Há divergência entre o vocabulário de tipos. A constante OrgUnit::TYPES declara ['prefeitura','gabinete','secretaria','departamento','divisao','setor','autarquia','fundacao'], mas Config/config.php, a coluna org_units.type, CreateOrgUnitRequest/UpdateOrgUnitRequest (regra in:...) e OrgTreeService.createUnit() (default 'raiz' para unidade sem pai) usam 'raiz' e não contemplam 'prefeitura'/'gabinete'. Grep no repositório não encontrou nenhum consumidor de OrgUnit::TYPES nem literal 'prefeitura' como tipo de unidade — a constante parece morta. A spec seguiu a lista efetivamente validada (raiz, secretaria, departamento, divisao, setor, autarquia, fundacao). -->
<!-- uncertainty: OrgUserService.linkUser() resolve o alvo com User::find($userId) e LinkUserOrgUnitRequest valida apenas exists:users,id. Nenhuma das duas camadas verifica se o usuário pertence ao tenant corrente (diferente de ClientOrgChartController.searchUsers(), que exige tenant_user.status=active). O registro criado em org_unit_user recebe o tenant_id do contexto via TenantAware, mas o user_id pode ser de outro tenant. Não foi possível determinar pelo código se existe alguma barreira a montante; não há teste cobrindo o caso. -->
<!-- uncertainty: ModuleAccessService.allowedOrgUnitIds() retorna null (= acesso irrestrito) tanto para o caso de acesso total quanto para os casos "sem registro de acesso" e "acesso expirado/revogado" — o próprio comentário do método declara isso. Todas as checagens de escopo dos controllers do OrgChart tratam null como irrestrito. Na prática o middleware module-access:org barra o usuário antes, mas a semântica de null é ambígua e não foi possível confirmar no código se é intencional. -->
<!-- uncertainty: O cache da árvore é invalidado apenas para rootId = 0 (clearTreeCache() esquece org:tree:{tenant}:0:1 e :0:0). Chaves geradas com rootId != 0 por getTree($rootId) permanecem no cache por até 300s após uma mutação. Não há teste cobrindo esse caminho. -->
<!-- uncertainty: Nenhuma regra do módulo envolve valores monetários; App\Support\Money não é referenciado no OrgChart. O invariante de dinheiro em centavos inteiros não se aplica a esta capability. -->
<!-- deferred: apps/web-client/src/modules/* e apps/web/src/modules/* (consumidores frontend do organograma — nenhuma regra de UI do OrgChart foi minerada), apps/api/app/Services/ModuleAccessService.php (matriz user_module_access e granularidade TenantModuleOrgUnit, minerada apenas na superfície consumida pelo OrgChart), apps/api/app/Services/ModuleOrgUnitService.php, apps/api/Modules/OrgChart/Http/Requests/InactivateOrgUnitRequest.php (classe existente porém sem rota/controller que a utilize) -->
