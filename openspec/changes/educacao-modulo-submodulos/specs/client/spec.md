## MODIFIED Requirements

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

Um item raiz SHALL poder ser um **agrupador**: sem `module_alias` e sem `permission`, cuja rota
é a página inicial do agrupador. O agrupador SHALL aparecer na navegação somente se tiver ao
menos um filho visível depois de aplicados os filtros de módulo ativo, permissão e liberação
por unidade; sem filhos visíveis, é omitido.

#### Scenario: item criado sob grupo inexistente
- **WHEN** `menu_group_id` não existe em `client_menu_groups`
- **THEN** responde HTTP 422 pela regra `exists:client_menu_groups,id`

#### Scenario: item filho
- **WHEN** `parent_id` aponta para outro item existente
- **THEN** o item passa a ser carregado como `children` do pai na navegação, herdando os mesmos filtros de módulo, permissão e granularidade

#### Scenario: desativação de item
- **WHEN** `updateItem()` grava `is_active = false`
- **THEN** o item some da navegação, mas continua visível na listagem administrativa

#### Scenario: agrupador com filho visível
- **WHEN** o usuário enxerga ao menos um filho do agrupador
- **THEN** o agrupador aparece na navegação com apenas os filhos visíveis

#### Scenario: agrupador sem filho visível
- **WHEN** nenhum filho do agrupador passa pelos filtros de módulo, permissão e unidade
- **THEN** o agrupador é omitido da navegação

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

Quando o `module.json` declara `menu.parent`, o item SHALL ser criado como **filho** do agrupador
com esse alias (criando o agrupador se faltar), com a rota `/{parent}/{menu.slug}` (padrão: o
alias), e SHALL NOT ser criado como item solto do grupo.

#### Scenario: módulo sem alias no module.json
- **WHEN** `alias` está ausente ou vazio
- **THEN** `registerClientMenu()` retorna sem criar menu de cliente

#### Scenario: grupo alvo inexistente
- **WHEN** não há grupo global com o slug nem o nome de `menu.group`, nem `gestao-setorial`
- **THEN** um novo grupo global é criado com `icon = Building2`, `order = 20` e `is_active = true`

#### Scenario: re-registro do mesmo módulo
- **WHEN** o comando roda novamente para um módulo já registrado
- **THEN** `updateOrCreate` pela `route` atualiza o item existente, sem duplicar

#### Scenario: submódulo com pai declarado
- **WHEN** o `module.json` do módulo `transporte` declara `menu.parent = "educacao"` e `menu.slug = "transporte"`
- **THEN** o item é criado como filho do agrupador "Educação", com a rota `/educacao/transporte`, e não aparece como item solto
