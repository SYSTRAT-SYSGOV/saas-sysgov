# Spec: client

> Auto-extracted by spec-miner. Last mined: 2026-09-19.
> Source: apps/api/Modules/Client (Services/ClientNavigationService, Http/Controllers/{ClientNavigationController,ClientGranularityController}, Models/{ClientMenuGroup,ClientMenuItem}, Policies/{ClientMenuGroupPolicy,ClientMenuItemPolicy}, Providers/ClientServiceProvider, Routes/client-api.php, Database/Seeders/ClientMenuSeeder, module.json), apps/api/app/Services/ModuleOrgUnitService, apps/api/app/Http/Middleware/EnsureAdminTenant, apps/api/app/Http/Controllers/AuthController, apps/api/Modules/Admin/Console/Commands/RegisterModuleCommand, migrations create_client_menu_groups_and_items_tables / add_parent_id_to_client_menu_items_table / create_tenant_module_org_unit_table
> Last verified: 2026-09-19 (commit 2bd3aae)

Escopo: módulo Client — catálogo de navegação (sidebar) do Painel do Cliente/Órgão Público e
granularidade de liberação de módulos por unidade organizacional. Cobre a montagem
server-side anti-spoofing do menu a partir de `tenant_module.enabled` + permissões do usuário,
o CRUD administrativo de grupos/itens de menu restrito ao `admin_tenant`, a herança por path
da liberação de módulos no organograma e a invalidação versionada do cache de sessão.
O módulo não possui domínio monetário, não emite eventos e não faz integrações externas.

---

### Requirement: Navegação é montada integralmente no backend, ignorando qualquer input do cliente
<!-- id: ClientNavigationService.buildNavigation -->
<!-- entities: ClientMenuGroup, ClientMenuItem, Tenant, User, Module -->
<!-- enforced: ClientNavigationService.buildNavigation() -->

A árvore de navegação do web-client SHALL ser derivada exclusivamente do banco de dados
(FASE 0B / anti-spoofing). A assinatura `buildNavigation(int $tenantId, Authenticatable $user,
?array $orgUnitIds = null)` não aceita lista de módulos nem de permissões vinda do frontend:
ambas são resolvidas internamente por `resolveActiveModules()` e `resolvePermissions()`. O
`tenantId` chega do `TenantContext` resolvido server-side, nunca de payload do cliente. O
retorno é uma lista de grupos, cada um com seus itens e filhos já filtrados, todos com
`active = false` (o estado de rota ativa é responsabilidade do cliente).

#### Scenario: item aponta para módulo desativado no tenant
<!-- test: NavigationIsolationTest.test_navigation_only_shows_modules_enabled_in_tenant_module() -->
- **WHEN** o tenant tem `finance` com `tenant_module.enabled = false` e existe `ClientMenuItem` com `module_alias = finance`
- **THEN** o item é suprimido da navegação, enquanto o item de `org` (habilitado) permanece

#### Scenario: tentativa de injetar alias de módulo pelo frontend
<!-- test: NavigationIsolationTest.test_navigation_ignores_fake_module_aliases() -->
- **WHEN** um alias arbitrário é enviado pelo cliente
- **THEN** não há parâmetro que o receba; só aparecem itens que existem em `client_menu_items` e cujo módulo está habilitado no vínculo `tenant_module`

#### Scenario: permissão exigida pelo item vem do backend
<!-- test: NavigationIsolationTest.test_navigation_filters_by_permission_from_backend() -->
- **WHEN** o item declara `permission` e o conjunto de permissões resolvido do banco não a contém nem contém `*`
- **THEN** o item é suprimido; a decisão usa `permissionsForTenant()` / `permissionsForSystrat()`, nunca a lista enviada pelo cliente

#### Scenario: navegação reflete o acesso real do usuário
<!-- test: FullFlowTest.test_c06_navegacao_reflete_acesso_real() -->
- **WHEN** `buildNavigation()` roda para um gestor de secretaria com acesso a `org` e sem acesso a `rh`
- **THEN** os aliases retornados contêm `org` e não contêm `rh`

#### Scenario: tenant sem nenhum módulo habilitado
- **WHEN** `resolveActiveModules()` retorna lista vazia (tenant inexistente ou sem vínculos habilitados)
- **THEN** `hasExplicitModules` é `false` e o filtro por módulo é desativado — apenas os filtros de permissão e granularidade se aplicam

---

### Requirement: Permissões efetivas do usuário são resolvidas por perfil no servidor
<!-- id: ClientNavigationService.resolvePermissions -->
<!-- entities: User, Tenant, Role, Permission -->
<!-- triggers: Navegação é montada integralmente no backend, ignorando qualquer input do cliente -->
<!-- enforced: ClientNavigationService.resolvePermissions() -->

A resolução de permissões SHALL seguir, nesta ordem: usuário `is_platform_admin` ou portador da
role `admin_tenant` no tenant corrente recebe o curinga `['*']`; analista de suporte
(`isSupportAnalyst()`) recebe `permissionsForSystrat()`; qualquer outro perfil recebe
`permissionsForTenant($tenantId)`. Um `Authenticatable` que não exponha `rolesForTenant()`
SHALL receber lista vazia de permissões, resultando em navegação sem itens permissionados.

#### Scenario: administrador do tenant
- **WHEN** `rolesForTenant($tenantId)` contém a role de slug `admin_tenant`
- **THEN** retorna `['*']` e nenhum item é filtrado por permissão

#### Scenario: usuário comum do tenant
- **WHEN** o usuário não é platform admin, não é `admin_tenant` e não é analista de suporte
- **THEN** retorna os slugs de `permissionsForTenant($tenantId)` e apenas itens com essas permissões (ou sem `permission`) aparecem

#### Scenario: autenticável sem contrato de roles por tenant
- **WHEN** o objeto autenticado não implementa `rolesForTenant()`
- **THEN** retorna `[]`, sem lançar exceção, e todo item com `permission` definida é suprimido

---

### Requirement: Itens do menu são filtrados pela granularidade de unidade organizacional
<!-- id: ClientNavigationService.buildNavigation -->
<!-- entities: ClientMenuItem, Module, OrgUnit, TenantModuleOrgUnit -->
<!-- depends_on: Navegação é montada integralmente no backend, ignorando qualquer input do cliente -->
<!-- enforced: ClientNavigationService.buildNavigation() -->

Quando `$orgUnitIds` é informado (usuários não-`admin_tenant` vinculados a unidades), um item
com `module_alias` SHALL ser exibido apenas se o módulo estiver liberado em ao menos uma das
unidades do usuário, conforme `ModuleOrgUnitService.isModuleEnabledForUnit()`. O filtro se
aplica identicamente a itens de primeiro nível e a filhos. Itens sem `module_alias` (ex.:
"Gerenciar Menus") não são afetados pela granularidade.

#### Scenario: módulo bloqueado em todas as unidades do usuário
- **WHEN** nenhuma unidade de `$orgUnitIds` tem o módulo do item liberado
- **THEN** o item é suprimido da navegação

#### Scenario: alias de módulo sem registro no catálogo
- **WHEN** o `module_alias` do item não casa com nenhuma linha de `Module`
- **THEN** o filtro de granularidade é ignorado para esse item (só os filtros de módulo ativo e permissão se aplicam)

#### Scenario: administrador do tenant
- **WHEN** `AuthController` monta a sessão de um `admin_tenant`
- **THEN** `$orgUnitIds` permanece `null` e nenhum filtro de granularidade é aplicado

#### Scenario: usuário sem vínculo de unidade
- **WHEN** o usuário não é `admin_tenant` e `OrgUnitUser` não retorna unidades
- **THEN** `$orgUnitIds` permanece `null` e a navegação não é restringida por unidade

---

### Requirement: Grupo sem itens visíveis é omitido da navegação
<!-- id: ClientNavigationService.buildNavigation -->
<!-- entities: ClientMenuGroup, ClientMenuItem -->
<!-- enforced: ClientNavigationService.buildNavigation() -->

Somente grupos e itens com `is_active = true` SHALL entrar na navegação, ordenados por `order`
ascendente em todos os níveis. Um grupo cuja lista de itens fique vazia após os filtros de
módulo, permissão e granularidade SHALL ser removido do payload, evitando seções órfãs na
sidebar. Apenas itens raiz (`parent_id` nulo) são materializados no primeiro nível; os demais
aparecem como `children`.

#### Scenario: todos os itens do grupo filtrados
- **WHEN** todo item do grupo é suprimido pelos filtros
- **THEN** o grupo não aparece no payload retornado

#### Scenario: grupo inativo
- **WHEN** `is_active = false` no grupo
- **THEN** o grupo nunca é carregado, independentemente de seus itens

---

### Requirement: Catálogo de menu combina grupos globais da plataforma e grupos do tenant
<!-- id: ClientMenuGroup.tenant_id -->
<!-- entities: ClientMenuGroup, Tenant -->
<!-- enforced: ClientNavigationService.buildNavigation() -->

`client_menu_groups.tenant_id` é anulável: linhas com `tenant_id` nulo são o catálogo global da
plataforma, visível a todos os tenants; linhas com `tenant_id` preenchido pertencem ao tenant.
Toda leitura SHALL usar o predicado `tenant_id = :atual OR tenant_id IS NULL`. A unicidade de
`slug` é composta por `(tenant_id, slug)`, permitindo que tenants diferentes usem o mesmo slug
e que um tenant tenha um grupo homônimo ao global.

#### Scenario: leitura da navegação de um tenant
- **WHEN** `buildNavigation()` consulta grupos
- **THEN** retornam os grupos do tenant corrente somados aos grupos globais (`tenant_id` nulo)

#### Scenario: listagem administrativa
- **WHEN** `ClientNavigationController.index()` é chamado
- **THEN** aplica o mesmo predicado, porém sem filtrar por `is_active`, expondo também itens desativados para gestão

#### Scenario: slug repetido no mesmo tenant
- **WHEN** `storeGroup()` recebe `slug` já usado no tenant corrente
- **THEN** a validação `unique:client_menu_groups,slug,NULL,id,tenant_id,{tenantId}` falha com HTTP 422

---

### Requirement: CRUD de menus é restrito ao administrador do tenant
<!-- id: EnsureAdminTenant.handle -->
<!-- entities: ClientMenuGroup, ClientMenuItem, User, Role -->
<!-- enforced: EnsureAdminTenant.handle() -->

Todas as rotas `api/client/*` SHALL exigir o pipeline
`auth:sanctum` → `tenant` → `bindings` → `admin-tenant`. O middleware `EnsureAdminTenant`
libera incondicionalmente o `is_platform_admin` e, para os demais, exige a role `admin_tenant`
no tenant resolvido pelo `TenantContext`. As policies `ClientMenuGroupPolicy` e
`ClientMenuItemPolicy` repetem a checagem em `viewAny`, `view`, `create`, `update` e `delete`,
todas delegando ao mesmo predicado `rolesForTenant($tenantId)->contains('slug','admin_tenant')`.

#### Scenario: requisição sem usuário autenticado
- **WHEN** `EnsureAdminTenant.handle()` não encontra `$request->user()`
- **THEN** responde HTTP 401 `{"error": "Unauthorized"}`

#### Scenario: tenant não resolvido
- **WHEN** `TenantContext.id()` lança exceção
- **THEN** responde HTTP 403 `{"error": "Tenant não resolvido."}` e a policy retorna `false`

#### Scenario: usuário autenticado sem a role admin_tenant
- **WHEN** `hasRole('admin_tenant', $tenantId)` é falso
- **THEN** responde HTTP 403 `{"error": "Acesso negado."}`

#### Scenario: administrador de plataforma
- **WHEN** `is_platform_admin = true`
- **THEN** o middleware libera a requisição sem avaliar roles de tenant

---

### Requirement: Criação de grupo de menu carimba o tenant do contexto
<!-- id: ClientNavigationController.storeGroup -->
<!-- entities: ClientMenuGroup, Tenant -->
<!-- triggers: Alteração do menu invalida o cache de sessão por versionamento -->
<!-- enforced: ClientNavigationController.storeGroup() -->

O `tenant_id` do grupo criado SHALL vir de `TenantContext.id()` e nunca do corpo da requisição —
`tenant_id` não consta das regras de validação e é atribuído explicitamente. `name` é
obrigatório (máx. 100), `slug` obrigatório (máx. 80, único no tenant), `icon` opcional (máx. 50),
`order` opcional com padrão `0`; `is_active` é forçado a `true` na criação.

#### Scenario: criação válida
- **WHEN** `storeGroup()` recebe nome e slug válidos
- **THEN** persiste o grupo com `tenant_id` do contexto, `order` informado ou `0`, `is_active = true`, e responde HTTP 201

#### Scenario: tentativa de criar grupo para outro tenant
- **WHEN** o corpo da requisição inclui `tenant_id` de outro tenant
- **THEN** o campo é descartado pelo `validate()` e o grupo é criado no tenant do contexto

#### Scenario: nome ausente
- **WHEN** `name` não é enviado
- **THEN** responde HTTP 422 e nada é persistido

---

### Requirement: Item de menu declara rota, módulo, permissão e hierarquia
<!-- id: ClientNavigationController.storeItem -->
<!-- entities: ClientMenuItem, ClientMenuGroup, Module -->
<!-- triggers: Alteração do menu invalida o cache de sessão por versionamento -->
<!-- enforced: ClientNavigationController.storeItem() -->

Um item SHALL pertencer a um `menu_group_id` existente e pode declarar `parent_id` apontando
para outro item existente, formando no máximo dois níveis materializados na navegação (raiz +
`children`). `label` (máx. 100) e `route` (máx. 200) são obrigatórios; `icon` (50),
`permission` (100), `shortcut` (10) e `module_alias` (50) são opcionais e controlam,
respectivamente, o ícone, o gate de permissão, o atalho de teclado e o vínculo com o catálogo
de módulos usado pelos filtros de ativação e granularidade. `is_active` é forçado a `true` na
criação. A atualização aceita os mesmos campos mais `is_active`, mas não permite trocar de
grupo — apenas o `reorder()` pode mover um item entre grupos.

#### Scenario: item criado sob grupo inexistente
- **WHEN** `menu_group_id` não existe em `client_menu_groups`
- **THEN** responde HTTP 422 pela regra `exists:client_menu_groups,id`

#### Scenario: item filho
- **WHEN** `parent_id` aponta para outro item existente
- **THEN** o item passa a ser carregado como `children` do pai na navegação, herdando os mesmos filtros de módulo, permissão e granularidade

#### Scenario: desativação de item
- **WHEN** `updateItem()` grava `is_active = false`
- **THEN** o item some da navegação, mas continua visível na listagem administrativa

---

### Requirement: Reordenação em lote reposiciona itens e grupos numa única chamada
<!-- id: ClientNavigationController.reorder -->
<!-- entities: ClientMenuItem, ClientMenuGroup -->
<!-- triggers: Alteração do menu invalida o cache de sessão por versionamento -->
<!-- enforced: ClientNavigationController.reorder() -->

`PUT /api/client/menus/reorder` SHALL aceitar um array obrigatório `items` — cada entrada com
`id` existente e `order` inteiro obrigatórios, e `menu_group_id` / `parent_id` opcionais — e um
array opcional `groups` com `id` e `order`. Cada item é atualizado com o novo `order` e
`parent_id` (nulo quando omitido, promovendo o item a raiz); `menu_group_id` só é alterado se
presente no payload, permitindo mover um item de grupo. Grupos recebem apenas o novo `order`.

#### Scenario: reordenação com mudança de grupo
- **WHEN** uma entrada de `items` inclui `menu_group_id` diferente do atual
- **THEN** o item é movido para o novo grupo com a ordem informada

#### Scenario: entrada sem parent_id
- **WHEN** `parent_id` não é enviado para um item que hoje é filho
- **THEN** o item recebe `parent_id = null` e volta a ser item raiz

#### Scenario: id inexistente no lote
- **WHEN** qualquer `items.*.id` não existe
- **THEN** a validação falha com HTTP 422 antes de qualquer atualização

---

### Requirement: Alteração do menu invalida o cache de sessão por versionamento
<!-- id: ClientNavigationController.invalidateSessionCache -->
<!-- entities: ClientMenuGroup, ClientMenuItem, Tenant -->
<!-- enforced: ClientNavigationController.invalidateSessionCache() -->

Toda mutação de menu (criar, atualizar ou excluir grupo ou item, e reordenar) SHALL gravar
`nav:version:{tenantId}` com o timestamp corrente e TTL de 1 ano. `AuthController` compõe a
chave do cache de sessão como `auth:session:{userId}:{tenantId}:v{navVersion}` com TTL de 60
segundos, de modo que o incremento da versão invalida simultaneamente a sessão de todos os
usuários do tenant, sem afetar os demais tenants.

#### Scenario: item criado
- **WHEN** `storeItem()` conclui com sucesso
- **THEN** `nav:version:{tenantId}` é sobrescrito e a próxima montagem de sessão recalcula a navegação

#### Scenario: contexto de tenant ausente na invalidação
- **WHEN** `TenantContext.id()` retorna valor falsy
- **THEN** nenhuma chave de versão é gravada e a mutação prossegue sem erro

#### Scenario: navegação servida pela sessão
- **WHEN** o usuário autentica e `tenantId` está resolvido
- **THEN** `AuthController` chama `ClientNavigationService.buildNavigation($tenantId, $user, $orgUnitIds)` e embute o resultado no payload de sessão

---

### Requirement: Liberação de módulo por unidade organizacional herda pelo path do organograma
<!-- id: ModuleOrgUnitService.isModuleEnabledForUnit -->
<!-- entities: TenantModuleOrgUnit, Module, OrgUnit, Tenant -->
<!-- enforced: ModuleOrgUnitService.isModuleEnabledForUnit() -->

A avaliação (RN-GRA-001) SHALL seguir três degraus: (1) registro explícito
(`inherited = false`) para a própria unidade define o resultado; (2) na ausência dele, o
ancestral explícito mais próximo pelo `path` decide, com desempate por maior comprimento de
path; (3) sem nenhum ancestral explícito, vale o padrão `tenant_module.enabled` do módulo no
tenant. Um `enabled = false` explícito em um nível nega o módulo para aquele nível e seus
descendentes, salvo se um descendente tiver `enabled = true` explícito. O resultado é
memoizado em `module_org_unit:{tenantId}:{moduleId}:{orgUnitId}` por 60 segundos. Unidade
inexistente SHALL resultar em negativa.

#### Scenario: liberação na secretaria alcança os departamentos
<!-- test: FullFlowTest.test_c18_liberar_secretaria_inclui_departamentos() -->
- **WHEN** o módulo é liberado explicitamente na secretaria
- **THEN** a própria secretaria e seus departamentos descendentes retornam habilitado

#### Scenario: negativa no departamento sobrescreve o ancestral
<!-- test: FullFlowTest.test_c19_negar_departamento_sobrescreve_ancestral() -->
- **WHEN** `setModuleForUnit(..., false)` é aplicado a um departamento de secretaria liberada
- **THEN** apenas aquele departamento fica negado; os departamentos irmãos continuam habilitados

#### Scenario: descendente de secretaria negada
<!-- test: FullFlowTest.test_c20_departamento_de_secretaria_negada_continua_negado() -->
- **WHEN** a secretaria tem registro explícito `enabled = false`
- **THEN** a secretaria e todos os seus descendentes sem registro explícito retornam negado

#### Scenario: reversão para herança
<!-- test: FullFlowTest.test_c21_reverter_a_heranca() -->
- **WHEN** `clearModuleForUnit()` remove o registro explícito de uma unidade negada
- **THEN** a unidade volta a herdar do ancestral e retorna habilitado

#### Scenario: acesso a recurso bloqueado pela unidade
<!-- test: FullFlowTest.test_c22_acesso_bloqueado_por_unidade() -->
- **WHEN** o usuário pertence a unidade sem o módulo liberado
- **THEN** o acesso ao módulo é negado mesmo que o vínculo do tenant o habilite

---

### Requirement: Definir ou limpar liberação propaga aos descendentes e é auditada
<!-- id: ModuleOrgUnitService.setModuleForUnit -->
<!-- entities: TenantModuleOrgUnit, Module, OrgUnit, User, AuditLog -->
<!-- depends_on: Liberação de módulo por unidade organizacional herda pelo path do organograma -->
<!-- enforced: ModuleOrgUnitService.setModuleForUnit() -->

`setModuleForUnit()` SHALL gravar, por `(tenant_id, module_id, org_unit_id)`, um registro com
`inherited = false` e `set_by` do usuário autor, materializar cópias `inherited = true` em todo
descendente que ainda não tenha registro explícito, registrar auditoria de módulo `access` com
ação `module.org_unit.enabled` ou `module.org_unit.disabled` (estado anterior e posterior) e
invalidar o cache da unidade alvo. `clearModuleForUnit()` SHALL remover o registro da unidade,
apagar os registros herdados dos descendentes e auditar `module.org_unit.cleared`.

#### Scenario: liberação propagada
- **WHEN** `setModuleForUnit()` habilita o módulo numa secretaria com departamentos sem registro explícito
- **THEN** cada descendente recebe uma linha `inherited = true` com o mesmo `enabled`

#### Scenario: descendente com decisão própria
- **WHEN** um descendente já possui registro `inherited = false`
- **THEN** a propagação o ignora, preservando a decisão explícita local

#### Scenario: limpeza da unidade
- **WHEN** `clearModuleForUnit()` roda
- **THEN** o registro da unidade é excluído, os herdados dos descendentes pelo `path` são removidos e a auditoria `module.org_unit.cleared` grava o estado anterior com posterior nulo

---

### Requirement: API de granularidade exige tenant resolvido e opera sobre o organograma do tenant
<!-- id: ClientGranularityController.resolveTenantId -->
<!-- entities: Module, OrgUnit, TenantModuleOrgUnit, Tenant -->
<!-- enforced: ClientGranularityController.resolveTenantId() -->

Os quatro endpoints de granularidade SHALL resolver o tenant por `TenantContext.id()`,
respondendo HTTP 403 `{"error": "Tenant não resolvido."}` quando a resolução falhar, antes de
qualquer consulta. `GET /granularity/modules` lista apenas módulos com
`tenant_module.enabled = true` para o tenant, ordenados por nome. `GET /granularity/{module}/units`
retorna todas as unidades ativas do tenant com `enabled`, `inherited`, `inherited_from` e
`inherited_from_name`. `PUT` exige o booleano `enabled` e retorna o registro efetivo; `DELETE`
responde `{"cleared": true}`.

#### Scenario: contexto de tenant ausente
- **WHEN** `TenantContext.id()` lança `Throwable`
- **THEN** o endpoint responde HTTP 403 sem tocar o banco

#### Scenario: listagem de módulos com granularidade
- **WHEN** `modules()` é chamado
- **THEN** retorna `id`, `alias` e `name` apenas dos módulos habilitados no vínculo `tenant_module` do tenant corrente

#### Scenario: matriz de unidades para a interface admin
- **WHEN** `units()` chama `allUnitsForGranularity()`
- **THEN** cada unidade sem registro explícito é marcada `enabled = true, inherited = true` somente se existir ancestral explícito habilitado; caso contrário `enabled = false`

#### Scenario: payload de enabled ausente
- **WHEN** `set()` recebe requisição sem `enabled`
- **THEN** a validação `required|boolean` falha com HTTP 422

---

### Requirement: Registro de módulo na plataforma cria o item correspondente no menu do cliente
<!-- id: RegisterModuleCommand.registerClientMenu -->
<!-- entities: ClientMenuGroup, ClientMenuItem, Module -->
<!-- enforced: RegisterModuleCommand.registerClientMenu() -->

`php artisan module:register` SHALL, a partir do `module.json`, criar ou atualizar um
`ClientMenuItem` chaveado pela `route` (`/{alias}`), com `label` (de `menu.label`, `name` ou
headline do alias), `icon` (padrão `Layers`), `permission` (padrão `{alias}.view`),
`module_alias`, `shortcut` (primeira letra do alias em maiúscula), `order` igual ao maior do
grupo mais 1 e `is_active = true`. O grupo de destino é um `ClientMenuGroup` global
(`tenant_id` nulo) localizado por slug ou nome de `menu.group` (padrão `GESTÃO SETORIAL`), com
fallback para `gestao-setorial` e, por fim, criação do grupo global. Toda a operação é
transacional e `--dry-run` apenas registra a intenção.

#### Scenario: módulo sem alias no module.json
- **WHEN** `alias` está ausente ou vazio
- **THEN** `registerClientMenu()` retorna sem criar menu de cliente

#### Scenario: grupo alvo inexistente
- **WHEN** não há grupo global com o slug nem o nome de `menu.group`, nem `gestao-setorial`
- **THEN** um novo grupo global é criado com `icon = Building2`, `order = 20` e `is_active = true`

#### Scenario: re-registro do mesmo módulo
- **WHEN** o comando roda novamente para um módulo já registrado
- **THEN** `updateOrCreate` pela `route` atualiza o item existente, sem duplicar

---

### Requirement: Seed padrão publica o catálogo global de menu em três grupos
<!-- id: ClientMenuSeeder.run -->
<!-- entities: ClientMenuGroup, ClientMenuItem -->
<!-- enforced: ClientMenuSeeder.run() -->

O seed SHALL criar, com `tenant_id` nulo (catálogo global), os grupos
`gestao-fiscal` (ordem 1), `gestao-setorial` (ordem 2) e `sistema` (ordem 99), cada um com seus
itens na ordem declarada, todos `is_active = true` e com `permission` e `module_alias`
correspondentes ao catálogo de módulos (`procurement`, `contracts`, `finance`, `licita`, `org`,
`pedagogico`, `rh`, `capd`, `cemiterios`, `users`). O item "Gerenciar Menus" é o único sem
`module_alias`, controlado apenas pela permissão `menu.manager`. Os grupos são resolvidos por
`updateOrCreate` pelo `slug`, mas os itens de cada grupo são apagados e recriados a cada
execução.

#### Scenario: primeira execução
- **WHEN** `run()` roda em base sem menus
- **THEN** os 3 grupos globais e seus itens são criados com `order` sequencial a partir de 0

#### Scenario: reexecução do seed
- **WHEN** `run()` roda de novo
- **THEN** os grupos são reaproveitados pelo slug, porém `items()->delete()` remove todos os itens do grupo antes de recriá-los

---

### Invariant: Módulos e permissões da navegação nunca vêm do cliente
<!-- entities: ClientMenuGroup, ClientMenuItem, Tenant, User, Module -->
<!-- enforced: ClientNavigationService.buildNavigation() -->
<!-- verified_by: NavigationIsolationTest.test_navigation_ignores_fake_module_aliases() -->

Não existe, em nenhum ponto do módulo, caminho que aceite lista de módulos ativos ou de
permissões vinda do frontend. A fonte autoritativa é sempre o banco — `tenant_module.enabled`
para módulos e `permissionsForTenant()` / `permissionsForSystrat()` para permissões — e o
`tenantId` provém do `TenantContext` resolvido pelo middleware `ResolveTenant`. A ocultação de
um item na sidebar é consequência da decisão server-side, e não a própria decisão: cada módulo
alvo continua responsável por autorizar suas rotas.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda rota do módulo Client é autenticada, resolvida por tenant e restrita a admin_tenant
<!-- entities: ClientMenuGroup, ClientMenuItem, TenantModuleOrgUnit, User -->
<!-- enforced: Modules/Client/Routes/client-api.php -->
<!-- verified_by: FullFlowTest.test_c02_admin_tenant_do_a_nao_vale_no_a() -->

O grupo `api/client` SHALL aplicar, sem exceção, o pipeline
`auth:sanctum` + `tenant` + `bindings` + `admin-tenant` às 13 rotas do módulo (9 de menu, 4 de
granularidade). Nenhuma rota do módulo é pública, e a role `admin_tenant` é sempre avaliada
contra o tenant resolvido no servidor — a role de um tenant não confere privilégio em outro.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Registros de granularidade são sempre chaveados e consultados por tenant
<!-- entities: TenantModuleOrgUnit, OrgUnit, Module -->
<!-- enforced: ModuleOrgUnitService.isModuleEnabledForUnit() -->
<!-- verified_by: FullFlowTest.test_c22_acesso_bloqueado_por_unidade() -->

A tabela `tenant_module_org_unit` SHALL ter `tenant_id` obrigatório, unicidade
`(tenant_id, module_id, org_unit_id)` e índices compostos iniciados por `tenant_id`. Toda
consulta, gravação, propagação a descendentes e limpeza em `ModuleOrgUnitService` SHALL filtrar
explicitamente por `tenant_id`, e a chave de cache
`module_org_unit:{tenantId}:{moduleId}:{orgUnitId}` inclui o tenant — impedindo que a decisão
de um tenant seja reutilizada por outro.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Mutações de granularidade são auditadas
<!-- entities: TenantModuleOrgUnit, AuditLog, User -->
<!-- enforced: App\Support\AuditLogger.record() -->

`setModuleForUnit()` e `clearModuleForUnit()` SHALL gravar em `audit_logs` com módulo `access`,
ação `module.org_unit.enabled` / `module.org_unit.disabled` / `module.org_unit.cleared`,
recurso `tenant:{t}:module:{m}:org_unit:{o}` e os estados anterior e posterior completos, além
de `set_by` persistido na própria linha de `tenant_module_org_unit`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: O módulo Client não tem domínio monetário nem integrações externas
<!-- entities: ClientMenuGroup, ClientMenuItem, TenantModuleOrgUnit -->
<!-- enforced: Modules/Client -->

Nenhum controller, service, model ou seeder do módulo manipula valores monetários (`Money`,
centavos ou colunas decimais), emite eventos de domínio ou executa chamada externa síncrona ou
assíncrona — não há uso de `OutboxPublisher`, cliente HTTP, jobs ou listeners. O `module.json`
declara `requires: []`, `priority: 99` e não expõe `permissions` nem `menu`. O único efeito
lateral fora do banco é a escrita de chaves em cache (`nav:version:*` e `module_org_unit:*`).

> Last verified: 2026-09-19 (commit 2bd3aae)

---

<!-- uncertainty: ClientMenuGroup e ClientMenuItem NÃO usam o trait App\Models\Concerns\TenantAware, contrariando a regra cross-cutting do projeto. O isolamento depende de o predicado `tenant_id = :atual OR tenant_id IS NULL` ser repetido manualmente em cada query (buildNavigation e index o fazem). Não há global scope nem auto-set de tenant_id na criação — storeGroup() carimba o tenant explicitamente. ClientMenuItem sequer tem coluna tenant_id: o tenant é inferido transitivamente pelo menu_group_id. -->
<!-- uncertainty: ClientMenuGroupPolicy e ClientMenuItemPolicy declaram update(User $user) / delete(User $user) / view(User $user) SEM o parâmetro do modelo, portanto ignoram o objeto passado em $this->authorize('update', $group). Combinado com o route model binding sem escopo de tenant, um admin_tenant do tenant A que conheça o ID pode alcançar grupo/item do tenant B em updateGroup(), destroyGroup(), updateItem(), destroyItem() e reorder() (que atualiza por id sem filtro de tenant). storeItem() valida apenas exists:client_menu_groups,id, sem checar se o grupo pertence ao tenant. Não foi possível determinar pelo código se existe proteção adicional fora do módulo; nenhum teste cobre esses endpoints. Reportado, não corrigido. -->
<!-- uncertainty: Nenhuma mutação de menu (grupo ou item) é registrada via AuditLogger — o módulo não importa App\Support\AuditLogger. A auditoria existente vem de ModuleOrgUnitService, que vive em app/Services (fora do módulo). Não foi possível determinar se a ausência é intencional. -->
<!-- uncertainty: ClientNavigationController.navigation() está implementado mas nenhuma rota de client-api.php aponta para ele — a navegação chega ao frontend apenas pelo payload de sessão do AuthController. Se algum dia for exposto, ficará sob o middleware admin-tenant do grupo, o que impediria usuários comuns de consumi-lo. Código possivelmente morto. -->
<!-- uncertainty: ClientMenuSeeder executa $group->items()->delete() antes de recriar os itens dos grupos GLOBAIS (tenant_id nulo). Como os grupos globais podem receber itens via RegisterModuleCommand, reexecutar o seed apaga itens registrados por módulos. Não foi possível determinar se é comportamento pretendido. -->
<!-- uncertainty: A migration create_client_menu_groups_and_items_tables tem down() que remove apenas client_menu_groups, deixando client_menu_items órfã no rollback. -->
<!-- uncertainty: O módulo Client não possui diretório Tests/. A cobertura vem de Modules/Admin/Tests/Feature/NavigationIsolationTest.php (navegação/anti-spoofing) e Tests/Feature/Access/FullFlowTest.php (granularidade C18–C22, navegação C06). Não existe teste de isolamento de tenant especificamente para client_menu_groups / client_menu_items nem teste HTTP para os endpoints api/client. -->
<!-- uncertainty: EnsureAdminTenant.handle() emite Log::info com user_id e is_platform_admin em toda requisição do módulo, aparentemente instrumentação de depuração deixada em produção. -->
<!-- deferred: apps/web-client/src/config/moduleRegistry.generated.ts, apps/web-client (consumo da navegação e da tela de Gerenciar Menus), apps/api/app/Http/Controllers/AuthController.php (montagem completa do payload de sessão), apps/api/app/Services/AccessService.php e OrgScope (escopo ABAC que alimenta orgUnitIds), apps/api/Modules/Admin/Console/Commands/RegisterModuleCommand.php (registro de permissões e menu admin) -->
